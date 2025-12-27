import { create } from 'zustand';
import { API_BASE } from '@/env';

const API_URL = API_BASE;

export const useRunStore = create((set, get) => ({
  currentRun: null,
  isRunning: false,
  points: [],
  distance: 0,
  areaClaimed: 0,
  duration: 0,
  speed: 0,
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
      });

      return run;
    } catch (e) {
      console.error('Start run error:', e);
      return null;
    }
  },

  addPoint: (point) => {
    const { points, distance } = get();
    let newDistance = distance;

    if (points.length > 0) {
      const lastPoint = points[points.length - 1];
      newDistance += haversineDistance(
        lastPoint.lat,
        lastPoint.lon,
        point.lat,
        point.lon
      );
    }

    set({
      points: [...points, point],
      distance: newDistance,
      speed: point.speed_mps || 0,
    });
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
        const result = await response.json();
        set((state) => ({
          distance: state.distance + (result.distance_added || 0),
        }));
      }
    } catch (e) {
      console.error('Sync points error:', e);
    }
  },

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
