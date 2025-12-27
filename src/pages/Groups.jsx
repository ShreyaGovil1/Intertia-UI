import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Users, Plus, Play, Clock, UserPlus, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { useAuthStore } from '@/store/authStore';
import { toast } from 'sonner';
import NavBar from '@/components/NavBar';

import { API_BASE } from '@/env';

const API_URL = API_BASE;

export default function Groups() {
  const navigate = useNavigate();
  const { user, token } = useAuthStore();
  const [groups, setGroups] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newGroupName, setNewGroupName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    fetchGroups();
  }, []);

  const fetchGroups = async () => {
    setIsLoading(true);
    try {
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const response = await fetch(`${API_URL}/groups?status=waiting`, {
        headers,
        credentials: 'include',
      });
      if (response.ok) {
        setGroups(await response.json());
      }
    } catch (e) {
      console.error('Groups fetch error:', e);
    }
    setIsLoading(false);
  };

  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) {
      toast.error('Please enter a group name');
      return;
    }

    setIsCreating(true);
    try {
      const headers = {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      };

      const response = await fetch(`${API_URL}/groups?name=${encodeURIComponent(newGroupName)}`, {
        method: 'POST',
        headers,
        credentials: 'include',
      });

      if (response.ok) {
        const group = await response.json();
        toast.success('Group created!');
        setNewGroupName('');
        setDialogOpen(false);
        fetchGroups();
      } else {
        const error = await response.json();
        toast.error(error.detail || 'Failed to create group');
      }
    } catch (e) {
      toast.error('Failed to create group');
    }
    setIsCreating(false);
  };

  const handleJoinGroup = async (groupId) => {
    try {
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const response = await fetch(`${API_URL}/groups/${groupId}/join`, {
        method: 'POST',
        headers,
        credentials: 'include',
      });

      if (response.ok) {
        toast.success('Joined group!');
        fetchGroups();
      } else {
        const error = await response.json();
        toast.error(error.detail || 'Failed to join group');
      }
    } catch (e) {
      toast.error('Failed to join group');
    }
  };

  const handleStartGroup = async (groupId) => {
    try {
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const response = await fetch(`${API_URL}/groups/${groupId}/start`, {
        method: 'POST',
        headers,
        credentials: 'include',
      });

      if (response.ok) {
        toast.success('Group run started!');
        navigate('/run', { state: { groupId } });
      } else {
        const error = await response.json();
        toast.error(error.detail || 'Failed to start group');
      }
    } catch (e) {
      toast.error('Failed to start group');
    }
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
            className="flex items-center justify-between mb-8"
          >
            <div>
              <h1 className="font-unbounded text-3xl font-bold text-white mb-2">Group Runs</h1>
              <p className="text-zinc-400">Team up with friends to capture more territory</p>
            </div>

            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button
                  className="bg-[#CCF381] text-black hover:bg-[#B8E065] font-bold rounded-full"
                  data-testid="create-group-btn"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create Group
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-zinc-900 border-white/10">
                <DialogHeader>
                  <DialogTitle className="font-unbounded text-white">Create Group Run</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <Input
                    value={newGroupName}
                    onChange={(e) => setNewGroupName(e.target.value)}
                    placeholder="Group name (e.g., Morning Runners)"
                    className="h-12 bg-zinc-800 border-white/10 text-white placeholder:text-zinc-500 rounded-xl"
                    data-testid="group-name-input"
                  />
                  <Button
                    onClick={handleCreateGroup}
                    disabled={isCreating}
                    className="w-full bg-[#CCF381] text-black hover:bg-[#B8E065] font-bold rounded-xl h-12"
                    data-testid="confirm-create-btn"
                  >
                    {isCreating ? (
                      <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                    ) : (
                      'Create & Invite Friends'
                    )}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </motion.div>

          {/* Groups List */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="space-y-4"
            data-testid="groups-list"
          >
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="skeleton h-28 rounded-2xl" />
              ))
            ) : groups.length > 0 ? (
              groups.map((group, index) => {
                const isCreator = group.creator_id === user?.user_id;
                const isMember = group.members?.includes(user?.user_id);

                return (
                  <motion.div
                    key={group.group_id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="card-glass p-6"
                    data-testid={`group-${index}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-xl bg-[#7000FF]/20 flex items-center justify-center">
                          <Users className="w-7 h-7 text-[#7000FF]" />
                        </div>
                        <div>
                          <h3 className="font-unbounded font-semibold text-lg text-white">
                            {group.name}
                          </h3>
                          <div className="flex items-center gap-4 mt-1">
                            <span className="text-sm text-zinc-400">
                              <Users className="w-4 h-4 inline mr-1" />
                              {group.members?.length || 0}/{group.max_members} members
                            </span>
                            <span className="text-sm text-zinc-500">
                              <Clock className="w-4 h-4 inline mr-1" />
                              Waiting to start
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        {isMember ? (
                          <span className="text-sm text-[#CCF381] flex items-center gap-1">
                            <Check className="w-4 h-4" />
                            Joined
                          </span>
                        ) : (
                          <Button
                            onClick={() => handleJoinGroup(group.group_id)}
                            variant="outline"
                            className="border-white/20 bg-transparent text-white hover:bg-white/10 rounded-full"
                            data-testid={`join-group-${index}`}
                          >
                            <UserPlus className="w-4 h-4 mr-2" />
                            Join
                          </Button>
                        )}

                        {isCreator && (
                          <Button
                            onClick={() => handleStartGroup(group.group_id)}
                            className="bg-[#CCF381] text-black hover:bg-[#B8E065] font-bold rounded-full"
                            data-testid={`start-group-${index}`}
                          >
                            <Play className="w-4 h-4 mr-2" />
                            Start Run
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Members preview */}
                    {group.members?.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-white/5">
                        <p className="text-xs text-zinc-500 mb-2">Members</p>
                        <div className="flex -space-x-2">
                          {group.members.slice(0, 5).map((memberId, i) => (
                            <Avatar key={i} className="w-8 h-8 border-2 border-zinc-900">
                              <AvatarFallback className="bg-zinc-800 text-white text-xs">
                                {memberId.slice(-2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                          ))}
                          {group.members.length > 5 && (
                            <div className="w-8 h-8 rounded-full bg-zinc-800 border-2 border-zinc-900 flex items-center justify-center">
                              <span className="text-xs text-zinc-400">+{group.members.length - 5}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </motion.div>
                );
              })
            ) : (
              <div className="text-center py-16">
                <div className="w-20 h-20 rounded-full bg-zinc-900 flex items-center justify-center mx-auto mb-4">
                  <Users className="w-10 h-10 text-zinc-700" />
                </div>
                <h3 className="font-unbounded font-semibold text-white mb-2">No Active Groups</h3>
                <p className="text-zinc-500 mb-6">Be the first to create a group run!</p>
                <Button
                  onClick={() => setDialogOpen(true)}
                  className="bg-[#CCF381] text-black hover:bg-[#B8E065] font-bold rounded-full"
                  data-testid="create-first-group-btn"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create Group
                </Button>
              </div>
            )}
          </motion.div>
        </div>
      </main>
    </div>
  );
}
