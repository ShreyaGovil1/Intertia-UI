import { useEffect, useRef } from 'react';
import '@/App.css';
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { Toaster } from '@/components/ui/sonner';

// Pages
import Landing from '@/pages/Landing';
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import Dashboard from '@/pages/Dashboard';
import RunPage from '@/pages/RunPage';
import Leaderboards from '@/pages/Leaderboards';
import Profile from '@/pages/Profile';
import Groups from '@/pages/Groups';
import Seasons from '@/pages/Seasons';

// REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
const AuthCallback = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { processOAuthSession, setUser } = useAuthStore();
  const hasProcessed = useRef(false);

  useEffect(() => {
    if (hasProcessed.current) return;
    hasProcessed.current = true;

    const hash = location.hash;
    const sessionId = new URLSearchParams(hash.replace('#', '?')).get('session_id');

    if (sessionId) {
      processOAuthSession(sessionId).then((result) => {
        if (result.success) {
          navigate('/dashboard', { replace: true, state: { user: result.user } });
        } else {
          navigate('/login', { replace: true });
        }
      });
    } else {
      navigate('/login', { replace: true });
    }
  }, [location, navigate, processOAuthSession, setUser]);

  return (
    <div className="min-h-screen bg-[#09090B] flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-[#CCF381] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-zinc-400">Authenticating...</p>
      </div>
    </div>
  );
};

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, isLoading, checkAuth } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (location.state?.user) return; // Skip if user passed from AuthCallback
    
    checkAuth().then((authenticated) => {
      if (!authenticated) {
        navigate('/login', { replace: true });
      }
    });
  }, [checkAuth, navigate, location.state]);

  if (isLoading && !location.state?.user) {
    return (
      <div className="min-h-screen bg-[#09090B] flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-[#CCF381] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!isAuthenticated && !location.state?.user) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

function AppRouter() {
  const location = useLocation();

  // Check URL fragment for session_id synchronously during render (prevents race conditions)
  if (location.hash?.includes('session_id=')) {
    return <AuthCallback />;
  }

  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/run"
        element={
          <ProtectedRoute>
            <RunPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/leaderboards"
        element={
          <ProtectedRoute>
            <Leaderboards />
          </ProtectedRoute>
        }
      />
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <Profile />
          </ProtectedRoute>
        }
      />
      <Route
        path="/profile/:userId"
        element={
          <ProtectedRoute>
            <Profile />
          </ProtectedRoute>
        }
      />
      <Route
        path="/groups"
        element={
          <ProtectedRoute>
            <Groups />
          </ProtectedRoute>
        }
      />
      <Route
        path="/seasons"
        element={
          <ProtectedRoute>
            <Seasons />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

function App() {
  return (
    <div className="App min-h-screen bg-[#09090B]">
      <Toaster position="top-right" richColors />
      <BrowserRouter>
        <AppRouter />
      </BrowserRouter>
    </div>
  );
}

export default App;
