// Centralized environment helpers for Vite compatibility.
// Prefer VITE_* env vars for Vite; fallback to REACT_APP_* for compatibility.
export const BACKEND_URL =
  import.meta.env.VITE_BACKEND_URL ||
  (typeof process !== 'undefined' ? process.env.REACT_APP_BACKEND_URL : undefined) ||
  'http://localhost:8001';

export const API_BASE = `${BACKEND_URL.replace(/\/$/, '')}/api`;
