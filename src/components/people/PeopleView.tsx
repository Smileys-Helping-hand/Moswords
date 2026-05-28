'use client';

import { useEffect, useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import UserAvatar from '@/components/user-avatar';
import { QrCode, Plus, MessageSquare, Check, X, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { useMobileFeatures } from '@/hooks/use-mobile-features';
import QRContactSheet from '@/components/qr-contact-sheet';
import AddContactSheet from '@/components/add-contact-sheet';
import { ScrollArea } from '@/components/ui/scroll-area';

type Friend = {
  id: string;
  displayName: string | null;
  name: string | null;
  photoURL: string | null;
  customStatus: string | null;
  lastSeen: string | null;
};

type FriendRequest = {
  id: string;
  senderId: string;
  receiverId: string;
  status: 'pending' | 'accepted' | 'rejected';
  sender?: Friend;
  receiver?: Friend;
  createdAt: string;
};

export default function PeopleView() {
  const router = useRouter();
  const { toast } = useToast();
  const { haptic } = useMobileFeatures();

  const [friends, setFriends] = useState<Friend[]>([]);
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showQRSheet, setShowQRSheet] = useState(false);
  const [showAddSheet, setShowAddSheet] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    fetchFriendsAndRequests();
  }, []);

  const fetchFriendsAndRequests = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/friends');
      if (!res.ok) throw new Error('Failed to fetch friends');
      const data = await res.json();
      setFriends(data.friends || []);
      setRequests(data.requests || []);
    } catch (error) {
      console.error('Error fetching friends:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load people',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptRequest = async (requestId: string) => {
    try {
      setProcessingId(requestId);
      haptic.light();
      const res = await fetch(`/api/friends/${requestId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'accepted' }),
      });
      if (!res.ok) throw new Error('Failed to accept request');
      haptic.success?.();
      await fetchFriendsAndRequests();
      toast({
        title: 'Friend added!',
        description: 'You can now message each other.',
      });
    } catch (error) {
      console.error('Error accepting request:', error);
      haptic.error?.();
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to accept friend request',
      });
    } finally {
      setProcessingId(null);
    }
  };

  const handleRejectRequest = async (requestId: string) => {
    try {
      setProcessingId(requestId);
      haptic.light();
      const res = await fetch(`/api/friends/${requestId}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to reject request');
      haptic.success?.();
      setRequests(requests.filter(r => r.id !== requestId));
    } catch (error) {
      console.error('Error rejecting request:', error);
      haptic.error?.();
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to reject friend request',
      });
    } finally {
      setProcessingId(null);
    }
  };

  const handleQuickDM = (friendId: string) => {
    haptic.light();
    router.push(`/dm/${friendId}`);
  };

  const incomingRequests = requests.filter(r => r.status === 'pending' && r.receiverId);
  const filteredFriends = friends.filter(f =>
    (f.displayName || f.name || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const isOnline = (lastSeen: string | null) => {
    if (!lastSeen) return false;
    const lastSeenTime = new Date(lastSeen).getTime();
    const now = new Date().getTime();
    return now - lastSeenTime < 5 * 60 * 1000; // 5 minutes
  };

  return (
    <>
      <div className="flex flex-col h-screen bg-background">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/50 safe-area-top">
          <h1 className="text-xl font-bold">People</h1>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                haptic.light();
                setShowQRSheet(true);
              }}
              className="rounded-lg"
            >
              <QrCode className="w-5 h-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                haptic.light();
                setShowAddSheet(true);
              }}
              className="rounded-lg"
            >
              <Plus className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="px-4 py-2">
          <Input
            placeholder="Search people..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="rounded-lg"
          />
        </div>

        {/* Tabs */}
        <Tabs defaultValue="friends" className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="w-full justify-start px-4 py-2 bg-transparent border-b border-border/50 rounded-none gap-2">
            <TabsTrigger value="friends" className="gap-1">
              Friends
              <span className="text-xs font-semibold text-muted-foreground">
                ({friends.length})
              </span>
            </TabsTrigger>
            <TabsTrigger value="requests" className="gap-1 relative">
              Requests
              {incomingRequests.length > 0 && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-destructive text-white text-xs font-bold flex items-center justify-center"
                >
                  {incomingRequests.length}
                </motion.span>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Friends Tab */}
          <TabsContent value="friends" className="flex-1 overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <p className="text-muted-foreground">Loading friends...</p>
              </div>
            ) : filteredFriends.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full gap-4 px-4 text-center">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <MessageSquare className="w-8 h-8 text-primary" />
                </div>
                <div>
                  <p className="font-semibold">No friends yet</p>
                  <p className="text-sm text-muted-foreground">Find people to connect with</p>
                </div>
                <Button onClick={() => setShowAddSheet(true)} size="sm" className="rounded-lg">
                  Find People
                </Button>
              </div>
            ) : (
              <ScrollArea className="h-full">
                <div className="p-4 space-y-2">
                  <AnimatePresence>
                    {filteredFriends.map((friend, index) => (
                      <motion.div
                        key={friend.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ delay: index * 0.02 }}
                        className="flex items-center gap-3 p-3 rounded-lg hover:bg-white/5 transition-colors group"
                      >
                        <div className="relative">
                          <UserAvatar
                            src={friend.photoURL || ''}
                            fallback={(friend.displayName || friend.name || 'U').substring(0, 2).toUpperCase()}
                          />
                          {isOnline(friend.lastSeen) && (
                            <div className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-green-500 border-2 border-background" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{friend.displayName || friend.name}</p>
                          {friend.customStatus && (
                            <p className="text-xs text-muted-foreground truncate">{friend.customStatus}</p>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleQuickDM(friend.id)}
                          className="rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <MessageSquare className="w-4 h-4" />
                        </Button>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </ScrollArea>
            )}
          </TabsContent>

          {/* Requests Tab */}
          <TabsContent value="requests" className="flex-1 overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <p className="text-muted-foreground">Loading requests...</p>
              </div>
            ) : incomingRequests.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full gap-4 px-4 text-center">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <Check className="w-8 h-8 text-primary" />
                </div>
                <div>
                  <p className="font-semibold">All caught up!</p>
                  <p className="text-sm text-muted-foreground">No pending requests</p>
                </div>
              </div>
            ) : (
              <ScrollArea className="h-full">
                <div className="p-4 space-y-2">
                  <AnimatePresence>
                    {incomingRequests.map((request, index) => (
                      <motion.div
                        key={request.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ delay: index * 0.02 }}
                        className="flex items-center gap-3 p-3 rounded-lg bg-white/5 border border-primary/20"
                      >
                        <UserAvatar
                          src={request.sender?.photoURL || ''}
                          fallback={(request.sender?.displayName || request.sender?.name || 'U').substring(0, 2).toUpperCase()}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">
                            {request.sender?.displayName || request.sender?.name}
                          </p>
                          <p className="text-xs text-muted-foreground">Wants to connect</p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            disabled={processingId === request.id}
                            onClick={() => handleAcceptRequest(request.id)}
                            className="rounded-lg h-8 w-8 text-green-500 hover:bg-green-500/10"
                          >
                            <Check className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            disabled={processingId === request.id}
                            onClick={() => handleRejectRequest(request.id)}
                            className="rounded-lg h-8 w-8 text-destructive hover:bg-destructive/10"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </ScrollArea>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* QR Code Sheet */}
      <QRContactSheet open={showQRSheet} onOpenChange={setShowQRSheet} />

      {/* Add Contact Sheet */}
      <AddContactSheet open={showAddSheet} onOpenChange={setShowAddSheet} onFriendAdded={fetchFriendsAndRequests} />
    </>
  );
}
