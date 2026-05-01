import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { API_BASE } from '@/env';

const API_URL = API_BASE;

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: true,

      setUser: (user, token = null) => {
        set({ user, token, isAuthenticated: !!user, isLoading: false });
      },

      logout: async () => {
        try {
          await fetch(`${API_URL}/auth/logout`, {
            method: 'POST',
            credentials: 'include',
          });
        } catch (e) {
          console.error('Logout error:', e);
        }
        set({ user: null, token: null, isAuthenticated: false, isLoading: false });
        localStorage.removeItem('auth-storage');
      },

      checkAuth: async () => {
        set({ isLoading: true });
        try {
          const token = get().token;
          const headers = token ? { Authorization: `Bearer ${token}` } : {};
          
          const response = await fetch(`${API_URL}/auth/me`, {
            credentials: 'include',
            headers,
          });
          
          if (response.ok) {
            const user = await response.json();
            set({ user, isAuthenticated: true, isLoading: false });
            return true;
          }
        } catch (e) {
          console.error('Auth check error:', e);
        }
        set({ user: null, isAuthenticated: false, isLoading: false });
        return false;
      },

      login: async (email, password) => {
        try {
          const response = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
            credentials: 'include',
          });
          
          if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Login failed');
          }
          
          const data = await response.json();
          set({ user: data.user, token: data.access_token, isAuthenticated: true, isLoading: false });
          return { success: true };
        } catch (e) {
          return { success: false, error: e.message };
        }
      },

      register: async (name, email, password) => {
        try {
          const response = await fetch(`${API_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, password }),
            credentials: 'include',
          });
          
          if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Registration failed');
          }
          
          const data = await response.json();
          set({ user: data.user, token: data.access_token, isAuthenticated: true, isLoading: false });
          return { success: true };
        } catch (e) {
          return { success: false, error: e.message };
        }
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ token: state.token }),
    }
  )
);
