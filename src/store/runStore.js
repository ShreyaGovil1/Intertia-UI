import { create } from 'zustand';
import buffer from '@turf/buffer';
import { lineString } from '@turf/helpers';
import { API_BASE } from '@/env';

const API_URL = API_BASE;

// ── GPS Quality Thresholds ──
// Strict accuracy: discard hardware GPS readings worse than 15 m
const MAX_ACCURACY_M = 15;
// Minimum movement to record a new point (filters stationary jitter)
const MIN_MOVEMENT_M = 2;
// Maximum plausible human speed (m/s). 12 m/s ≈ 43 km/h — elite sprinting.
// Any implied velocity above this is a GPS teleportation artefact.
const MAX_SPEED_MPS = 12;
// Buffer radius (metres) applied to each side of the run's linear trajectory
// to generate a claimable 2D polygon from a straight-line track.
const PATH_BUFFER_RADIUS_M = 10;

export const useRunStore = create((set, get) => ({
  currentRun: null,
  isRunning: false,
  points: [],
  distance: 0,
  areaClaimed: 0,
  duration: 0,
  speed: 0,
  startTime: null,      // Absolute timestamp when run started (monotonic base)
  pausedTime: 0,        // Accumulated paused seconds
  pauseStartTime: null, // When the current pause began
  droppedPoints: 0,     // Count of GPS points discarded by quality filters
  syncedUpTo: 0,        // Index into points[] of last successfully synced point
  wsConnection: null,

  // ── Start a new run ──
  startRun: async (token, runType = 'solo', groupId = null) => {
    try {
      const response = await fetch(`${API_URL}/runs/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ run_type: runType, group_id: groupId }),
        credentials: 'include',
      });

      if (!response.ok) throw new Error('Failed to start run');

      const run = await response.json();
      set({
        currentRun: run,
        isRunning: true,
        points: [],
        distance: 0,
        areaClaimed: 0,
        duration: 0,
        speed: 0,
        startTime: Date.now(),
        pausedTime: 0,
        pauseStartTime: null,
        droppedPoints: 0,
        syncedUpTo: 0,
      });

      return run;
    } catch (e) {
      console.error('Start run error:', e);
      return null;
    }
  },

  // ── Ingest a GPS point with strict quality filtering ──
  addPoint: (point) => {
    const { points, distance, droppedPoints } = get();

    // Gate 1: Hardware accuracy — discard low-quality readings
    if (point.accuracy_m > MAX_ACCURACY_M) {
      set({ droppedPoints: droppedPoints + 1 });
      return;
    }

    if (points.length > 0) {
      const lastPoint = points[points.length - 1];
      const segDist = haversineDistance(
        lastPoint.lat, lastPoint.lon,
        point.lat, point.lon
      );

      // Gate 2: Stationary jitter filter
      if (segDist < MIN_MOVEMENT_M) {
        return;
      }

      // Gate 3: Velocity-based teleportation filter
      const lastTs = new Date(lastPoint.timestamp).getTime();
      const curTs = new Date(point.timestamp).getTime();
      const deltaSeconds = (curTs - lastTs) / 1000;

      if (deltaSeconds > 0) {
        const impliedSpeed = segDist / deltaSeconds;
        if (impliedSpeed > MAX_SPEED_MPS) {
          // Impossible human velocity — GPS teleportation artefact
          set({ droppedPoints: droppedPoints + 1 });
          return;
        }
      }

      set({
        points: [...points, point],
        distance: distance + segDist,
        speed: point.speed_mps || 0,
      });
    } else {
      // First point — always accept if it passed accuracy gate
      set({
        points: [point],
        speed: point.speed_mps || 0,
      });
    }
  },

  // ── Monotonic elapsed time (background-safe) ──
  // Called every requestAnimationFrame tick. Computes wall-clock elapsed minus
  // paused durations so the timer snaps back instantly when the browser wakes.
  updateDuration: () => {
    const { startTime, pausedTime, pauseStartTime } = get();
    if (!startTime) return;
    if (pauseStartTime) return; // frozen while paused — avoids floor-boundary oscillation

    const elapsed = Math.floor((Date.now() - startTime) / 1000) - pausedTime;
    set({ duration: Math.max(0, elapsed) });
  },

  pause: () => {
    set({ pauseStartTime: Date.now() });
  },

  resume: () => {
    const { pauseStartTime, pausedTime } = get();
    if (pauseStartTime) {
      const pauseDuration = Math.floor((Date.now() - pauseStartTime) / 1000);
      set({
        pausedTime: pausedTime + pauseDuration,
        pauseStartTime: null,
      });
    }
  },

  // ── Sync points to backend ──
  syncPoints: async (token) => {
    const { currentRun, points, syncedUpTo } = get();
    if (!currentRun || points.length <= syncedUpTo) return;

    // Only send points we haven't synced yet
    const pointsToSync = points.slice(syncedUpTo);
    const newSyncedUpTo = points.length;

    try {
      const response = await fetch(`${API_URL}/runs/${currentRun.run_id}/points`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(pointsToSync),
        credentials: 'include',
      });

      if (response.ok) {
        set({ syncedUpTo: newSyncedUpTo });
      }
    } catch (e) {
      console.error('Sync points error:', e);
    }
  },

  // ── Claim H3 hexagons from the current run ──
  claimHexes: async (token) => {
    const { currentRun } = get();
    if (!currentRun) return null;

    try {
      const response = await fetch(`${API_URL}/runs/${currentRun.run_id}/claim-hexes`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        credentials: 'include',
      });

      if (response.ok) {
        const result = await response.json();
        if (result.claimed_count > 0 && result.total_area_m2 > 0) {
          set((state) => ({
            areaClaimed: state.areaClaimed + result.total_area_m2,
          }));
        }
        return result;
      }
    } catch (e) {
      console.error('Claim hexes error:', e);
    }
    return null;
  },

  // Legacy close-loop (kept for backward compat)
  closeLoop: async (token) => {
    const { currentRun } = get();
    if (!currentRun) return null;

    try {
      const response = await fetch(`${API_URL}/runs/${currentRun.run_id}/close-loop`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        credentials: 'include',
      });

      if (response.ok) {
        const claim = await response.json();
        set((state) => ({
          areaClaimed: state.areaClaimed + claim.area_m2,
        }));
        return claim;
      }
    } catch (e) {
      console.error('Close loop error:', e);
    }
    return null;
  },

  endRun: async (token) => {
    const { currentRun } = get();
    if (!currentRun) return null;

    try {
      const response = await fetch(`${API_URL}/runs/${currentRun.run_id}/end`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        credentials: 'include',
      });

      if (response.ok) {
        const run = await response.json();
        set({
          currentRun: run,
          isRunning: false,
          startTime: null,
          pausedTime: 0,
          pauseStartTime: null,
        });
        return run;
      }
    } catch (e) {
      console.error('End run error:', e);
    }
    return null;
  },

  setDuration: (duration) => set({ duration }),

  reset: () =>
    set({
      currentRun: null,
      isRunning: false,
      points: [],
      distance: 0,
      areaClaimed: 0,
      duration: 0,
      speed: 0,
      startTime: null,
      pausedTime: 0,
      pauseStartTime: null,
      droppedPoints: 0,
      syncedUpTo: 0,
    }),

  // ── Generate a buffered polygon from the run's linear path ──
  // Uses Turf.js to convert a 1D GPS trace into a 2D claimable area.
  // Handles self-intersections and sharp turns perfectly.
  getBufferedPath: () => {
    const { points } = get();
    if (points.length < 2) return null;

    try {
      // Turf expects [longitude, latitude]
      const ls = lineString(points.map((p) => [p.lon, p.lat]));
      
      // Buffer by PATH_BUFFER_RADIUS_M (converted to kilometers)
      const buffered = buffer(ls, PATH_BUFFER_RADIUS_M / 1000, { units: 'kilometers' });
      
      if (!buffered || !buffered.geometry || !buffered.geometry.coordinates) return null;

      // Extract the outer ring of the resulting polygon
      const ring = buffered.geometry.type === 'Polygon' 
        ? buffered.geometry.coordinates[0]
        : buffered.geometry.type === 'MultiPolygon' 
          ? buffered.geometry.coordinates[0][0]
          : null;

      if (!ring) return null;

      // Convert back to Leaflet [latitude, longitude]
      return ring.map(([lon, lat]) => [lat, lon]);
    } catch (e) {
      console.error("Turf buffer error:", e);
      return null;
    }
  },
}));


// ══════════════════════════════════════════════════════════════════════════════
// Pure helper functions (exported for potential testing)
// ══════════════════════════════════════════════════════════════════════════════

/** Haversine distance between two WGS-84 points (metres). */
export function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) ** 2 +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}


