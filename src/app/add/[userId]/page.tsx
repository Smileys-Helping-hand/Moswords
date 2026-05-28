'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useRouter, useParams } from 'next/navigation';
import LoadingScreen from '@/components/loading-screen';
import UserAvatar from '@/components/user-avatar';
import { Button } from '@/components/ui/button';
import { MessageSquare, UserPlus, ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';
import { useToast } from '@/hooks/use-toast';
import { useMobileFeatures } from '@/hooks/use-mobile-features';

type User = {
  id: string;
  email: string;
  name: string | null;
  displayName: string | null;
  photoURL: string | null;
  customStatus: string | null;
};

export default function AddUserPage() {
  const { status, session } = useAuth();
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();
  const { haptic } = useMobileFeatures();

  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sendingRequest, setSendingRequest] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);

  const currentUserId = (session?.user as any)?.id || (session?.user as any)?.uid;
  const scannedUserId = params?.userId as string;

  useEffect(() => {
    if (status === 'unauthenticated') {
      const callbackUrl = `/add/${scannedUserId}`;
      router.replace(`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`);
    }
  }, [status, router, scannedUserId]);

  useEffect(() => {
    if (!scannedUserId || status !== 'authenticated') return;

    const fetchUser = async () => {
      try {
        setLoading(true);
        setError(null);

        if (scannedUserId === currentUserId) {
          setError("That's your own profile!");
          return;
        }

        const res = await fetch(`/api/users/${scannedUserId}`);
        if (!res.ok) {
          if (res.status === 404) {
            throw new Error('User not found');
          }
          throw new Error('Failed to load user');
        }

        const data = await res.json();
        setUser(data);
      } catch (err: any) {
        console.error('Error fetching user:', err);
        setError(err.message || 'User not found');
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [scannedUserId, status, currentUserId]);

  const handleSendFriendRequest = async () => {
    if (!user) return;

    try {
      setSendingRequest(true);
      haptic.light();

      const res = await fetch('/api/friends', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ friendId: user.id }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to send friend request');
      }

      haptic.success?.();
      toast({
        title: 'Friend request sent!',
        description: `Waiting for ${user.displayName || user.name}'s response.`,
      });

      router.replace('/people');
    } catch (err: any) {
      console.error('Error:', err);
      haptic.error?.();
      toast({
        variant: 'destructive',
        title: 'Error',
        description: err.message || 'Failed to send friend request',
      });
    } finally {
      setSendingRequest(false);
    }
  };

  const handleSendMessage = async () => {
    if (!user) return;

    try {
      setSendingMessage(true);
      haptic.light();

      const res = await fetch('/api/direct-messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          receiverId: user.id,
          content: `Hey! I found you via QR code on Moswords 👋`,
        }),
      });

      if (!res.ok) throw new Error('Failed to send message');

      haptic.success?.();
      toast({
        title: 'Message sent!',
        description: `Chat started with ${user.displayName || user.name}`,
      });

      router.replace(`/dm/${user.id}`);
    } catch (err: any) {
      console.error('Error:', err);
      haptic.error?.();
      toast({
        variant: 'destructive',
        title: 'Error',
        description: err.message || 'Failed to send message',
      });
    } finally {
      setSendingMessage(false);
    }
  };

  if (status === 'loading' || loading) {
    return <LoadingScreen />;
  }

  if (status === 'unauthenticated') {
    return <LoadingScreen />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex flex-col items-center justify-center p-4 gap-4">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => router.back()}
        className="absolute top-4 left-4 rounded-lg"
      >
        <ArrowLeft className="w-5 h-5" />
      </Button>

      {error ? (
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center space-y-4"
        >
          <div className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
            <UserPlus className="w-10 h-10 text-destructive" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">{error}</h1>
            <p className="text-muted-foreground">Try scanning another QR code</p>
          </div>
          <Button onClick={() => router.back()} className="rounded-lg">
            Go Back
          </Button>
        </motion.div>
      ) : user ? (
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          className="w-full max-w-sm space-y-6 text-center"
        >
          <div>
            <UserAvatar
              src={user.photoURL || ''}
              fallback={(user.displayName || user.name || user.email || 'U').substring(0, 2).toUpperCase()}
            />
            <h1 className="text-3xl font-bold">{user.displayName || user.name || 'User'}</h1>
            {user.customStatus && (
              <p className="text-muted-foreground mt-2">{user.customStatus}</p>
            )}
            <p className="text-sm text-muted-foreground mt-1">{user.email}</p>
          </div>

          <div className="flex gap-3 w-full">
            <Button
              onClick={handleSendFriendRequest}
              disabled={sendingRequest || sendingMessage}
              className="flex-1 rounded-lg gap-2"
              size="lg"
            >
              <UserPlus className="w-4 h-4" />
              Add Friend
            </Button>
            <Button
              onClick={handleSendMessage}
              disabled={sendingRequest || sendingMessage}
              variant="outline"
              className="flex-1 rounded-lg gap-2"
              size="lg"
            >
              <MessageSquare className="w-4 h-4" />
              Message
            </Button>
          </div>
        </motion.div>
      ) : null}
    </div>
  );
}
