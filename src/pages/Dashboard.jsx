import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Target,
  Play,
  Map,
  Trophy,
  Flame,
  Users,
  Calendar,
  ChevronRight,
  LogOut,
  Settings,
  TrendingUp,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/store/authStore';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

import { API_BASE } from '@/env';

const API_URL = API_BASE;

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, logout, token } = useAuthStore();
  const [stats, setStats] = useState(null);
  const [recentRuns, setRecentRuns] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [currentSeason, setCurrentSeason] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setIsLoading(true);
    try {
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      const [statsRes, runsRes, leaderRes, seasonRes] = await Promise.all([
        fetch(`${API_URL}/users/${user?.user_id}/stats`, { headers, credentials: 'include' }),
        fetch(`${API_URL}/runs?limit=5`, { headers, credentials: 'include' }),
        fetch(`${API_URL}/leaderboards/area?limit=5`, { headers, credentials: 'include' }),
        fetch(`${API_URL}/seasons/current`, { headers, credentials: 'include' }),
      ]);

      if (statsRes.ok) setStats(await statsRes.json());
      if (runsRes.ok) setRecentRuns(await runsRes.json());
      if (leaderRes.ok) setLeaderboard(await leaderRes.json());
      if (seasonRes.ok) setCurrentSeason(await seasonRes.json());
    } catch (e) {
      console.error('Dashboard fetch error:', e);
    }
    setIsLoading(false);
  };

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const formatDistance = (meters) => {
    if (!meters) return '0 m';
    if (meters >= 1000) return `${(meters / 1000).toFixed(1)} km`;
    return `${Math.round(meters)} m`;
  };

  const formatArea = (sqMeters) => {
    if (!sqMeters) return '0 m²';
    if (sqMeters >= 10000) return `${(sqMeters / 10000).toFixed(2)} ha`;
    if (sqMeters >= 1000000) return `${(sqMeters / 1000000).toFixed(2)} km²`;
    return `${Math.round(sqMeters)} m²`;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="min-h-screen bg-[#09090B]">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link to="/dashboard" className="flex items-center gap-2" data-testid="logo-link">
              <div className="w-10 h-10 rounded-full bg-[#CCF381] flex items-center justify-center">
                <Target className="w-6 h-6 text-black" />
              </div>
              <span className="font-unbounded font-bold text-xl text-white">Intertia</span>
            </Link>

            <div className="hidden md:flex items-center gap-6">
              <Link
                to="/dashboard"
                className="text-white font-medium hover:text-[#CCF381] transition-colors"
                data-testid="nav-dashboard"
              >
                Dashboard
              </Link>
              <Link
                to="/leaderboards"
                className="text-zinc-400 hover:text-white transition-colors"
                data-testid="nav-leaderboards"
              >
                Leaderboards
              </Link>
              <Link
                to="/groups"
                className="text-zinc-400 hover:text-white transition-colors"
                data-testid="nav-groups"
              >
                Groups
              </Link>
              <Link
                to="/seasons"
                className="text-zinc-400 hover:text-white transition-colors"
                data-testid="nav-seasons"
              >
                Seasons
              </Link>
            </div>

            <div className="flex items-center gap-4">
              <Button
                onClick={() => navigate('/run')}
                className="bg-[#CCF381] text-black hover:bg-[#B8E065] font-bold rounded-full px-6"
                data-testid="start-run-btn"
              >
                <Play className="w-4 h-4 mr-2" />
                Start Run
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-2" data-testid="user-menu-trigger">
                    <Avatar className="w-9 h-9 border-2 border-white/10">
                      <AvatarImage src={user?.picture} />
                      <AvatarFallback className="bg-zinc-800 text-white">
                        {user?.name?.charAt(0) || 'U'}
                      </AvatarFallback>
                    </Avatar>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 bg-zinc-900 border-white/10">
                  <div className="px-3 py-2">
                    <p className="text-sm font-medium text-white">{user?.name}</p>
                    <p className="text-xs text-zinc-500">{user?.email}</p>
                  </div>
                  <DropdownMenuSeparator className="bg-white/10" />
                  <DropdownMenuItem
                    onClick={() => navigate('/profile')}
                    className="text-zinc-300 focus:bg-white/10 focus:text-white cursor-pointer"
                    data-testid="menu-profile"
                  >
                    <Settings className="w-4 h-4 mr-2" />
                    Profile
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={handleLogout}
                    className="text-red-400 focus:bg-red-500/10 focus:text-red-400 cursor-pointer"
                    data-testid="menu-logout"
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    Log out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="pt-24 pb-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Welcome Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <h1 className="font-unbounded text-2xl sm:text-3xl font-bold text-white mb-2">
              Welcome back, {user?.name?.split(' ')[0] || 'Runner'}!
            </h1>
            <p className="text-zinc-400">Ready to claim more territory today?</p>
          </motion.div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="card-glass p-5"
              data-testid="stat-distance"
            >
              <div className="flex items-center justify-between mb-3">
                <TrendingUp className="w-5 h-5 text-[#CCF381]" />
                <span className="text-xs text-zinc-500">Total Distance</span>
              </div>
              <p className="font-unbounded text-2xl font-bold text-white">
                {formatDistance(stats?.total_distance_m || user?.total_distance_m)}
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="card-glass p-5"
              data-testid="stat-area"
            >
              <div className="flex items-center justify-between mb-3">
                <Map className="w-5 h-5 text-[#7000FF]" />
                <span className="text-xs text-zinc-500">Territory</span>
              </div>
              <p className="font-unbounded text-2xl font-bold text-white">
                {formatArea(stats?.total_area_m2 || user?.total_area_m2)}
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="card-glass p-5"
              data-testid="stat-runs"
            >
              <div className="flex items-center justify-between mb-3">
                <Trophy className="w-5 h-5 text-yellow-500" />
                <span className="text-xs text-zinc-500">Total Runs</span>
              </div>
              <p className="font-unbounded text-2xl font-bold text-white">
                {stats?.total_runs || user?.total_runs || 0}
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className="card-glass p-5"
              data-testid="stat-streak"
            >
              <div className="flex items-center justify-between mb-3">
                <Flame className="w-5 h-5 text-orange-500" />
                <span className="text-xs text-zinc-500">Streak</span>
              </div>
              <p className="font-unbounded text-2xl font-bold text-white">
                {stats?.current_streak || user?.current_streak || 0} days
              </p>
            </motion.div>
          </div>

          {/* Main Grid */}
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Recent Runs */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="lg:col-span-2 card-glass p-6"
              data-testid="recent-runs-section"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-unbounded font-semibold text-lg text-white">Recent Runs</h2>
                <Link to="/profile" className="text-[#CCF381] text-sm hover:underline">
                  View all
                </Link>
              </div>

              {recentRuns.length > 0 ? (
                <div className="space-y-4">
                  {recentRuns.map((run, index) => (
                    <div
                      key={run.run_id}
                      className="flex items-center justify-between p-4 rounded-xl bg-zinc-900/50 hover:bg-zinc-800/50 transition-colors"
                      data-testid={`run-item-${index}`}
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-[#CCF381]/10 flex items-center justify-center">
                          <Map className="w-5 h-5 text-[#CCF381]" />
                        </div>
                        <div>
                          <p className="font-medium text-white">
                            {formatDate(run.started_at)}
                          </p>
                          <p className="text-sm text-zinc-500">
                            {run.run_type === 'group' ? 'Group Run' : 'Solo Run'}
                          </p>
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
                  <Button
                    onClick={() => navigate('/run')}
                    className="bg-[#CCF381] text-black hover:bg-[#B8E065] font-semibold rounded-full"
                    data-testid="first-run-btn"
                  >
                    Start First Run
                  </Button>
                </div>
              )}
            </motion.div>

            {/* Right Sidebar */}
            <div className="space-y-6">
              {/* Leaderboard Preview */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35 }}
                className="card-glass p-6"
                data-testid="leaderboard-preview"
              >
                <div className="flex items-center justify-between mb-6">
                  <h2 className="font-unbounded font-semibold text-white">Top Runners</h2>
                  <Link to="/leaderboards" className="text-[#CCF381] text-sm hover:underline">
                    View all
                  </Link>
                </div>

                <div className="space-y-3">
                  {leaderboard.slice(0, 5).map((entry, index) => (
                    <div
                      key={entry.user_id}
                      className="flex items-center gap-3"
                      data-testid={`leaderboard-entry-${index}`}
                    >
                      <span
                        className={`w-6 text-center font-mono font-bold ${
                          index === 0
                            ? 'rank-gold'
                            : index === 1
                            ? 'rank-silver'
                            : index === 2
                            ? 'rank-bronze'
                            : 'text-zinc-500'
                        }`}
                      >
                        {entry.rank}
                      </span>
                      <Avatar className="w-8 h-8">
                        <AvatarImage src={entry.picture} />
                        <AvatarFallback className="bg-zinc-800 text-white text-xs">
                          {entry.name?.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">{entry.name}</p>
                      </div>
                      <p className="text-sm font-mono text-[#CCF381]">{formatArea(entry.value)}</p>
                    </div>
                  ))}
                </div>
              </motion.div>

              {/* Current Season */}
              {currentSeason && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="card-glass p-6 relative overflow-hidden"
                  data-testid="season-preview"
                >
                  <div className="absolute top-0 right-0 w-32 h-32 bg-[#7000FF] rounded-full filter blur-[60px] opacity-20" />
                  <div className="relative">
                    <div className="flex items-center gap-2 mb-3">
                      <Calendar className="w-5 h-5 text-[#7000FF]" />
                      <span className="text-xs text-zinc-500 uppercase tracking-wide">Current Season</span>
                    </div>
                    <h3 className="font-unbounded font-semibold text-white mb-2">{currentSeason.name}</h3>
                    <p className="text-sm text-zinc-400 mb-4">{currentSeason.description}</p>
                    <Link to="/seasons">
                      <Button
                        variant="outline"
                        className="w-full border-white/20 bg-transparent text-white hover:bg-white/10 rounded-xl"
                        data-testid="view-season-btn"
                      >
                        View Season
                        <ChevronRight className="w-4 h-4 ml-2" />
                      </Button>
                    </Link>
                  </div>
                </motion.div>
              )}

              {/* Quick Actions */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.45 }}
                className="card-glass p-6"
              >
                <h2 className="font-unbounded font-semibold text-white mb-4">Quick Actions</h2>
                <div className="space-y-3">
                  <Link to="/groups">
                    <Button
                      variant="outline"
                      className="w-full justify-start border-white/10 bg-transparent text-zinc-300 hover:bg-white/5 hover:text-white rounded-xl"
                      data-testid="quick-groups-btn"
                    >
                      <Users className="w-4 h-4 mr-3 text-[#CCF381]" />
                      Join Group Run
                    </Button>
                  </Link>
                  <Link to="/profile">
                    <Button
                      variant="outline"
                      className="w-full justify-start border-white/10 bg-transparent text-zinc-300 hover:bg-white/5 hover:text-white rounded-xl"
                      data-testid="quick-badges-btn"
                    >
                      <Trophy className="w-4 h-4 mr-3 text-yellow-500" />
                      View Badges
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
