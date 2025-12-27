import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Target,
  Trophy,
  Map,
  TrendingUp,
  Flame,
  Medal,
  ChevronDown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuthStore } from '@/store/authStore';
import NavBar from '@/components/NavBar';

import { API_BASE } from '@/env';

const API_URL = API_BASE;

export default function Leaderboards() {
  const { user, token } = useAuthStore();
  const [metric, setMetric] = useState('area');
  const [leaderboard, setLeaderboard] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [userRank, setUserRank] = useState(null);

  useEffect(() => {
    fetchLeaderboard();
  }, [metric]);

  const fetchLeaderboard = async () => {
    setIsLoading(true);
    try {
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const response = await fetch(`${API_URL}/leaderboards/${metric}?limit=50`, {
        headers,
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setLeaderboard(data);
        
        // Find user's rank
        const userEntry = data.find((e) => e.user_id === user?.user_id);
        setUserRank(userEntry?.rank || null);
      }
    } catch (e) {
      console.error('Leaderboard fetch error:', e);
    }
    setIsLoading(false);
  };

  const formatValue = (value, metricType) => {
    switch (metricType) {
      case 'area':
        if (value >= 10000) return `${(value / 10000).toFixed(2)} ha`;
        return `${Math.round(value)} m²`;
      case 'distance':
        if (value >= 1000) return `${(value / 1000).toFixed(1)} km`;
        return `${Math.round(value)} m`;
      case 'streak':
        return `${value} days`;
      case 'runs':
        return `${value} runs`;
      default:
        return value;
    }
  };

  const getMetricIcon = (metricType) => {
    switch (metricType) {
      case 'area':
        return <Map className="w-4 h-4" />;
      case 'distance':
        return <TrendingUp className="w-4 h-4" />;
      case 'streak':
        return <Flame className="w-4 h-4" />;
      case 'runs':
        return <Trophy className="w-4 h-4" />;
      default:
        return null;
    }
  };

  const getRankStyle = (rank) => {
    if (rank === 1) return 'rank-gold';
    if (rank === 2) return 'rank-silver';
    if (rank === 3) return 'rank-bronze';
    return 'text-zinc-500';
  };

  const getRankBg = (rank) => {
    if (rank === 1) return 'bg-yellow-500/10 border-yellow-500/30';
    if (rank === 2) return 'bg-zinc-400/10 border-zinc-400/30';
    if (rank === 3) return 'bg-orange-600/10 border-orange-600/30';
    return 'bg-zinc-900/50';
  };

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
            <div className="w-16 h-16 rounded-full bg-[#CCF381]/10 flex items-center justify-center mx-auto mb-4">
              <Trophy className="w-8 h-8 text-[#CCF381]" />
            </div>
            <h1 className="font-unbounded text-3xl font-bold text-white mb-2">Leaderboards</h1>
            <p className="text-zinc-400">See who's dominating the territory race</p>
          </motion.div>

          {/* User's Rank Card */}
          {userRank && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="card-glass p-6 mb-8"
              data-testid="user-rank-card"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-[#CCF381] flex items-center justify-center">
                    <span className="font-unbounded font-bold text-black text-lg">#{userRank}</span>
                  </div>
                  <div>
                    <p className="text-zinc-400 text-sm">Your Global Rank</p>
                    <p className="font-semibold text-white">
                      by {metric.charAt(0).toUpperCase() + metric.slice(1)}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm text-zinc-500">Keep running to climb!</p>
                </div>
              </div>
            </motion.div>
          )}

          {/* Metric Tabs */}
          <Tabs value={metric} onValueChange={setMetric} className="mb-6">
            <TabsList className="grid grid-cols-4 gap-2 bg-transparent p-0">
              <TabsTrigger
                value="area"
                className="data-[state=active]:bg-[#CCF381] data-[state=active]:text-black bg-zinc-900/50 border border-white/5 rounded-xl py-3"
                data-testid="tab-area"
              >
                <Map className="w-4 h-4 mr-2" />
                Area
              </TabsTrigger>
              <TabsTrigger
                value="distance"
                className="data-[state=active]:bg-[#CCF381] data-[state=active]:text-black bg-zinc-900/50 border border-white/5 rounded-xl py-3"
                data-testid="tab-distance"
              >
                <TrendingUp className="w-4 h-4 mr-2" />
                Distance
              </TabsTrigger>
              <TabsTrigger
                value="streak"
                className="data-[state=active]:bg-[#CCF381] data-[state=active]:text-black bg-zinc-900/50 border border-white/5 rounded-xl py-3"
                data-testid="tab-streak"
              >
                <Flame className="w-4 h-4 mr-2" />
                Streak
              </TabsTrigger>
              <TabsTrigger
                value="runs"
                className="data-[state=active]:bg-[#CCF381] data-[state=active]:text-black bg-zinc-900/50 border border-white/5 rounded-xl py-3"
                data-testid="tab-runs"
              >
                <Trophy className="w-4 h-4 mr-2" />
                Runs
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Leaderboard List */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="space-y-3"
            data-testid="leaderboard-list"
          >
            {isLoading ? (
              // Loading skeletons
              Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className="skeleton h-20 rounded-xl" />
              ))
            ) : leaderboard.length > 0 ? (
              leaderboard.map((entry, index) => (
                <motion.div
                  key={entry.user_id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.03 }}
                  className={`flex items-center gap-4 p-4 rounded-xl border ${getRankBg(
                    entry.rank
                  )} ${entry.user_id === user?.user_id ? 'ring-2 ring-[#CCF381]' : ''}`}
                  data-testid={`leaderboard-row-${index}`}
                >
                  <div className="w-12 text-center">
                    {entry.rank <= 3 ? (
                      <Medal
                        className={`w-8 h-8 mx-auto ${
                          entry.rank === 1
                            ? 'text-yellow-500'
                            : entry.rank === 2
                            ? 'text-zinc-400'
                            : 'text-orange-600'
                        }`}
                      />
                    ) : (
                      <span className={`font-mono font-bold text-xl ${getRankStyle(entry.rank)}`}>
                        {entry.rank}
                      </span>
                    )}
                  </div>

                  <Avatar className="w-12 h-12 border-2 border-white/10">
                    <AvatarImage src={entry.picture} />
                    <AvatarFallback className="bg-zinc-800 text-white">
                      {entry.name?.charAt(0)}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-white truncate">
                      {entry.name}
                      {entry.user_id === user?.user_id && (
                        <span className="ml-2 text-xs text-[#CCF381]">(You)</span>
                      )}
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="font-mono text-lg font-bold text-[#CCF381]">
                      {formatValue(entry.value, metric)}
                    </p>
                  </div>
                </motion.div>
              ))
            ) : (
              <div className="text-center py-12">
                <Trophy className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
                <p className="text-zinc-500">No data yet. Start running to appear on the leaderboard!</p>
              </div>
            )}
          </motion.div>
        </div>
      </main>
    </div>
  );
}
