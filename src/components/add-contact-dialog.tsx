"use client";

import { useState } from 'react';
import { motion } from 'framer-motion';
import { UserPlus, Search, Loader2 } from 'lucide-react';
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
import { Label } from './ui/label';
import { useToast } from '@/hooks/use-toast';
import UserAvatar from './user-avatar';

interface User {
  id: string;
  email: string;
  name: string | null;
  displayName: string | null;
  photoURL: string | null;
  customStatus: string | null;
}

export default function AddContactDialog() {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sendingFriendRequest, setSendingFriendRequest] = useState(false);
  const { toast } = useToast();

  const handleSearch = async () => {
    if (!searchQuery.trim() || searchQuery.trim().length < 2) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Please enter at least 2 characters to search',
      });
      return;
    }

    setSearching(true);
    try {
      const response = await fetch(`/api/users/search?q=${encodeURIComponent(searchQuery.trim())}`);
      if (!response.ok) throw new Error('Failed to search users');
      const data = await response.json();
      setSearchResults(data.users);
      
      if (data.users.length === 0) {
        toast({
          title: 'No results',
          description: 'No users found matching your search',
        });
      }
    } catch (error) {
      console.error('Error searching users:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to search users. Please try again.',
      });
    } finally {
      setSearching(false);
    }
  };

  const handleSendMessage = async () => {
    if (!selectedUser) return;
    
    if (!message.trim()) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Please enter a message',
      });
      return;
    }

    setSending(true);
    try {
      const response = await fetch('/api/direct-messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          receiverId: selectedUser.id,
          content: message.trim(),
        }),
      });

      if (!response.ok) throw new Error('Failed to send message');

      toast({
        title: 'Success!',
        description: `Message sent to ${selectedUser.displayName || selectedUser.name || selectedUser.email}`,
      });

      setIsOpen(false);
      resetState();
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to send message. Please try again.',
      });
    } finally {
      setSending(false);
    }
  };

  const handleSendFriendRequest = async () => {
    if (!selectedUser) return;

    setSendingFriendRequest(true);
    try {
      const response = await fetch('/api/friends', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          friendId: selectedUser.id,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to send friend request');
      }

      toast({
        title: 'Friend request sent!',
        description: `Request sent to ${selectedUser.displayName || selectedUser.name || selectedUser.email}`,
      });

      setIsOpen(false);
      resetState();
    } catch (error: any) {
      console.error('Error sending friend request:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to send friend request.',
      });
    } finally {
      setSendingFriendRequest(false);
    }
  };

  const resetState = () => {
    setSearchQuery('');
    setSearchResults([]);
    setSelectedUser(null);
    setMessage('');
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      setIsOpen(open);
      if (!open) resetState();
    }}>
      <DialogTrigger asChild>
        <Button variant="ghost" className="w-full justify-start gap-2 glass-card hover:bg-white/5">
          <UserPlus className="w-5 h-5" />
          <span>Add Contact</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="glass-card border-white/20 sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-gradient">Add Contact & Send Message</DialogTitle>
          <DialogDescription>
            Search for users by name or email and start a conversation
          </DialogDescription>
        </DialogHeader>

        {!selectedUser ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="search-user">Search Users</Label>
              <div className="flex gap-2">
                <Input
                  id="search-user"
                  placeholder="Enter name or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !searching) {
                      handleSearch();
                    }
                  }}
                  disabled={searching}
                  className="flex-1"
                />
                <Button onClick={handleSearch} disabled={searching || !searchQuery.trim()}>
                  {searching ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Search className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>

            {searchResults.length > 0 && (
              <div className="space-y-2">
                <Label>Search Results</Label>
                <div className="max-h-[300px] overflow-y-auto space-y-1">
                  {searchResults.map((user) => (
                    <motion.div
                      key={user.id}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <Button
                        variant="ghost"
                        className="w-full justify-start gap-3 h-auto p-3 glass-card"
                        onClick={() => setSelectedUser(user)}
                      >
                        <UserAvatar
                          src={user.photoURL || ''}
                          fallback={(user.displayName || user.name || user.email).substring(0, 2).toUpperCase()}
                        />
                        <div className="flex-1 text-left">
                          <p className="font-medium">{user.displayName || user.name || 'User'}</p>
                          <p className="text-xs text-muted-foreground">{user.email}</p>
                          {user.customStatus && (
                            <p className="text-xs text-muted-foreground italic">{user.customStatus}</p>
                          )}
                        </div>
                      </Button>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 glass-card rounded-lg">
              <UserAvatar
                src={selectedUser.photoURL || ''}
                fallback={(selectedUser.displayName || selectedUser.name || selectedUser.email).substring(0, 2).toUpperCase()}
              />
              <div className="flex-1">
                <p className="font-medium">{selectedUser.displayName || selectedUser.name || 'User'}</p>
                <p className="text-xs text-muted-foreground">{selectedUser.email}</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedUser(null)}
              >
                Change
              </Button>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={handleSendFriendRequest}
                disabled={sendingFriendRequest}
                variant="outline"
                className="flex-1"
              >
                {sendingFriendRequest ? 'Sending...' : 'Send Friend Request'}
              </Button>
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-white/10" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">Or send a message</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="message">Your Message</Label>
              <textarea
                id="message"
                placeholder="Say hello..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full min-h-[120px] p-3 glass-card border border-white/20 rounded-lg bg-background/50 text-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                disabled={sending}
              />
            </div>

            <div className="flex gap-2 justify-end">
              <Button
                variant="ghost"
                onClick={() => setSelectedUser(null)}
                disabled={sending || sendingFriendRequest}
              >
                Back
              </Button>
              <Button
                onClick={handleSendMessage}
                disabled={sending || !message.trim() || sendingFriendRequest}
                className="bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90"
              >
                {sending ? 'Sending...' : 'Send Message'}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
