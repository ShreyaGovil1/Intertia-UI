import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Target,
  Map,
  TrendingUp,
  Trophy,
  Flame,
  Calendar,
  Award,
  Star,
  Zap,
  Crown,
  Medal,
  Footprints,
  MapPin,
} from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuthStore } from '@/store/authStore';
import NavBar from '@/components/NavBar';

import { API_BASE } from '@/env';

const API_URL = API_BASE;

const BADGE_ICONS = {
  first_run: Footprints,
  area_100: Map,
  area_1000: Crown,
  area_10000: Trophy,
  distance_5k: TrendingUp,
  distance_marathon: Medal,
  streak_7: Flame,
  streak_30: Zap,
  runs_10: Star,
  runs_100: Award,
};

export default function Profile() {
  const { userId } = useParams();
  const { user: currentUser, token } = useAuthStore();
  const [profile, setProfile] = useState(null);
  const [stats, setStats] = useState(null);
  const [badges, setBadges] = useState([]);
  const [runs, setRuns] = useState([]);
  const [claims, setClaims] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const targetUserId = userId || currentUser?.user_id;
  const isOwnProfile = !userId || userId === currentUser?.user_id;

  useEffect(() => {
    if (targetUserId) {
      fetchProfileData();
    }
  }, [targetUserId]);

  const fetchProfileData = async () => {
    setIsLoading(true);
    try {
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      const [profileRes, statsRes, badgesRes, claimsRes] = await Promise.all([
        fetch(`${API_URL}/users/${targetUserId}`, { headers, credentials: 'include' }),
        fetch(`${API_URL}/users/${targetUserId}/stats`, { headers, credentials: 'include' }),
        fetch(`${API_URL}/badges/user/${targetUserId}`, { headers, credentials: 'include' }),
        fetch(`${API_URL}/claims/user/${targetUserId}`, { headers, credentials: 'include' }),
      ]);

      if (profileRes.ok) setProfile(await profileRes.json());
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
        setRuns(statsData.recent_runs || []);
      }
      if (badgesRes.ok) setBadges(await badgesRes.json());
      if (claimsRes.ok) setClaims(await claimsRes.json());
    } catch (e) {
      console.error('Profile fetch error:', e);
    }
    setIsLoading(false);
  };

  const formatDistance = (meters) => {
    if (!meters) return '0 m';
    if (meters >= 1000) return `${(meters / 1000).toFixed(1)} km`;
    return `${Math.round(meters)} m`;
  };

  const formatArea = (sqMeters) => {
    if (!sqMeters) return '0 m²';
    if (sqMeters >= 10000) return `${(sqMeters / 10000).toFixed(2)} ha`;
    return `${Math.round(sqMeters)} m²`;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
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
          {/* Profile Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="card-glass p-8 mb-8 relative overflow-hidden"
            data-testid="profile-header"
          >
            <div className="absolute top-0 right-0 w-64 h-64 bg-[#7000FF] rounded-full filter blur-[100px] opacity-20" />
            <div className="relative flex flex-col sm:flex-row items-center gap-6">
              <Avatar className="w-24 h-24 border-4 border-[#CCF381]">
                <AvatarImage src={profile?.picture} />
                <AvatarFallback className="bg-zinc-800 text-white text-3xl font-bold">
                  {profile?.name?.charAt(0)}
                </AvatarFallback>
              </Avatar>

              <div className="text-center sm:text-left flex-1">
                <h1 className="font-unbounded text-2xl sm:text-3xl font-bold text-white mb-1">
                  {profile?.name}
                </h1>
                <p className="text-zinc-400">{profile?.email}</p>
                <p className="text-sm text-zinc-500 mt-2">
                  <Calendar className="w-4 h-4 inline mr-1" />
                  Joined {formatDate(profile?.created_at)}
                </p>
              </div>

              {stats?.global_rank && (
                <div className="text-center">
                  <div className="w-16 h-16 rounded-full bg-[#CCF381] flex items-center justify-center mb-2">
                    <span className="font-unbounded font-bold text-black text-xl">#{stats.global_rank}</span>
                  </div>
                  <p className="text-xs text-zinc-500">Global Rank</p>
                </div>
              )}
            </div>
          </motion.div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="card-glass p-5 text-center"
              data-testid="stat-distance"
            >
              <TrendingUp className="w-6 h-6 text-[#CCF381] mx-auto mb-2" />
              <p className="font-unbounded text-xl font-bold text-white">
                {formatDistance(stats?.total_distance_m)}
              </p>
              <p className="text-xs text-zinc-500">Total Distance</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="card-glass p-5 text-center"
              data-testid="stat-area"
            >
              <Map className="w-6 h-6 text-[#7000FF] mx-auto mb-2" />
              <p className="font-unbounded text-xl font-bold text-white">
                {formatArea(stats?.total_area_m2)}
              </p>
              <p className="text-xs text-zinc-500">Territory</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="card-glass p-5 text-center"
              data-testid="stat-runs"
            >
              <Trophy className="w-6 h-6 text-yellow-500 mx-auto mb-2" />
              <p className="font-unbounded text-xl font-bold text-white">{stats?.total_runs || 0}</p>
              <p className="text-xs text-zinc-500">Total Runs</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className="card-glass p-5 text-center"
              data-testid="stat-streak"
            >
              <Flame className="w-6 h-6 text-orange-500 mx-auto mb-2" />
              <p className="font-unbounded text-xl font-bold text-white">
                {stats?.current_streak || 0} days
              </p>
              <p className="text-xs text-zinc-500">Current Streak</p>
            </motion.div>
          </div>

          {/* Tabs */}
          <Tabs defaultValue="badges" className="w-full">
            <TabsList className="grid grid-cols-3 gap-2 bg-transparent p-0 mb-6">
              <TabsTrigger
                value="badges"
                className="data-[state=active]:bg-[#CCF381] data-[state=active]:text-black bg-zinc-900/50 border border-white/5 rounded-xl py-3"
                data-testid="tab-badges"
              >
                <Award className="w-4 h-4 mr-2" />
                Badges
              </TabsTrigger>
              <TabsTrigger
                value="runs"
                className="data-[state=active]:bg-[#CCF381] data-[state=active]:text-black bg-zinc-900/50 border border-white/5 rounded-xl py-3"
                data-testid="tab-runs"
              >
                <TrendingUp className="w-4 h-4 mr-2" />
                Runs
              </TabsTrigger>
              <TabsTrigger
                value="claims"
                className="data-[state=active]:bg-[#CCF381] data-[state=active]:text-black bg-zinc-900/50 border border-white/5 rounded-xl py-3"
                data-testid="tab-claims"
              >
                <MapPin className="w-4 h-4 mr-2" />
                Claims
              </TabsTrigger>
            </TabsList>

            {/* Badges Tab */}
            <TabsContent value="badges">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4"
                data-testid="badges-grid"
              >
                {badges.map((badge, index) => {
                  const Icon = BADGE_ICONS[badge.badge_id] || Award;
                  const isEarned = !!badge.earned_at;
                  return (
                    <motion.div
                      key={badge.badge_id}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: index * 0.05 }}
                      className={`card-glass p-4 text-center group ${
                        isEarned ? '' : 'opacity-40'
                      }`}
                      data-testid={`badge-${badge.badge_id}`}
                    >
                      <div
                        className={`w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-3 ${
                          isEarned
                            ? 'bg-[#CCF381]/20 badge-earned'
                            : 'bg-zinc-800'
                        }`}
                      >
                        <Icon
                          className={`w-7 h-7 ${
                            isEarned ? 'text-[#CCF381]' : 'text-zinc-600'
                          }`}
                        />
                      </div>
                      <p className="font-semibold text-sm text-white mb-1 truncate">{badge.name}</p>
                      <p className="text-xs text-zinc-500 line-clamp-2">{badge.description}</p>
                      {isEarned && (
                        <p className="text-xs text-[#CCF381] mt-2">{formatDate(badge.earned_at)}</p>
                      )}
                    </motion.div>
                  );
                })}
              </motion.div>
            </TabsContent>

            {/* Runs Tab */}
            <TabsContent value="runs">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-3"
                data-testid="runs-list"
              >
                {runs.length > 0 ? (
                  runs.map((run, index) => (
                    <div
                      key={run.run_id}
                      className="card-glass p-4 flex items-center justify-between"
                      data-testid={`run-${index}`}
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-[#CCF381]/10 flex items-center justify-center">
                          <Map className="w-6 h-6 text-[#CCF381]" />
                        </div>
                        <div>
                          <p className="font-semibold text-white">{formatDate(run.started_at)}</p>
                          <p className="text-sm text-zinc-500">
                            {run.run_type === 'group' ? 'Group Run' : 'Solo Run'} •{' '}
                            {run.status}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-mono font-bold text-white">
                          {formatDistance(run.distance_m)}
                        </p>
                        <p className="text-sm text-[#7000FF]">{formatArea(run.area_claimed_m2)}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-12">
                    <TrendingUp className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
                    <p className="text-zinc-500">No runs recorded yet</p>
                  </div>
                )}
              </motion.div>
            </TabsContent>

            {/* Claims Tab */}
            <TabsContent value="claims">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-3"
                data-testid="claims-list"
              >
                {claims.length > 0 ? (
                  claims.map((claim, index) => (
                    <div
                      key={claim.claim_id}
                      className="card-glass p-4 flex items-center justify-between"
                      data-testid={`claim-${index}`}
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-[#7000FF]/10 flex items-center justify-center">
                          <MapPin className="w-6 h-6 text-[#7000FF]" />
                        </div>
                        <div>
                          <p className="font-semibold text-white">Territory Claim</p>
                          <p className="text-sm text-zinc-500">{formatDate(claim.created_at)}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-mono font-bold text-[#CCF381]">
                          {formatArea(claim.area_m2)}
                        </p>
                        {claim.decay_percent > 0 && (
                          <p className="text-sm text-red-400">{claim.decay_percent}% decay</p>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-12">
                    <MapPin className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
                    <p className="text-zinc-500">No territory claimed yet</p>
                  </div>
                )}
              </motion.div>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}
