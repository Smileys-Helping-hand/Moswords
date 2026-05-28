'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Search, Loader2, X, ArrowLeft } from 'lucide-react';
import { Button } from './ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from './ui/sheet';
import { Input } from './ui/input';
import { useToast } from '@/hooks/use-toast';
import UserAvatar from './user-avatar';
import { useMobileFeatures } from '@/hooks/use-mobile-features';
import { ScrollArea } from './ui/scroll-area';

interface User {
  id: string;
  email: string;
  name: string | null;
  displayName: string | null;
  photoURL: string | null;
  customStatus: string | null;
}

interface AddContactSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onFriendAdded?: () => void;
}

export default function AddContactSheet({ open, onOpenChange, onFriendAdded }: AddContactSheetProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sendingFriendRequest, setSendingFriendRequest] = useState(false);
  const { toast } = useToast();
  const { haptic } = useMobileFeatures();

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
      haptic.light();
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
      haptic.error?.();
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
      haptic.light();
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

      haptic.success?.();
      toast({
        title: 'Success!',
        description: `Message sent to ${selectedUser.displayName || selectedUser.name || selectedUser.email}`,
      });

      onOpenChange(false);
      resetState();
      onFriendAdded?.();
    } catch (error) {
      console.error('Error sending message:', error);
      haptic.error?.();
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
      haptic.light();
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

      haptic.success?.();
      toast({
        title: 'Friend request sent!',
        description: `Request sent to ${selectedUser.displayName || selectedUser.name || selectedUser.email}`,
      });

      onOpenChange(false);
      resetState();
      onFriendAdded?.();
    } catch (error: any) {
      console.error('Error sending friend request:', error);
      haptic.error?.();
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

  const handleClose = () => {
    onOpenChange(false);
    resetState();
  };

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent side="bottom" className="h-[90vh] rounded-t-3xl flex flex-col p-0">
        <SheetHeader className="px-6 py-4 border-b border-border/50 flex flex-row items-center justify-between">
          <SheetTitle className="flex items-center gap-2">
            {selectedUser ? (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSelectedUser(null)}
                  className="h-8 w-8"
                >
                  <ArrowLeft className="w-4 h-4" />
                </Button>
                <span>Add Contact</span>
              </>
            ) : (
              'Find People'
            )}
          </SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-auto flex flex-col px-6 py-4">
          {!selectedUser ? (
            <div className="space-y-4 flex-1">
              <div className="flex gap-2">
                <Input
                  placeholder="Search by name or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !searching) {
                      handleSearch();
                    }
                  }}
                  disabled={searching}
                  className="flex-1 rounded-lg"
                />
                <Button
                  onClick={handleSearch}
                  disabled={searching || !searchQuery.trim()}
                  size="icon"
                  className="rounded-lg"
                >
                  {searching ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Search className="w-4 h-4" />
                  )}
                </Button>
              </div>

              {searchResults.length > 0 && (
                <ScrollArea className="flex-1 -mx-6">
                  <div className="space-y-2 px-6">
                    {searchResults.map((user, index) => (
                      <motion.div
                        key={user.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                      >
                        <Button
                          variant="ghost"
                          className="w-full justify-start gap-3 h-auto p-3 rounded-lg hover:bg-white/5"
                          onClick={() => {
                            haptic.light();
                            setSelectedUser(user);
                          }}
                        >
                          <UserAvatar
                            src={user.photoURL || ''}
                            fallback={(user.displayName || user.name || user.email || 'U').substring(0, 2).toUpperCase()}
                          />
                          <div className="flex-1 text-left">
                            <p className="font-medium text-sm">
                              {user.displayName || user.name || 'User'}
                            </p>
                            <p className="text-xs text-muted-foreground">{user.email}</p>
                            {user.customStatus && (
                              <p className="text-xs text-muted-foreground italic line-clamp-1">
                                {user.customStatus}
                              </p>
                            )}
                          </div>
                        </Button>
                      </motion.div>
                    ))}
                  </div>
                </ScrollArea>
              )}

              {!searching && searchResults.length === 0 && searchQuery && (
                <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center">
                  <p className="text-muted-foreground">No results found</p>
                  <p className="text-xs text-muted-foreground">Try a different search</p>
                </div>
              )}

              {!searching && searchResults.length === 0 && !searchQuery && (
                <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center">
                  <p className="text-muted-foreground">Search for someone to add</p>
                  <p className="text-xs text-muted-foreground">
                    Use their name or email address
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4 flex-1">
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-3 p-4 rounded-lg bg-white/5 border border-border/50"
              >
                <UserAvatar
                  src={selectedUser.photoURL || ''}
                  fallback={(selectedUser.displayName || selectedUser.name || selectedUser.email || 'U').substring(0, 2).toUpperCase()}
                />
                <div className="flex-1">
                  <p className="font-semibold">{selectedUser.displayName || selectedUser.name || 'User'}</p>
                  <p className="text-xs text-muted-foreground">{selectedUser.email}</p>
                </div>
              </motion.div>

              <Button
                onClick={handleSendFriendRequest}
                disabled={sendingFriendRequest}
                variant="default"
                className="w-full rounded-lg"
                size="lg"
              >
                {sendingFriendRequest ? 'Sending...' : 'Send Friend Request'}
              </Button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-border/50" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">Or send a message</span>
                </div>
              </div>

              <div className="space-y-2 flex-1 flex flex-col">
                <label className="text-sm font-medium">Your Message</label>
                <textarea
                  placeholder="Say hello..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="flex-1 p-3 rounded-lg bg-white/5 border border-border/50 text-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                  disabled={sending}
                />
              </div>

              <div className="flex gap-2 justify-end">
                <Button
                  variant="ghost"
                  onClick={() => setSelectedUser(null)}
                  disabled={sending || sendingFriendRequest}
                  className="rounded-lg"
                >
                  Back
                </Button>
                <Button
                  onClick={handleSendMessage}
                  disabled={sending || !message.trim() || sendingFriendRequest}
                  className="rounded-lg"
                  size="lg"
                >
                  {sending ? 'Sending...' : 'Send Message'}
                </Button>
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
