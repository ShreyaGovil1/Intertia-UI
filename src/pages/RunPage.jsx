import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { MapContainer, TileLayer, Polyline, Polygon, useMap } from 'react-leaflet';
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
    startRun,
    addPoint,
    syncPoints,
    closeLoop,
    endRun,
    setDuration,
    reset,
  } = useRunStore();

  const [mapCenter, setMapCenter] = useState([51.505, -0.09]); // Default to London
  const [userPosition, setUserPosition] = useState(null);
  const [isPaused, setIsPaused] = useState(false);
  const [gpsError, setGpsError] = useState(null);
  const [claims, setClaims] = useState([]);
  const [showClaimAnimation, setShowClaimAnimation] = useState(false);
  const [lastClaimArea, setLastClaimArea] = useState(0);

  const watchIdRef = useRef(null);
  const timerRef = useRef(null);
  const syncIntervalRef = useRef(null);

  // Get user's current location on mount
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
        { enableHighAccuracy: true }
      );
    } else {
      setGpsError('Geolocation is not supported by your browser.');
    }

    return () => {
      if (watchIdRef.current) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
      }
    };
  }, []);

  // Load nearby claims
  useEffect(() => {
    const fetchClaims = async () => {
      if (!userPosition) return;
      try {
        const [lat, lon] = userPosition;
        const response = await fetch(
          `${API_BASE}/claims?min_lat=${lat - 0.05}&max_lat=${lat + 0.05}&min_lon=${lon - 0.05}&max_lon=${lon + 0.05}`
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

    // Start GPS tracking
    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        if (isPaused) return;

        const { latitude, longitude, accuracy, speed: gpsSpeed } = position.coords;
        setUserPosition([latitude, longitude]);
        setMapCenter([latitude, longitude]);

        const point = {
          timestamp: new Date().toISOString(),
          lat: latitude,
          lon: longitude,
          accuracy_m: accuracy,
          speed_mps: gpsSpeed || 0,
        };

        addPoint(point);
      },
      (error) => {
        console.error('GPS watch error:', error);
        toast.error('GPS signal lost');
      },
      {
        enableHighAccuracy: true,
        maximumAge: 1000,
        timeout: 5000,
      }
    );

    // Start duration timer
    timerRef.current = setInterval(() => {
      setDuration((prev) => prev + 1);
    }, 1000);

    // Start sync interval (every 5 seconds)
    syncIntervalRef.current = setInterval(() => {
      syncPoints(token);
    }, 5000);
  };

  const handlePause = () => {
    setIsPaused(!isPaused);
    if (!isPaused) {
      toast.info('Run paused');
    } else {
      toast.info('Run resumed');
    }
  };

  const handleCloseLoop = async () => {
    const claim = await closeLoop(token);
    if (claim) {
      setLastClaimArea(claim.area_m2);
      setShowClaimAnimation(true);
      toast.success(`Territory claimed! ${claim.area_m2.toFixed(0)} m²`);
      setTimeout(() => setShowClaimAnimation(false), 3000);

      // Refresh claims
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
      toast.error('No valid loop detected. Keep running!');
    }
  };

  const handleEndRun = async () => {
    // Clear intervals
    if (watchIdRef.current) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (syncIntervalRef.current) {
      clearInterval(syncIntervalRef.current);
      syncIntervalRef.current = null;
    }

    // Sync final points
    await syncPoints(token);

    // End run
    const finalRun = await endRun(token);
    if (finalRun) {
      toast.success('Run completed!');
      navigate('/dashboard');
    } else {
      toast.error('Failed to end run');
    }
  };

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
    const paceMinPerKm = 16.6667 / speedMps; // Convert m/s to min/km
    const mins = Math.floor(paceMinPerKm);
    const secs = Math.round((paceMinPerKm - mins) * 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Convert points to polyline positions
  const trailPositions = points.map((p) => [p.lat, p.lon]);

  return (
    <div className="h-screen w-screen relative bg-[#09090B] overflow-hidden">
      {/* Map */}
      <MapContainer
        center={mapCenter}
        zoom={16}
        className="h-full w-full z-0"
        zoomControl={false}
        attributionControl={false}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        />
        <MapUpdater center={mapCenter} />

        {/* Existing claims */}
        {claims.map((claim) => {
          const coords = claim.geometry?.coordinates?.[0]?.map((c) => [c[1], c[0]]) || [];
          const isOwn = claim.owner_id === user?.user_id;
          return (
            <Polygon
              key={claim.claim_id}
              positions={coords}
              pathOptions={{
                fillColor: isOwn ? '#CCF381' : '#7000FF',
                fillOpacity: 0.3,
                color: isOwn ? '#CCF381' : '#7000FF',
                weight: 2,
              }}
            />
          );
        })}

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
            className={`w-4 h-4 ${userPosition ? 'text-[#CCF381]' : 'text-yellow-500'}`}
          />
          <span className="text-sm text-white">
            {userPosition ? 'GPS Active' : 'Searching...'}
          </span>
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
                <Target className="w-12 h-12 text-black" />
              </motion.div>
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="font-unbounded text-3xl font-bold text-white neon-text"
              >
                +{lastClaimArea.toFixed(0)} m²
              </motion.p>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="text-[#CCF381] text-lg"
              >
                Territory Claimed!
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
                  <Map className="w-4 h-4 text-[#7000FF]" />
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
                onClick={handleCloseLoop}
                className="w-16 h-16 rounded-full bg-[#7000FF] hover:bg-[#5E00D6] text-white p-0 transition-all duration-300"
                data-testid="claim-territory-btn"
              >
                <Target className="w-8 h-8" />
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
            Run a loop and tap the target to claim territory
          </motion.p>
        )}
      </div>
    </div>
  );
}
