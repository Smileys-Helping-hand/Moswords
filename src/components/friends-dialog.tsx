"use client";

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { UserPlus, Users, UserCheck, UserX, Clock, Trash2, MessageSquare } from 'lucide-react';
import { Button } from './ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from './ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { motion, AnimatePresence } from 'framer-motion';
import UserAvatar from './user-avatar';
import { ScrollArea } from './ui/scroll-area';
import AddContactDialog from '@/components/add-contact-dialog';

interface Friend {
  id: string;
  userId: string;
  friendId: string;
  status: string;
  createdAt: Date;
  friend?: {
    id: string;
    email: string;
    name: string | null;
    displayName: string | null;
    photoURL: string | null;
    customStatus: string | null;
    lastSeen: string | null;
  };
  requester?: {
    id: string;
    email: string;
    name: string | null;
    displayName: string | null;
    photoURL: string | null;
    customStatus: string | null;
    lastSeen: string | null;
  };
}

export default function FriendsDialog() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [pendingRequests, setPendingRequests] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const fetchFriends = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/friends');
      if (!response.ok) throw new Error('Failed to fetch friends');
      const data = await response.json();
      // Remove duplicate friends by friendId (defensive)
      const uniqueFriends: Friend[] = [];
      const seen = new Set<string>();
      for (const f of data.friends.filter((f: Friend) => f.status === 'accepted')) {
        const key = f.friendId;
        if (seen.has(key)) continue;
        seen.add(key);
        uniqueFriends.push(f);
      }
      setFriends(uniqueFriends);
      setPendingRequests(data.pendingRequests);
    } catch (error) {
      console.error('Error fetching friends:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load friends',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (isOpen) {
      fetchFriends();
    }
  }, [isOpen, fetchFriends]);

  const handleAcceptRequest = async (friendshipId: string) => {
    try {
      const response = await fetch(`/api/friends/${friendshipId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'accept' }),
      });

      if (!response.ok) throw new Error('Failed to accept request');

      toast({
        title: 'Friend added!',
        description: 'Friend request accepted',
      });

      fetchFriends();
    } catch (error) {
      console.error('Error accepting request:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to accept friend request',
      });
    }
  };

  const handleRejectRequest = async (friendshipId: string) => {
    try {
      const response = await fetch(`/api/friends/${friendshipId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reject' }),
      });

      if (!response.ok) throw new Error('Failed to reject request');

      toast({
        title: 'Request rejected',
        description: 'Friend request rejected',
      });

      fetchFriends();
    } catch (error) {
      console.error('Error rejecting request:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to reject friend request',
      });
    }
  };

  const handleRemoveFriend = async (friendshipId: string) => {
    try {
      const response = await fetch(`/api/friends/${friendshipId}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to remove friend');

      toast({
        title: 'Friend removed',
        description: 'Friend has been removed from your list',
      });

      fetchFriends();
    } catch (error) {
      console.error('Error removing friend:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to remove friend',
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="relative w-9 h-9 hover:bg-white/10">
          <Users className="w-5 h-5" />
          {pendingRequests.length > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center">
              {pendingRequests.length}
            </span>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="glass-card border-white/20 w-[95vw] max-w-2xl max-h-[85vh] p-4 sm:p-6">
        <DialogHeader className="pb-2">
          <DialogTitle className="text-gradient flex items-center gap-2 text-lg">
            <Users className="w-5 h-5" />
            Friends
          </DialogTitle>
          <DialogDescription className="text-sm">
            Manage your friends and friend requests
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="all" className="w-full">
          <TabsList className="glass-card w-full grid grid-cols-3 h-auto p-1">
            <TabsTrigger value="all" className="text-xs sm:text-sm py-2 px-1 sm:px-3 flex flex-col sm:flex-row items-center gap-1">
              <UserCheck className="w-4 h-4" />
              <span className="hidden sm:inline">All</span> ({friends.length})
            </TabsTrigger>
            <TabsTrigger value="pending" className="text-xs sm:text-sm py-2 px-1 sm:px-3 flex flex-col sm:flex-row items-center gap-1">
              <Clock className="w-4 h-4" />
              <span className="hidden sm:inline">Pending</span> ({pendingRequests.length})
            </TabsTrigger>
            <TabsTrigger value="add" className="text-xs sm:text-sm py-2 px-1 sm:px-3 flex flex-col sm:flex-row items-center gap-1">
              <UserPlus className="w-4 h-4" />
              <span>Add</span>
            </TabsTrigger>
          </TabsList>

          <ScrollArea className="h-[50vh] sm:h-[400px] mt-4">
            <TabsContent value="all" className="space-y-2 mt-0">
              {loading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-16 glass-card rounded-lg animate-pulse" />
                  ))}
                </div>
              ) : friends.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No friends yet</p>
                  <p className="text-xs mt-1">Add someone to get started!</p>
                </div>
              ) : (
                <AnimatePresence>
                  {friends.map((friend) => (
                    <motion.div
                      key={friend.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      className="glass-card p-3 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <UserAvatar
                          src={friend.friend?.photoURL || ''}
                          fallback={(friend.friend?.displayName || friend.friend?.email || 'U').substring(0, 2).toUpperCase()}
                          status={friend.friend?.lastSeen === 'online' ? 'online' : 'offline'}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">
                            {friend.friend?.displayName || friend.friend?.name || 'User'}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">{friend.friend?.email}</p>
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-primary"
                            onClick={() => {
                              if (friend.friend?.id) {
                                router.push(`/dm/${friend.friend.id}`);
                                setIsOpen(false);
                              }
                            }}
                          >
                            <MessageSquare className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive"
                            onClick={() => handleRemoveFriend(friend.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              )}
            </TabsContent>

            <TabsContent value="pending" className="space-y-2 mt-0">
              {loading ? (
                <div className="space-y-2">
                  {[1, 2].map((i) => (
                    <div key={i} className="h-16 glass-card rounded-lg animate-pulse" />
                  ))}
                </div>
              ) : pendingRequests.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Clock className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No pending requests</p>
                </div>
              ) : (
                <AnimatePresence>
                  {pendingRequests.map((request) => (
                    <motion.div
                      key={request.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      className="glass-card p-3 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <UserAvatar
                          src={request.requester?.photoURL || ''}
                          fallback={(request.requester?.displayName || request.requester?.email || 'U').substring(0, 2).toUpperCase()}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">
                            {request.requester?.displayName || request.requester?.name || 'User'}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {request.requester?.email}
                          </p>
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <Button
                            size="icon"
                            className="h-8 w-8 bg-green-500/20 text-green-400 hover:bg-green-500/30"
                            onClick={() => handleAcceptRequest(request.id)}
                          >
                            <UserCheck className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive"
                            onClick={() => handleRejectRequest(request.id)}
                          >
                            <UserX className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              )}
            </TabsContent>

            <TabsContent value="add" className="mt-0">
              <div className="py-4">
                <AddContactDialog />
              </div>
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
