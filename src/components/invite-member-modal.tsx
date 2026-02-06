"use client";

import { useState, useEffect } from 'react';
import { UserPlus, Check, Loader2, Search } from 'lucide-react';
import { Button } from './ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from './ui/dialog';
import { Input } from './ui/input';
import { useToast } from '@/hooks/use-toast';
import { motion, AnimatePresence } from 'framer-motion';
import UserAvatar from './user-avatar';

interface Friend {
  id: string;
  friendId: string;
  status: string;
  friend: {
    id: string;
    email: string;
    displayName: string | null;
    photoURL: string | null;
  };
}

interface InviteMemberModalProps {
  serverId: string;
  trigger?: React.ReactNode;
}

export default function InviteMemberModal({ serverId, trigger }: InviteMemberModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [addingMembers, setAddingMembers] = useState<Set<string>>(new Set());
  const [addedMembers, setAddedMembers] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      fetchFriends();
    }
  }, [isOpen]);

  const fetchFriends = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/friends');
      if (!response.ok) throw new Error('Failed to fetch friends');
      const data = await response.json();
      // Filter for accepted friends only
      setFriends(data.friends.filter((f: Friend) => f.status === 'accepted'));
    } catch (error) {
      console.error('Error fetching friends:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load friends list',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddMember = async (friendId: string) => {
    setAddingMembers(prev => new Set(prev).add(friendId));
    
    try {
      const response = await fetch(`/api/servers/${serverId}/members`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: friendId }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to add member');
      }

      setAddedMembers(prev => new Set(prev).add(friendId));
      
      toast({
        title: 'Success!',
        description: 'Friend added to server',
      });
    } catch (error: any) {
      console.error('Error adding member:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to add member to server',
      });
    } finally {
      setAddingMembers(prev => {
        const newSet = new Set(prev);
        newSet.delete(friendId);
        return newSet;
      });
    }
  };

  const filteredFriends = friends.filter(friend =>
    friend.friend.displayName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    friend.friend.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button 
            variant="ghost" 
            size="sm"
            className="gap-2 hover:bg-white/10"
          >
            <UserPlus className="w-4 h-4" />
            Invite People
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="glass-card border-white/20 sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-gradient">Invite Members</DialogTitle>
          <DialogDescription>
            Add your friends to this server
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search friends..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="glass-card border-white/20 pl-10"
            />
          </div>

          <div className="max-h-[400px] overflow-y-auto space-y-2">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : filteredFriends.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {searchQuery ? 'No friends match your search' : 'No friends available to invite'}
              </div>
            ) : (
              <AnimatePresence>
                {filteredFriends.map((friend) => {
                  const isAdding = addingMembers.has(friend.friend.id);
                  const isAdded = addedMembers.has(friend.friend.id);

                  return (
                    <motion.div
                      key={friend.friend.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="flex items-center justify-between p-3 glass-card border border-white/10 rounded-lg hover:border-white/20 transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <UserAvatar
                          src={friend.friend.photoURL || undefined}
                          alt={friend.friend.displayName || friend.friend.email}
                          size="sm"
                        />
                        <div>
                          <p className="font-medium">
                            {friend.friend.displayName || 'Anonymous'}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {friend.friend.email}
                          </p>
                        </div>
                      </div>

                      <Button
                        size="sm"
                        onClick={() => handleAddMember(friend.friend.id)}
                        disabled={isAdding || isAdded}
                        className={isAdded 
                          ? "bg-green-500/20 text-green-400 hover:bg-green-500/20" 
                          : "bg-primary/20 hover:bg-primary/30"
                        }
                      >
                        {isAdding ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : isAdded ? (
                          <>
                            <Check className="w-4 h-4 mr-1" />
                            Added
                          </>
                        ) : (
                          <>
                            <UserPlus className="w-4 h-4 mr-1" />
                            Add
                          </>
                        )}
                      </Button>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
