import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { MapContainer, TileLayer, Polyline, Polygon, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  Play,
  Pause,
  Square,
  Target,
  Navigation,
  Zap,
  Timer,
  TrendingUp,
  Map,
  AlertCircle,
  Hexagon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/store/authStore';
import { useRunStore } from '@/store/runStore';
import { toast } from 'sonner';
import { API_BASE } from '@/env';

// Fix Leaflet default marker icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const MapUpdater = ({ center, zoom }) => {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.setView(center, zoom || map.getZoom());
    }
  }, [center, zoom, map]);
  return null;
};

export default function RunPage() {
  const navigate = useNavigate();
  const { user, token } = useAuthStore();
  const {
    currentRun,
    isRunning,
    points,
    distance,
    areaClaimed,
    duration,
    speed,
    droppedPoints,
    startRun,
    addPoint,
    syncPoints,
    claimHexes,
    closeLoop,
    endRun,
    updateDuration,
    pause,
    resume,
    reset,
    getBufferedPath,
  } = useRunStore();

  const [mapCenter, setMapCenter] = useState([51.505, -0.09]); // Default to London
  const [userPosition, setUserPosition] = useState(null);
  const [isPaused, setIsPaused] = useState(false);
  const [gpsError, setGpsError] = useState(null);
  const [claims, setClaims] = useState([]);
  const [showClaimAnimation, setShowClaimAnimation] = useState(false);
  const [lastClaimInfo, setLastClaimInfo] = useState({ count: 0, area: 0 });

  const watchIdRef = useRef(null);
  const timerRef = useRef(null);
  const syncIntervalRef = useRef(null);

  // ── Initial GPS lock on mount ──
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setMapCenter([latitude, longitude]);
          setUserPosition([latitude, longitude]);
        },
        (error) => {
          console.error('Geolocation error:', error);
          setGpsError('Unable to get your location. Please enable GPS.');
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    } else {
      setGpsError('Geolocation is not supported by your browser.');
    }

    return () => {
      if (watchIdRef.current) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
      if (timerRef.current) {
        cancelAnimationFrame(timerRef.current);
      }
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
      }
    };
  }, []);

  // ── Load nearby claims ──
  useEffect(() => {
    const fetchClaims = async () => {
      if (!userPosition) return;
      try {
        const [lat, lon] = userPosition;
        const response = await fetch(
          `${API_BASE}/claims?min_lat=${lat - 0.1}&max_lat=${lat + 0.1}&min_lon=${lon - 0.1}&max_lon=${lon + 0.1}`
        );
        if (response.ok) {
          const data = await response.json();
          setClaims(data);
        }
      } catch (e) {
        console.error('Error fetching claims:', e);
      }
    };
    fetchClaims();
  }, [userPosition]);

  // ── Start run handler ──
  const handleStartRun = async () => {
    if (!userPosition) {
      toast.error('Waiting for GPS signal...');
      return;
    }

    const run = await startRun(token);
    if (!run) {
      toast.error('Failed to start run');
      return;
    }

    toast.success('Run started! Start moving to capture territory.');

    // ── GPS tracking with strict hardware settings ──
    // maximumAge: 0 prevents the browser from returning stale cached positions
    // enableHighAccuracy: true forces the device to use its best sensor
    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        if (isPaused) return;

        const { latitude, longitude, accuracy, speed: gpsSpeed, heading } = position.coords;

        // Hardware accuracy gate: drop anything worse than 15m at ingestion
        if (accuracy > 15) {
          return;
        }

        setUserPosition([latitude, longitude]);
        setMapCenter([latitude, longitude]);

        const point = {
          timestamp: new Date().toISOString(),
          lat: latitude,
          lon: longitude,
          accuracy_m: accuracy,
          speed_mps: gpsSpeed || 0,
          heading: heading || null,
        };

        // addPoint performs additional velocity-based filtering internally
        addPoint(point);
      },
      (error) => {
        console.error('GPS watch error:', error);
        toast.error('GPS signal lost');
      },
      {
        enableHighAccuracy: true,
        maximumAge: 0,       // Never use cached positions
        timeout: 10000,
      }
    );

    // ── Monotonic timer via requestAnimationFrame ──
    // rAF automatically pauses when the tab is backgrounded. When the browser
    // returns, updateDuration() recalculates from the absolute wall-clock
    // startTime, instantly snapping back to the correct elapsed value.
    const tick = () => {
      updateDuration();
      timerRef.current = requestAnimationFrame(tick);
    };
    timerRef.current = requestAnimationFrame(tick);

    // ── Background point sync every 5s ──
    syncIntervalRef.current = setInterval(() => {
      syncPoints(token);
    }, 5000);
  };

  // ── Pause / Resume ──
  const handlePause = () => {
    if (!isPaused) {
      pause();
      setIsPaused(true);
      toast.info('Run paused');
    } else {
      resume();
      setIsPaused(false);
      toast.info('Run resumed');
    }
  };

  // ── Claim hexagonal territory ──
  const handleClaimHexes = async () => {
    await syncPoints(token);

    const result = await claimHexes(token);
    if (result) {
      setLastClaimInfo({ count: result.claimed_count || 1, area: result.total_area_m2 });
      setShowClaimAnimation(true);
      toast.success(`Claimed ${result.claimed_count} hexes!`);
      setTimeout(() => setShowClaimAnimation(false), 3000);

      // Refresh claims on map
      if (userPosition) {
        const [lat, lon] = userPosition;
        const response = await fetch(
          `${API_BASE}/claims?min_lat=${lat - 0.05}&max_lat=${lat + 0.05}&min_lon=${lon - 0.05}&max_lon=${lon + 0.05}`
        );
        if (response.ok) {
          setClaims(await response.json());
        }
      }
    } else {
      toast.error('Not enough GPS data to claim territory yet. Keep running!');
    }
  };

  // ── End run ──
  const handleEndRun = async () => {
    // Clear all intervals and watchers
    if (watchIdRef.current) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    if (timerRef.current) {
      cancelAnimationFrame(timerRef.current);
      timerRef.current = null;
    }
    if (syncIntervalRef.current) {
      clearInterval(syncIntervalRef.current);
      syncIntervalRef.current = null;
    }

    // Sync final points
    await syncPoints(token);

    // Auto-claim territory on run end
    await claimHexes(token);

    // End run
    const finalRun = await endRun(token);
    if (finalRun) {
      toast.success('Run completed! Territory claimed.');
      navigate('/dashboard');
    } else {
      toast.error('Failed to end run');
    }
  };

  // ── Formatting helpers ──
  const formatDuration = (seconds) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDistance = (meters) => {
    if (meters >= 1000) return `${(meters / 1000).toFixed(2)} km`;
    return `${Math.round(meters)} m`;
  };

  const formatPace = (speedMps) => {
    if (!speedMps || speedMps === 0) return '--:--';
    const paceMinPerKm = 16.6667 / speedMps;
    const mins = Math.floor(paceMinPerKm);
    const secs = Math.round((paceMinPerKm - mins) * 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // ── Derived data ──
  const trailPositions = points.map((p) => [p.lat, p.lon]);
  const bufferedPath = getBufferedPath();

  return (
    <div className="h-screen w-screen relative bg-[#09090B] overflow-hidden">
      {/* Map */}
      <MapContainer
        center={mapCenter}
        zoom={16}
        className="h-full w-full z-0"
        zoomControl={false}
        attributionControl={false}
        preferCanvas={true}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        />
        <MapUpdater center={mapCenter} />

        {/* Existing claims */}
        {claims.map((claim) => {
          if (!claim.geometry || !claim.geometry.coordinates) return null;
          // GeoJSON is [lon, lat], Leaflet wants [lat, lon]
          const positions = claim.geometry.coordinates[0].map(([lon, lat]) => [lat, lon]);
          if (positions.length < 3) return null;
          const isOwn = claim.owner_id === user?.user_id;
          return (
            <Polygon
              key={claim.claim_id}
              positions={positions}
              pathOptions={{
                fillColor: isOwn ? '#CCF381' : '#7000FF',
                fillOpacity: 0.3,
                color: isOwn ? '#CCF381' : '#7000FF',
                weight: 2,
              }}
            />
          );
        })}

        {/* Buffered territory preview (20m radius around trail) */}
        {bufferedPath && (
          <Polygon
            positions={bufferedPath}
            pathOptions={{
              fillColor: '#CCF381',
              fillOpacity: 0.12,
              color: '#CCF381',
              weight: 1,
              dashArray: '4, 6',
            }}
          />
        )}

        {/* Current run trail */}
        {trailPositions.length > 1 && (
          <Polyline
            positions={trailPositions}
            pathOptions={{
              color: '#CCF381',
              weight: 4,
              opacity: 0.8,
              dashArray: '10, 5',
            }}
          />
        )}

        {/* User position indicator */}
        {userPosition && (
          <Circle
            center={userPosition}
            radius={8}
            pathOptions={{
              color: '#CCF381',
              fillColor: '#CCF381',
              fillOpacity: 1,
              weight: 3,
            }}
          />
        )}
      </MapContainer>

      {/* Header */}
      <div className="absolute top-4 left-4 right-4 z-10 flex items-center justify-between">
        <button
          onClick={() => {
            if (isRunning) {
              if (window.confirm('End run and go back?')) {
                handleEndRun();
              }
            } else {
              navigate('/dashboard');
            }
          }}
          className="glass rounded-full p-3"
          data-testid="back-btn"
        >
          <Target className="w-6 h-6 text-[#CCF381]" />
        </button>

        {/* GPS Status */}
        <div className="glass rounded-full px-4 py-2 flex items-center gap-2">
          <Navigation
            className={`w-4 h-4 ${userPosition ? 'text-[#CCF381]' : 'text-yellow-500 animate-pulse'}`}
          />
          <span className="text-sm text-white">
            {userPosition ? 'GPS Active' : 'Searching...'}
          </span>
          {isRunning && droppedPoints > 0 && (
            <span className="text-xs text-zinc-500 ml-1">
              ({droppedPoints} filtered)
            </span>
          )}
        </div>
      </div>

      {/* GPS Error */}
      {gpsError && (
        <div className="absolute top-20 left-4 right-4 z-10">
          <div className="bg-red-500/20 border border-red-500/30 rounded-xl p-4 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-500" />
            <p className="text-red-400 text-sm">{gpsError}</p>
          </div>
        </div>
      )}

      {/* Claim Animation */}
      <AnimatePresence>
        {showClaimAnimation && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
            className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none"
          >
            <div className="text-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 200 }}
                className="w-24 h-24 rounded-full bg-[#CCF381] flex items-center justify-center mb-4 mx-auto neon-glow"
              >
                <Hexagon className="w-12 h-12 text-black" />
              </motion.div>
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="font-unbounded text-3xl font-bold text-white neon-text"
              >
                +{lastClaimInfo.count} hexes
              </motion.p>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="text-[#CCF381] text-lg"
              >
                {lastClaimInfo.area.toFixed(0)} m² Territory Claimed!
              </motion.p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* HUD */}
      <div className="absolute bottom-6 left-4 right-4 z-10">
        {/* Stats Bar */}
        {isRunning && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="hud-glass rounded-2xl p-4 mb-4"
          >
            <div className="grid grid-cols-4 gap-4">
              <div className="text-center" data-testid="hud-duration">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <Timer className="w-4 h-4 text-zinc-500" />
                </div>
                <p className="font-mono text-2xl font-bold text-white">
                  {formatDuration(duration)}
                </p>
                <p className="text-xs text-zinc-500">Duration</p>
              </div>

              <div className="text-center" data-testid="hud-distance">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <TrendingUp className="w-4 h-4 text-[#CCF381]" />
                </div>
                <p className="font-mono text-2xl font-bold text-[#CCF381]">
                  {formatDistance(distance)}
                </p>
                <p className="text-xs text-zinc-500">Distance</p>
              </div>

              <div className="text-center" data-testid="hud-pace">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <Zap className="w-4 h-4 text-yellow-500" />
                </div>
                <p className="font-mono text-2xl font-bold text-white">
                  {formatPace(speed)}
                </p>
                <p className="text-xs text-zinc-500">Pace/km</p>
              </div>

              <div className="text-center" data-testid="hud-area">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <Hexagon className="w-4 h-4 text-[#7000FF]" />
                </div>
                <p className="font-mono text-2xl font-bold text-[#7000FF]">
                  {areaClaimed.toFixed(0)}
                </p>
                <p className="text-xs text-zinc-500">m² Claimed</p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Control Buttons */}
        <div className="hud-glass rounded-full p-3 flex items-center justify-center gap-4">
          {!isRunning ? (
            <Button
              onClick={handleStartRun}
              disabled={!userPosition}
              className="w-16 h-16 rounded-full bg-[#CCF381] hover:bg-[#B8E065] text-black p-0 transition-all duration-300 hover:shadow-[0_0_30px_rgba(204,243,129,0.5)]"
              data-testid="start-run-btn"
            >
              <Play className="w-8 h-8" />
            </Button>
          ) : (
            <>
              <Button
                onClick={handlePause}
                variant="outline"
                className="w-14 h-14 rounded-full border-white/20 bg-transparent hover:bg-white/10 p-0"
                data-testid="pause-btn"
              >
                {isPaused ? (
                  <Play className="w-6 h-6 text-white" />
                ) : (
                  <Pause className="w-6 h-6 text-white" />
                )}
              </Button>

              <Button
                onClick={handleClaimHexes}
                className="w-16 h-16 rounded-full bg-[#7000FF] hover:bg-[#5E00D6] text-white p-0 transition-all duration-300"
                data-testid="claim-territory-btn"
              >
                <Hexagon className="w-8 h-8" />
              </Button>

              <Button
                onClick={handleEndRun}
                variant="outline"
                className="w-14 h-14 rounded-full border-red-500/50 bg-transparent hover:bg-red-500/20 p-0"
                data-testid="end-run-btn"
              >
                <Square className="w-6 h-6 text-red-500" />
              </Button>
            </>
          )}
        </div>

        {/* Instructions */}
        {!isRunning && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center text-zinc-500 text-sm mt-4"
          >
            Press play to start tracking your run
          </motion.p>
        )}

        {isRunning && points.length < 10 && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center text-zinc-500 text-sm mt-4"
          >
            Run around to claim hexagonal territory tiles!
          </motion.p>
        )}
      </div>
    </div>
  );
}
