import { create } from 'zustand';
import { API_BASE } from '@/env';

const API_URL = API_BASE;

// Strict GPS accuracy threshold in meters - points worse than this are discarded
const MAX_ACCURACY_M = 15;
// Minimum movement in meters to count a new point (filters GPS jitter when stationary)
const MIN_MOVEMENT_M = 2;

export const useRunStore = create((set, get) => ({
  currentRun: null,
  isRunning: false,
  points: [],
  distance: 0,
  areaClaimed: 0,
  duration: 0,
  speed: 0,
  startTime: null,     // Absolute timestamp when run started (for monotonic time)
  pausedTime: 0,       // Accumulated paused seconds
  pauseStartTime: null, // When the current pause began
  wsConnection: null,

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
      });

      return run;
    } catch (e) {
      console.error('Start run error:', e);
      return null;
    }
  },

  addPoint: (point) => {
    const { points, distance } = get();

    // Strict accuracy filter: discard low-quality GPS readings
    if (point.accuracy_m > MAX_ACCURACY_M) {
      return;
    }

    let newDistance = distance;

    if (points.length > 0) {
      const lastPoint = points[points.length - 1];
      const segDist = haversineDistance(
        lastPoint.lat,
        lastPoint.lon,
        point.lat,
        point.lon
      );

      // Filter GPS jitter: ignore micro-movements when stationary
      if (segDist < MIN_MOVEMENT_M) {
        return;
      }

      newDistance += segDist;
    }

    set({
      points: [...points, point],
      distance: newDistance,
      speed: point.speed_mps || 0,
    });
  },

  // Called every animation frame to compute monotonic elapsed time
  updateDuration: () => {
    const { startTime, pausedTime, pauseStartTime } = get();
    if (!startTime) return;

    const now = Date.now();
    let elapsed = Math.floor((now - startTime) / 1000);

    // Subtract total paused time
    elapsed -= pausedTime;

    // If currently paused, also subtract the ongoing pause
    if (pauseStartTime) {
      elapsed -= Math.floor((now - pauseStartTime) / 1000);
    }

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

  syncPoints: async (token) => {
    const { currentRun, points } = get();
    if (!currentRun || points.length === 0) return;

    // Get unsent points (last 10 or all if less)
    const pointsToSync = points.slice(-10);

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
        // Server recalculates distance, we trust our local calculation
        await response.json();
      }
    } catch (e) {
      console.error('Sync points error:', e);
    }
  },

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
        set((state) => ({
          areaClaimed: state.areaClaimed + result.total_area_m2,
        }));
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
    }),
}));

// Helper function
function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000; // Earth radius in meters
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
