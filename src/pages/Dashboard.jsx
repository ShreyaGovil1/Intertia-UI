import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { MapContainer, TileLayer, Polygon, Tooltip, useMap, CircleMarker } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  Target, Play, Map, Trophy, Flame, Users, Calendar,
  ChevronRight, LogOut, Settings, TrendingUp, Crosshair, Hexagon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/store/authStore';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { API_BASE, BACKEND_URL } from '@/env';

const API_URL = API_BASE;

/* ── Deterministic pastel color from username ── */
function getColorForUser(name, currentUserId, ownerId) {
  if (ownerId === currentUserId) return 'hsl(75, 84%, 69%)'; // lime (#CCF381)
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 55%, 65%)`;
}

/* ── Convert H3 boundary (array of [lat,lon]) to Leaflet positions ── */
function hexBoundaryToPositions(boundary) {
  return boundary.map(([lat, lon]) => [lat, lon]);
}

/* ── Cinematic fly-in on mount ── */
const CinematicEntry = ({ target }) => {
  const map = useMap();
  const flown = useRef(false);
  useEffect(() => {
    if (target && !flown.current) {
      flown.current = true;
      map.setView([target[0] + 2, target[1]], 5, { animate: false });
      setTimeout(() => {
        map.flyTo(target, 15, { duration: 2.5, easeLinearity: 0.25 });
      }, 400);
    }
  }, [target, map]);
  return null;
};

/* ── Recenter control (must be inside MapContainer) ── */
const RecenterControl = ({ position }) => {
  const map = useMap();
  return (
    <div className="leaflet-top leaflet-right" style={{ top: '12px', right: '12px' }}>
      <div className="leaflet-control">
        <button
          onClick={() => position && map.flyTo(position, 15, { duration: 1 })}
          className="glass-panel p-3 rounded-full hover:bg-white/10 transition-colors"
          data-testid="recenter-btn"
        >
          <Crosshair className="w-5 h-5 text-[#CCF381]" />
        </button>
      </div>
    </div>
  );
};

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, logout, token } = useAuthStore();
  const [stats, setStats] = useState(null);
  const [recentRuns, setRecentRuns] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [currentSeason, setCurrentSeason] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [claims, setClaims] = useState([]);
  const [userPosition, setUserPosition] = useState(null);
  const [highlightedHexes, setHighlightedHexes] = useState(new Set());
  const wsRef = useRef(null);
  const wsRetries = useRef(0);

  useEffect(() => {
    // Get user GPS for map centering
    if (navigator.geolocation) {
      const watchId = navigator.geolocation.watchPosition(
        (pos) => {
          setUserPosition([pos.coords.latitude, pos.coords.longitude]);
        },
        (err) => {
          console.warn('Geolocation error:', err.message);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
      
      fetchDashboardData();
      return () => {
        navigator.geolocation.clearWatch(watchId);
        if (wsRef.current) wsRef.current.close();
      };
    } else {
      fetchDashboardData();
      return () => { if (wsRef.current) wsRef.current.close(); };
    }
  }, []);

  // Fetch claims when position known
  useEffect(() => {
    if (!userPosition) return;
    fetchClaims();
    connectLiveWS();
  }, [userPosition]);

  const fetchDashboardData = async () => {
    setIsLoading(true);
    try {
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const opts = { headers, credentials: 'include' };
      const [statsRes, runsRes, leaderRes, seasonRes] = await Promise.all([
        fetch(`${API_URL}/users/${user?.user_id}/stats`, opts),
        fetch(`${API_URL}/runs?limit=5`, opts),
        fetch(`${API_URL}/leaderboards/area?limit=5`, opts),
        fetch(`${API_URL}/seasons/current`, opts),
      ]);
      if (statsRes.ok) setStats(await statsRes.json());
      if (runsRes.ok) setRecentRuns(await runsRes.json());
      if (leaderRes.ok) setLeaderboard(await leaderRes.json());
      if (seasonRes.ok) setCurrentSeason(await seasonRes.json());
    } catch (e) { console.error('Dashboard fetch error:', e); }
    setIsLoading(false);
  };

  const fetchClaims = async () => {
    if (!userPosition) return;
    try {
      const [lat, lon] = userPosition;
      const res = await fetch(
        `${API_URL}/claims?min_lat=${lat - 0.1}&max_lat=${lat + 0.1}&min_lon=${lon - 0.1}&max_lon=${lon + 0.1}`
      );
      if (res.ok) setClaims(await res.json());
    } catch (e) { console.error('Claims fetch error:', e); }
  };

  const connectLiveWS = () => {
    try {
      const wsUrl = BACKEND_URL.replace(/^http/, 'ws').replace(/\/$/, '') + '/api/ws/dashboard';
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;
      ws.onopen = () => { ws.send(JSON.stringify({ type: 'ping' })); };
      ws.onmessage = (evt) => {
        const data = JSON.parse(evt.data);
        if (data.type === 'territory_claimed') {
          toast(`🏴 ${data.user_name} claimed ${data.hex_count} hexagons!`, { duration: 4000 });
          // Highlight the new hexes with gold flash
          const newIds = new Set((data.hexes || []).map(h => h.h3_index));
          setHighlightedHexes(newIds);
          setTimeout(() => setHighlightedHexes(new Set()), 4000);
          // Refresh hex data
          fetchHexagons();
        }
      };
      ws.onclose = () => {
        wsRetries.current += 1;
        if (wsRetries.current <= 3) {
          setTimeout(connectLiveWS, 5000 * wsRetries.current);
        }
      };
      ws.onerror = () => {}; // Suppress console noise
    } catch (e) { /* WS not available */ }
  };

  const handleLogout = async () => { await logout(); navigate('/'); };

  const formatDistance = (m) => !m ? '0 m' : m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${Math.round(m)} m`;
  const formatArea = (s) => !s ? '0 m²' : s >= 1000000 ? `${(s / 1000000).toFixed(2)} km²` : s >= 10000 ? `${(s / 10000).toFixed(2)} ha` : `${Math.round(s)} m²`;
  const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '';

  return (
    <div className="min-h-screen bg-[#09090B]">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-[100] glass-panel border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link to="/dashboard" className="flex items-center gap-2" data-testid="logo-link">
              <div className="w-10 h-10 rounded-full bg-[#CCF381] flex items-center justify-center">
                <Target className="w-6 h-6 text-black" />
              </div>
              <span className="font-unbounded font-bold text-xl text-white">Intertia</span>
            </Link>
            <div className="hidden md:flex items-center gap-6">
              <Link to="/dashboard" className="text-white font-medium hover:text-[#CCF381] transition-colors">Dashboard</Link>
              <Link to="/leaderboards" className="text-zinc-400 hover:text-white transition-colors">Leaderboards</Link>
              <Link to="/groups" className="text-zinc-400 hover:text-white transition-colors">Groups</Link>
              <Link to="/seasons" className="text-zinc-400 hover:text-white transition-colors">Seasons</Link>
            </div>
            <div className="flex items-center gap-4">
              <Button onClick={() => navigate('/run')} className="bg-[#CCF381] text-black hover:bg-[#B8E065] font-bold rounded-full px-6" data-testid="start-run-btn">
                <Play className="w-4 h-4 mr-2" /> Start Run
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-2" data-testid="user-menu-trigger">
                    <Avatar className="w-9 h-9 border-2 border-white/10">
                      <AvatarImage src={user?.picture} />
                      <AvatarFallback className="bg-zinc-800 text-white">{user?.name?.charAt(0) || 'U'}</AvatarFallback>
                    </Avatar>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 bg-zinc-900 border-white/10 z-[9999]">
                  <div className="px-3 py-2">
                    <p className="text-sm font-medium text-white">{user?.name}</p>
                    <p className="text-xs text-zinc-500">{user?.email}</p>
                  </div>
                  <DropdownMenuSeparator className="bg-white/10" />
                  <DropdownMenuItem onClick={() => navigate('/profile')} className="text-zinc-300 focus:bg-white/10 focus:text-white cursor-pointer">
                    <Settings className="w-4 h-4 mr-2" /> Profile
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleLogout} className="text-red-400 focus:bg-red-500/10 focus:text-red-400 cursor-pointer">
                    <LogOut className="w-4 h-4 mr-2" /> Log out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="pt-20 pb-12">
        {/* ═══ TERRITORY MAP ═══ */}
        <div className="relative w-full h-[55vh] overflow-hidden" style={{ zIndex: 0 }}>
          <MapContainer
            center={userPosition || [28.6139, 77.209]}
            zoom={5}
            className="h-full w-full"
            zoomControl={false}
            attributionControl={false}
            preferCanvas={true}
          >
            {/* Clean, minimal base tiles */}
            <TileLayer url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" />
            <CinematicEntry target={userPosition} />

            {/* Free-form territories */}
            {claims.map((claim) => {
              if (!claim.geometry || !claim.geometry.coordinates) return null;
              // GeoJSON coordinates are [lon, lat], Leaflet expects [lat, lon]
              const positions = claim.geometry.coordinates[0].map(([lon, lat]) => [lat, lon]);
              if (positions.length < 3) return null;
              const color = getColorForUser(claim.owner_name || '', user?.user_id, claim.owner_id);
              
              return (
                <Polygon
                  key={claim.claim_id}
                  positions={positions}
                  pathOptions={{
                    fillColor: color,
                    fillOpacity: 0.45,
                    color: color,
                    weight: 2,
                    className: 'hex-territory',
                  }}
                >
                  <Tooltip sticky className="hex-tooltip">
                    <div className="text-xs">
                      <strong>{claim.owner_name}</strong>
                      <br />{Math.round(claim.area_m2)} m²
                    </div>
                  </Tooltip>
                </Polygon>
              );
            })}

            {/* Recenter button — must be inside MapContainer */}
            <RecenterControl position={userPosition} />

            {/* Live user location marker */}
            {userPosition && (
              <CircleMarker
                center={userPosition}
                radius={8}
                pathOptions={{
                  fillColor: '#ef4444', // Red dot
                  fillOpacity: 1,
                  color: '#ffffff', // White border
                  weight: 2,
                }}
              />
            )}
          </MapContainer>

          {/* Glassmorphic floating overlays on the map */}
          <div className="absolute top-4 left-4 z-[40]">
            <div className="glass-panel rounded-2xl p-4 min-w-[200px]">
              <div className="flex items-center gap-2 mb-2">
                <Hexagon className="w-5 h-5 text-[#CCF381]" />
                <span className="text-sm font-semibold text-white">Your Territory</span>
              </div>
              <p className="font-unbounded text-2xl font-bold text-[#CCF381]">
                {formatArea(stats?.total_area_m2 || user?.total_area_m2)}
              </p>
              <p className="text-xs text-zinc-400 mt-1">
                Rank #{stats?.global_rank || '—'}
              </p>
            </div>
          </div>



          {/* Gradient fade at bottom of map */}
          <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-[#09090B] to-transparent pointer-events-none z-[30]" />
        </div>

        {/* ═══ STATS & CONTENT ═══ */}
        <div className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto -mt-8 relative z-[10]">
          {/* Stats Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {[
              { icon: TrendingUp, color: 'text-[#CCF381]', label: 'Total Distance', value: formatDistance(stats?.total_distance_m || user?.total_distance_m) },
              { icon: Hexagon, color: 'text-[#7000FF]', label: 'Territory', value: formatArea(stats?.total_area_m2 || user?.total_area_m2) },
              { icon: Trophy, color: 'text-yellow-500', label: 'Total Runs', value: stats?.total_runs || user?.total_runs || 0 },
              { icon: Flame, color: 'text-orange-500', label: 'Streak', value: `${stats?.current_streak || user?.current_streak || 0} days` },
            ].map((stat, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.05 }} className="card-glass p-5">
                <div className="flex items-center justify-between mb-3">
                  <stat.icon className={`w-5 h-5 ${stat.color}`} />
                  <span className="text-xs text-zinc-500">{stat.label}</span>
                </div>
                <p className="font-unbounded text-2xl font-bold text-white">{stat.value}</p>
              </motion.div>
            ))}
          </div>

          {/* Main Grid */}
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Recent Runs */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="lg:col-span-2 card-glass p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-unbounded font-semibold text-lg text-white">Recent Runs</h2>
                <Link to="/profile" className="text-[#CCF381] text-sm hover:underline">View all</Link>
              </div>
              {recentRuns.length > 0 ? (
                <div className="space-y-4">
                  {recentRuns.map((run, index) => (
                    <div key={run.run_id} className="flex items-center justify-between p-4 rounded-xl bg-zinc-900/50 hover:bg-zinc-800/50 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-[#CCF381]/10 flex items-center justify-center">
                          <Map className="w-5 h-5 text-[#CCF381]" />
                        </div>
                        <div>
                          <p className="font-medium text-white">{formatDate(run.started_at)}</p>
                          <p className="text-sm text-zinc-500">{run.run_type === 'group' ? 'Group Run' : 'Solo Run'}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-mono text-white">{formatDistance(run.distance_m)}</p>
                        <p className="text-sm text-[#7000FF]">{formatArea(run.area_claimed_m2)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Map className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
                  <p className="text-zinc-500 mb-4">No runs yet. Start your first territory conquest!</p>
                  <Button onClick={() => navigate('/run')} className="bg-[#CCF381] text-black hover:bg-[#B8E065] font-semibold rounded-full">Start First Run</Button>
                </div>
              )}
            </motion.div>

            {/* Right Sidebar */}
            <div className="space-y-6">
              {/* Leaderboard Preview */}
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }} className="card-glass p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="font-unbounded font-semibold text-white">Top Runners</h2>
                  <Link to="/leaderboards" className="text-[#CCF381] text-sm hover:underline">View all</Link>
                </div>
                <div className="space-y-3">
                  {leaderboard.slice(0, 5).map((entry, index) => (
                    <div key={entry.user_id} className="flex items-center gap-3">
                      <span className={`w-6 text-center font-mono font-bold ${index === 0 ? 'rank-gold' : index === 1 ? 'rank-silver' : index === 2 ? 'rank-bronze' : 'text-zinc-500'}`}>
                        {entry.rank}
                      </span>
                      <Avatar className="w-8 h-8">
                        <AvatarImage src={entry.picture} />
                        <AvatarFallback className="bg-zinc-800 text-white text-xs">{entry.name?.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">{entry.name}</p>
                      </div>
                      <p className="text-sm font-mono text-[#CCF381]">{formatArea(entry.value)}</p>
                    </div>
                  ))}
                </div>
              </motion.div>

              {/* Season & Quick Actions */}
              {currentSeason && (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="card-glass p-6 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-[#7000FF] rounded-full filter blur-[60px] opacity-20" />
                  <div className="relative">
                    <div className="flex items-center gap-2 mb-3">
                      <Calendar className="w-5 h-5 text-[#7000FF]" />
                      <span className="text-xs text-zinc-500 uppercase tracking-wide">Current Season</span>
                    </div>
                    <h3 className="font-unbounded font-semibold text-white mb-2">{currentSeason.name}</h3>
                    <p className="text-sm text-zinc-400 mb-4">{currentSeason.description}</p>
                    <Link to="/seasons">
                      <Button variant="outline" className="w-full border-white/20 bg-transparent text-white hover:bg-white/10 rounded-xl">
                        View Season <ChevronRight className="w-4 h-4 ml-2" />
                      </Button>
                    </Link>
                  </div>
                </motion.div>
              )}

              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }} className="card-glass p-6">
                <h2 className="font-unbounded font-semibold text-white mb-4">Quick Actions</h2>
                <div className="space-y-3">
                  <Link to="/groups">
                    <Button variant="outline" className="w-full justify-start border-white/10 bg-transparent text-zinc-300 hover:bg-white/5 hover:text-white rounded-xl">
                      <Users className="w-4 h-4 mr-3 text-[#CCF381]" /> Join Group Run
                    </Button>
                  </Link>
                  <Link to="/profile">
                    <Button variant="outline" className="w-full justify-start border-white/10 bg-transparent text-zinc-300 hover:bg-white/5 hover:text-white rounded-xl mt-3">
                      <Trophy className="w-4 h-4 mr-3 text-yellow-500" /> View Badges
                    </Button>
                  </Link>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
