import { useState, useEffect, useRef, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  MapContainer, TileLayer, Polygon, Popup, Tooltip,
  useMap, CircleMarker,
} from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  Target, Play, Map as MapIcon, Trophy, Flame, Users, Calendar,
  ChevronRight, LogOut, Settings, TrendingUp, Crosshair, Hexagon,
  Crown,
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

// ═══════════════════════════════════════════════════════════
// Deterministic high-contrast user color from username
// Produces visually distinct hues that pop on both dark and
// light map tiles.
// ═══════════════════════════════════════════════════════════
function getColorForUser(name, currentUserId, ownerId) {
  if (ownerId === currentUserId) return 'hsl(75, 84%, 69%)'; // lime (#CCF381)
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 65%, 55%)`;
}

// ═══════════════════════════════════════════════════════════
// King of the Hill: Deduplicate overlapping claims.
// When multiple users claim the same area, only the current
// record-holder ("The King") is rendered.
// Uses most-recent-run as the dominance metric.
// ═══════════════════════════════════════════════════════════
function deduplicateClaims(claims) {
  // Group claims by a spatial key (rounded center coords)
  const buckets = new Map();

  for (const claim of claims) {
    // Spatial bucket key: rounded to ~10m grid for overlap detection
    const key = `${(claim.center_lat * 1000).toFixed(0)}_${(claim.center_lon * 1000).toFixed(0)}`;

    const existing = buckets.get(key);
    if (!existing) {
      buckets.set(key, claim);
    } else {
      // Dominance: most recently maintained claim wins
      const existingTime = new Date(existing.last_maintained_at || existing.created_at).getTime();
      const newTime = new Date(claim.last_maintained_at || claim.created_at).getTime();
      if (newTime > existingTime) {
        buckets.set(key, claim);
      }
    }
  }

  return Array.from(buckets.values());
}

// ═══════════════════════════════════════════════════════════
// Cinematic fly-in on mount
// ═══════════════════════════════════════════════════════════
const CinematicEntry = ({ target }) => {
  const map = useMap();
  const flown = useRef(false);
  useEffect(() => {
    if (target && !flown.current) {
      flown.current = true;
      // Start closer (zoom 12) so the canvas doesn't stretch the red dot massively
      map.setView([target[0] + 0.05, target[1]], 12, { animate: false });
      setTimeout(() => {
        map.flyTo(target, 15, { duration: 1.5, easeLinearity: 0.25 });
      }, 400);
    }
  }, [target, map]);
  return null;
};

// ═══════════════════════════════════════════════════════════
// Recenter control (must be inside MapContainer)
// ═══════════════════════════════════════════════════════════
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

// ═══════════════════════════════════════════════════════════
// Interactive Territory Polygon with hover & popup
// ═══════════════════════════════════════════════════════════
const TerritoryPolygon = ({ claim, color, isOwn, isHighlighted }) => {
  if (!claim.geometry || !claim.geometry.coordinates) return null;

  // GeoJSON is [lon, lat], Leaflet wants [lat, lon]
  const positions = claim.geometry.coordinates[0].map(([lon, lat]) => [lat, lon]);
  if (positions.length < 3) return null;

  return (
    <Polygon
      positions={positions}
      eventHandlers={{
        mouseover: (e) => {
          const layer = e.target;
          layer.setStyle({
            weight: 4,
            dashArray: '5, 10',
            fillOpacity: 0.65,
          });
          layer.bringToFront();
        },
        mouseout: (e) => {
          const layer = e.target;
          layer.setStyle({
            weight: 2,
            dashArray: null,
            fillOpacity: 0.4,
          });
        },
      }}
      pathOptions={{
        fillColor: isHighlighted ? '#FFD700' : color,
        fillOpacity: isHighlighted ? 0.7 : 0.4,
        color: isHighlighted ? '#FFD700' : color,
        weight: 2,
        className: isHighlighted ? 'hex-territory hex-flash' : 'hex-territory',
      }}
    >
      <Popup className="territory-popup">
        <div className="bg-[#09090B] text-white p-3 rounded-xl min-w-[200px] -m-[13px] -mt-[10px]">
          <div className="flex items-center gap-2 mb-2">
            <Crown className="w-4 h-4 text-yellow-500" />
            <span className="font-unbounded font-bold text-sm">
              {claim.owner_name || 'Unknown'}
            </span>
          </div>
          <p className="text-xs text-zinc-400 mb-1">
            {isOwn ? 'You dominate this area!' : `${claim.owner_name} dominates this street!`}
          </p>
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/10">
            <span className="text-xs text-zinc-500">Area Conquered</span>
            <span className="font-mono text-sm text-[#CCF381] font-bold">
              {Math.round(claim.area_m2)} m²
            </span>
          </div>
          {!isOwn && (
            <p className="text-xs text-[#7000FF] mt-2 italic">
              Run here to claim this territory!
            </p>
          )}
        </div>
      </Popup>
      <Tooltip sticky className="hex-tooltip">
        <div className="text-xs">
          <strong>{claim.owner_name}</strong>
          <br />{Math.round(claim.area_m2)} m²
        </div>
      </Tooltip>
    </Polygon>
  );
};

// ═══════════════════════════════════════════════════════════
// DASHBOARD COMPONENT
// ═══════════════════════════════════════════════════════════
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
          // Refresh territory data
          fetchClaims();
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

  // King of the Hill: deduplicate overlapping claims
  const dominantClaims = useMemo(() => deduplicateClaims(claims), [claims]);

  const handleLogout = async () => { await logout(); navigate('/'); };

  const formatDistance = (m) => !m ? '0 m' : m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${Math.round(m)} m`;
  const formatArea = (s) => !s ? '0 m²' : s >= 1000000 ? `${(s / 1000000).toFixed(2)} km²` : s >= 10000 ? `${(s / 10000).toFixed(2)} ha` : `${Math.round(s)} m²`;
  const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '';

  return (
    <div className="min-h-screen bg-[#09090B]">
      {/* ═══ Mobile-First Navigation ═══ */}
      <nav className="fixed top-0 left-0 right-0 z-[100] glass-panel border-b border-white/5">
        <div className="px-4">
          <div className="flex items-center justify-between h-14">
            <Link to="/dashboard" className="flex items-center gap-2" data-testid="logo-link">
              <div className="w-9 h-9 rounded-full bg-[#CCF381] flex items-center justify-center">
                <Target className="w-5 h-5 text-black" />
              </div>
              <span className="font-unbounded font-bold text-lg text-white">Intertia</span>
            </Link>
            <div className="flex items-center gap-3">
              <Button
                onClick={() => navigate('/run')}
                className="bg-[#CCF381] text-black hover:bg-[#B8E065] font-bold rounded-full px-5 h-9 text-sm"
                data-testid="start-run-btn"
              >
                <Play className="w-4 h-4 mr-1" /> Run
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-2" data-testid="user-menu-trigger">
                    <Avatar className="w-8 h-8 border-2 border-white/10">
                      <AvatarImage src={user?.picture} />
                      <AvatarFallback className="bg-zinc-800 text-white text-sm">{user?.name?.charAt(0) || 'U'}</AvatarFallback>
                    </Avatar>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 bg-zinc-900 border-white/10 z-[9999]">
                  <div className="px-3 py-2">
                    <p className="text-sm font-medium text-white">{user?.name}</p>
                    <p className="text-xs text-zinc-500">{user?.email}</p>
                  </div>
                  <DropdownMenuSeparator className="bg-white/10" />
                  <DropdownMenuItem onClick={() => navigate('/dashboard')} className="text-zinc-300 focus:bg-white/10 focus:text-white cursor-pointer">
                    <MapIcon className="w-4 h-4 mr-2" /> Dashboard
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/leaderboards')} className="text-zinc-300 focus:bg-white/10 focus:text-white cursor-pointer">
                    <Trophy className="w-4 h-4 mr-2" /> Leaderboards
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/groups')} className="text-zinc-300 focus:bg-white/10 focus:text-white cursor-pointer">
                    <Users className="w-4 h-4 mr-2" /> Groups
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/seasons')} className="text-zinc-300 focus:bg-white/10 focus:text-white cursor-pointer">
                    <Calendar className="w-4 h-4 mr-2" /> Seasons
                  </DropdownMenuItem>
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
      <main className="pt-14 pb-6">
        {/* ═══ TERRITORY MAP (King of the Hill) ═══ */}
        <div className="relative w-full h-[55vh] overflow-hidden" style={{ zIndex: 0 }}>
          <MapContainer
            center={userPosition || [28.6139, 77.209]}
            zoom={5}
            className="h-full w-full"
            zoomControl={false}
            attributionControl={false}
            preferCanvas={true}
          >
            {/* Clean CartoDB Voyager tiles for clear territory contrast */}
            <TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" />
            <CinematicEntry target={userPosition} />

            {/* King of the Hill territories — only dominant claims rendered */}
            {dominantClaims.map((claim) => {
              const color = getColorForUser(claim.owner_name || '', user?.user_id, claim.owner_id);
              const isOwn = claim.owner_id === user?.user_id;
              const isHighlighted = highlightedHexes.has(claim.claim_id);

              return (
                <TerritoryPolygon
                  key={claim.claim_id}
                  claim={claim}
                  color={color}
                  isOwn={isOwn}
                  isHighlighted={isHighlighted}
                />
              );
            })}

            {/* Recenter button */}
            <RecenterControl position={userPosition} />

            {/* Live user location marker */}
            {userPosition && (
              <CircleMarker
                center={userPosition}
                radius={8}
                pathOptions={{
                  fillColor: '#ef4444',
                  fillOpacity: 1,
                  color: '#ffffff',
                  weight: 2,
                }}
              />
            )}
          </MapContainer>

          {/* Floating glassmorphic territory overlay */}
          <div className="absolute top-3 left-3 z-[40]">
            <div className="glass-panel rounded-2xl p-3 min-w-[160px]">
              <div className="flex items-center gap-2 mb-1">
                <Hexagon className="w-4 h-4 text-[#CCF381]" />
                <span className="text-xs font-semibold text-white">Your Territory</span>
              </div>
              <p className="font-unbounded text-xl font-bold text-[#CCF381]">
                {formatArea(stats?.total_area_m2 || user?.total_area_m2)}
              </p>
              <p className="text-xs text-zinc-400 mt-0.5">
                Rank #{stats?.global_rank || '—'}
              </p>
            </div>
          </div>

          {/* Gradient fade at bottom of map */}
          <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-[#09090B] to-transparent pointer-events-none z-[30]" />
        </div>

        {/* ═══ STATS & CONTENT ═══ */}
        <div className="px-4 -mt-8 relative z-[10]">
          {/* Stats Grid — 2-column mobile */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            {[
              { icon: TrendingUp, color: 'text-[#CCF381]', label: 'Distance', value: formatDistance(stats?.total_distance_m || user?.total_distance_m) },
              { icon: Hexagon, color: 'text-[#7000FF]', label: 'Territory', value: formatArea(stats?.total_area_m2 || user?.total_area_m2) },
              { icon: Trophy, color: 'text-yellow-500', label: 'Runs', value: stats?.total_runs || user?.total_runs || 0 },
              { icon: Flame, color: 'text-orange-500', label: 'Streak', value: `${stats?.current_streak || user?.current_streak || 0}d` },
            ].map((stat, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.05 }} className="card-glass p-4">
                <div className="flex items-center justify-between mb-2">
                  <stat.icon className={`w-4 h-4 ${stat.color}`} />
                  <span className="text-xs text-zinc-500">{stat.label}</span>
                </div>
                <p className="font-unbounded text-xl font-bold text-white">{stat.value}</p>
              </motion.div>
            ))}
          </div>

          {/* Recent Runs */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="card-glass p-4 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-unbounded font-semibold text-base text-white">Recent Runs</h2>
              <Link to="/profile" className="text-[#CCF381] text-xs hover:underline">View all</Link>
            </div>
            {recentRuns.length > 0 ? (
              <div className="space-y-3">
                {recentRuns.map((run) => (
                  <div key={run.run_id} className="flex items-center justify-between p-3 rounded-xl bg-zinc-900/50 hover:bg-zinc-800/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-[#CCF381]/10 flex items-center justify-center">
                        <MapIcon className="w-4 h-4 text-[#CCF381]" />
                      </div>
                      <div>
                        <p className="font-medium text-sm text-white">{formatDate(run.started_at)}</p>
                        <p className="text-xs text-zinc-500">{run.run_type === 'group' ? 'Group' : 'Solo'}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-mono text-sm text-white">{formatDistance(run.distance_m)}</p>
                      <p className="text-xs text-[#7000FF]">{formatArea(run.area_claimed_m2)}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <MapIcon className="w-10 h-10 text-zinc-700 mx-auto mb-3" />
                <p className="text-zinc-500 text-sm mb-3">No runs yet. Start conquering!</p>
                <Button onClick={() => navigate('/run')} className="bg-[#CCF381] text-black hover:bg-[#B8E065] font-semibold rounded-full text-sm">Start First Run</Button>
              </div>
            )}
          </motion.div>

          {/* Leaderboard Preview */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }} className="card-glass p-4 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-unbounded font-semibold text-base text-white">Top Runners</h2>
              <Link to="/leaderboards" className="text-[#CCF381] text-xs hover:underline">View all</Link>
            </div>
            <div className="space-y-3">
              {leaderboard.slice(0, 5).map((entry, index) => (
                <div key={entry.user_id} className="flex items-center gap-3">
                  <span className={`w-5 text-center font-mono font-bold text-sm ${index === 0 ? 'rank-gold' : index === 1 ? 'rank-silver' : index === 2 ? 'rank-bronze' : 'text-zinc-500'}`}>
                    {entry.rank}
                  </span>
                  <Avatar className="w-7 h-7">
                    <AvatarImage src={entry.picture} />
                    <AvatarFallback className="bg-zinc-800 text-white text-xs">{entry.name?.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{entry.name}</p>
                  </div>
                  <p className="text-xs font-mono text-[#CCF381]">{formatArea(entry.value)}</p>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Season & Quick Actions */}
          {currentSeason && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="card-glass p-4 mb-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-[#7000FF] rounded-full filter blur-[50px] opacity-20" />
              <div className="relative">
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="w-4 h-4 text-[#7000FF]" />
                  <span className="text-xs text-zinc-500 uppercase tracking-wide">Current Season</span>
                </div>
                <h3 className="font-unbounded font-semibold text-sm text-white mb-1">{currentSeason.name}</h3>
                <p className="text-xs text-zinc-400 mb-3">{currentSeason.description}</p>
                <Link to="/seasons">
                  <Button variant="outline" className="w-full border-white/20 bg-transparent text-white hover:bg-white/10 rounded-xl text-sm h-9">
                    View Season <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </Link>
              </div>
            </motion.div>
          )}

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }} className="card-glass p-4 mb-6">
            <h2 className="font-unbounded font-semibold text-base text-white mb-3">Quick Actions</h2>
            <div className="space-y-2">
              <Link to="/groups">
                <Button variant="outline" className="w-full justify-start border-white/10 bg-transparent text-zinc-300 hover:bg-white/5 hover:text-white rounded-xl text-sm h-10">
                  <Users className="w-4 h-4 mr-2 text-[#CCF381]" /> Join Group Run
                </Button>
              </Link>
              <Link to="/profile">
                <Button variant="outline" className="w-full justify-start border-white/10 bg-transparent text-zinc-300 hover:bg-white/5 hover:text-white rounded-xl text-sm h-10 mt-2">
                  <Trophy className="w-4 h-4 mr-2 text-yellow-500" /> View Badges
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </main>
    </div>
  );
}
