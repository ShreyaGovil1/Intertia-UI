import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Calendar,
  Trophy,
  Gift,
  Clock,
  TrendingUp,
  Medal,
  Crown,
  Star,
} from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { useAuthStore } from '@/store/authStore';
import NavBar from '@/components/NavBar';

import { API_BASE } from '@/env';

const API_URL = API_BASE;

export default function Seasons() {
  const { user, token } = useAuthStore();
  const [currentSeason, setCurrentSeason] = useState(null);
  const [pastSeasons, setPastSeasons] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchSeasons();
  }, []);

  const fetchSeasons = async () => {
    setIsLoading(true);
    try {
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      const [currentRes, pastRes] = await Promise.all([
        fetch(`${API_URL}/seasons/current`, { headers, credentials: 'include' }),
        fetch(`${API_URL}/seasons`, { headers, credentials: 'include' }),
      ]);

      if (currentRes.ok) setCurrentSeason(await currentRes.json());
      if (pastRes.ok) setPastSeasons(await pastRes.json());
    } catch (e) {
      console.error('Seasons fetch error:', e);
    }
    setIsLoading(false);
  };

  const formatArea = (sqMeters) => {
    if (!sqMeters) return '0 m²';
    if (sqMeters >= 10000) return `${(sqMeters / 10000).toFixed(2)} ha`;
    return `${Math.round(sqMeters)} m²`;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getSeasonProgress = () => {
    if (!currentSeason) return 0;
    const start = new Date(currentSeason.start_date);
    const end = new Date(currentSeason.end_date);
    const now = new Date();
    const total = end - start;
    const elapsed = now - start;
    return Math.min(Math.max((elapsed / total) * 100, 0), 100);
  };

  const getDaysRemaining = () => {
    if (!currentSeason) return 0;
    const end = new Date(currentSeason.end_date);
    const now = new Date();
    const diff = end - now;
    return Math.max(Math.ceil(diff / (1000 * 60 * 60 * 24)), 0);
  };

  const getRankIcon = (rank) => {
    switch (rank) {
      case 1:
        return <Crown className="w-5 h-5 text-yellow-500" />;
      case 2:
        return <Medal className="w-5 h-5 text-zinc-400" />;
      case 3:
        return <Medal className="w-5 h-5 text-orange-600" />;
      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#09090B]">
        <NavBar />
        <div className="pt-24 flex items-center justify-center">
          <div className="w-12 h-12 border-4 border-[#CCF381] border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#09090B]">
      <NavBar />

      <main className="pt-24 pb-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-8"
          >
            <div className="w-16 h-16 rounded-full bg-[#7000FF]/20 flex items-center justify-center mx-auto mb-4">
              <Calendar className="w-8 h-8 text-[#7000FF]" />
            </div>
            <h1 className="font-unbounded text-3xl font-bold text-white mb-2">Seasons & Events</h1>
            <p className="text-zinc-400">Compete for seasonal rewards and eternal glory</p>
          </motion.div>

          {/* Current Season */}
          {currentSeason && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="card-glass p-8 mb-8 relative overflow-hidden"
              data-testid="current-season"
            >
              <div className="absolute top-0 right-0 w-64 h-64 bg-[#7000FF] rounded-full filter blur-[100px] opacity-30" />
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-[#CCF381] rounded-full filter blur-[80px] opacity-10" />

              <div className="relative">
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <span className="text-xs text-[#CCF381] uppercase tracking-wider font-semibold">Current Season</span>
                    <h2 className="font-unbounded text-2xl font-bold text-white mt-1">
                      {currentSeason.name}
                    </h2>
                    <p className="text-zinc-400 mt-2">{currentSeason.description}</p>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-2 text-zinc-400">
                      <Clock className="w-4 h-4" />
                      <span className="text-sm">{getDaysRemaining()} days left</span>
                    </div>
                    <p className="text-xs text-zinc-500 mt-1">
                      {formatDate(currentSeason.start_date)} - {formatDate(currentSeason.end_date)}
                    </p>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="mb-8">
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-zinc-500">Season Progress</span>
                    <span className="text-white font-mono">{getSeasonProgress().toFixed(0)}%</span>
                  </div>
                  <Progress
                    value={getSeasonProgress()}
                    className="h-2 bg-zinc-800"
                  />
                </div>

                {/* Prizes */}
                <div className="mb-8">
                  <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
                    <Gift className="w-5 h-5 text-[#CCF381]" />
                    Season Prizes
                  </h3>
                  <div className="grid grid-cols-3 gap-4">
                    {currentSeason.prizes?.map((prize, i) => (
                      <div
                        key={i}
                        className={`p-4 rounded-xl border text-center ${
                          i === 0
                            ? 'bg-yellow-500/10 border-yellow-500/30'
                            : i === 1
                            ? 'bg-zinc-400/10 border-zinc-400/30'
                            : 'bg-orange-600/10 border-orange-600/30'
                        }`}
                        data-testid={`prize-${i}`}
                      >
                        {getRankIcon(prize.rank)}
                        <p className="font-semibold text-white mt-2">{prize.name}</p>
                        <p className="text-xs text-zinc-500">Rank #{prize.rank}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Leaderboard */}
                <div>
                  <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-yellow-500" />
                    Season Leaderboard
                  </h3>
                  <div className="space-y-3">
                    {currentSeason.leaderboard?.slice(0, 5).map((entry, index) => (
                      <div
                        key={entry.user_id}
                        className={`flex items-center gap-4 p-3 rounded-xl ${
                          entry.user_id === user?.user_id
                            ? 'bg-[#CCF381]/10 border border-[#CCF381]/30'
                            : 'bg-zinc-900/50'
                        }`}
                        data-testid={`season-rank-${index}`}
                      >
                        <div className="w-8 text-center">
                          {entry.rank <= 3 ? (
                            getRankIcon(entry.rank)
                          ) : (
                            <span className="font-mono font-bold text-zinc-500">{entry.rank}</span>
                          )}
                        </div>
                        <Avatar className="w-10 h-10">
                          <AvatarImage src={entry.picture} />
                          <AvatarFallback className="bg-zinc-800 text-white">
                            {entry.name?.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <p className="font-medium text-white">
                            {entry.name}
                            {entry.user_id === user?.user_id && (
                              <span className="ml-2 text-xs text-[#CCF381]">(You)</span>
                            )}
                          </p>
                        </div>
                        <p className="font-mono font-bold text-[#CCF381]">
                          {formatArea(entry.value)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* How It Works */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="card-glass p-6 mb-8"
          >
            <h3 className="font-unbounded font-semibold text-white mb-4">How Seasons Work</h3>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="w-12 h-12 rounded-full bg-[#CCF381]/10 flex items-center justify-center mx-auto mb-3">
                  <TrendingUp className="w-6 h-6 text-[#CCF381]" />
                </div>
                <h4 className="font-semibold text-white mb-1">Run & Capture</h4>
                <p className="text-sm text-zinc-500">Every territory you claim during the season counts towards your ranking</p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 rounded-full bg-[#7000FF]/10 flex items-center justify-center mx-auto mb-3">
                  <Trophy className="w-6 h-6 text-[#7000FF]" />
                </div>
                <h4 className="font-semibold text-white mb-1">Climb Rankings</h4>
                <p className="text-sm text-zinc-500">Compete with runners worldwide to reach the top of the leaderboard</p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 rounded-full bg-yellow-500/10 flex items-center justify-center mx-auto mb-3">
                  <Star className="w-6 h-6 text-yellow-500" />
                </div>
                <h4 className="font-semibold text-white mb-1">Win Rewards</h4>
                <p className="text-sm text-zinc-500">Top runners earn exclusive badges and recognition at season end</p>
              </div>
            </div>
          </motion.div>

          {/* Past Seasons */}
          {pastSeasons.length > 1 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <h3 className="font-unbounded font-semibold text-white mb-4">Past Seasons</h3>
              <div className="space-y-3">
                {pastSeasons
                  .filter((s) => s.season_id !== currentSeason?.season_id)
                  .map((season, index) => (
                    <div
                      key={season.season_id}
                      className="card-glass p-4 flex items-center justify-between"
                      data-testid={`past-season-${index}`}
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-zinc-800 flex items-center justify-center">
                          <Calendar className="w-6 h-6 text-zinc-500" />
                        </div>
                        <div>
                          <p className="font-semibold text-white">{season.name}</p>
                          <p className="text-sm text-zinc-500">
                            {formatDate(season.start_date)} - {formatDate(season.end_date)}
                          </p>
                        </div>
                      </div>
                      <span className="text-xs text-zinc-600 bg-zinc-800 px-3 py-1 rounded-full">Ended</span>
                    </div>
                  ))}
              </div>
            </motion.div>
          )}
        </div>
      </main>
    </div>
  );
}
