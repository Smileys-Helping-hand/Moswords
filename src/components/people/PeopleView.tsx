'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Check, Clock, Loader2, MessageSquare, Plus, QrCode, Share2, X } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import UserAvatar from '@/components/user-avatar';
import QRContactSheet from '@/components/qr-contact-sheet';
import AddContactSheet from '@/components/add-contact-sheet';
import { useToast } from '@/hooks/use-toast';
import { useMobileFeatures } from '@/hooks/use-mobile-features';
import { useSyncState } from '@/providers/sync-provider';
import { isOnline } from '@/lib/presence';
import { shareInvite } from '@/lib/invite';

type Person = {
  id: string;
  name: string | null;
  displayName: string | null;
  photoURL: string | null;
  customStatus: string | null;
  lastSeen: string | null;
};

/** One row from GET /api/friends: a friendship plus the other person. */
type FriendRow = { id: string; userId: string; friendId: string; status: string; friend: Person | null };
type RequestRow = { id: string; userId: string; status: string; createdAt: string; requester: Person | null };

type Entry = { friendshipId: string; person: Person };

const label = (p: Person) => p.displayName || p.name || 'Someone';

export default function PeopleView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const { haptic } = useMobileFeatures();
  const { data: session } = useSession();
  const { friendRequests } = useSyncState();
  const me = (session?.user as { id?: string; name?: string | null } | undefined) ?? undefined;

  const [friends, setFriends] = useState<Entry[]>([]);
  const [incoming, setIncoming] = useState<Entry[]>([]);
  const [sent, setSent] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [query, setQuery] = useState('');
  const [tab, setTab] = useState<string>(searchParams.get('tab') === 'requests' ? 'requests' : 'friends');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [showQR, setShowQR] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const autoSwitched = useRef(false);

  const load = useCallback(async () => {
    try {
      setFailed(false);
      const res = await fetch('/api/friends', { cache: 'no-store' });
      if (!res.ok) throw new Error();
      const data: { friends?: FriendRow[]; pendingRequests?: RequestRow[] } = await res.json();
      const rows = data.friends ?? [];
      setFriends(
        rows
          .filter((r) => r.status === 'accepted' && r.friend)
          .map((r) => ({ friendshipId: r.id, person: r.friend! })),
      );
      // Pending rows in "friends" are requests *we* sent and are still waiting on.
      setSent(
        rows
          .filter((r) => r.status === 'pending' && r.friend)
          .map((r) => ({ friendshipId: r.id, person: r.friend! })),
      );
      setIncoming(
        (data.pendingRequests ?? [])
          .filter((r) => r.requester)
          .map((r) => ({ friendshipId: r.id, person: r.requester! })),
      );
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // A new request arrived (the badge count comes from the sync loop): refresh.
  const lastCount = useRef(friendRequests);
  useEffect(() => {
    if (friendRequests !== lastCount.current) {
      lastCount.current = friendRequests;
      load();
    }
  }, [friendRequests, load]);

  // Land on Requests when someone is waiting and no tab was asked for.
  useEffect(() => {
    if (!autoSwitched.current && !loading && incoming.length > 0 && !searchParams.get('tab')) {
      autoSwitched.current = true;
      setTab('requests');
    }
  }, [loading, incoming.length, searchParams]);

  const answer = async (entry: Entry, action: 'accept' | 'reject') => {
    setBusyId(entry.friendshipId);
    haptic.light();
    try {
      const res = await fetch(`/api/friends/${entry.friendshipId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Something went wrong');
      haptic.success?.();
      setIncoming((prev) => prev.filter((e) => e.friendshipId !== entry.friendshipId));
      if (action === 'accept') {
        setFriends((prev) => [entry, ...prev]);
        toast({ title: `You and ${label(entry.person)} are now friends`, description: 'Say hi!' });
      }
      load();
    } catch (error) {
      haptic.error?.();
      toast({ variant: 'destructive', title: 'Could not update the request', description: (error as Error).message });
    } finally {
      setBusyId(null);
    }
  };

  const cancelSent = async (entry: Entry) => {
    setBusyId(entry.friendshipId);
    try {
      const res = await fetch(`/api/friends/${entry.friendshipId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      setSent((prev) => prev.filter((e) => e.friendshipId !== entry.friendshipId));
    } catch {
      toast({ variant: 'destructive', title: 'Could not cancel the request' });
    } finally {
      setBusyId(null);
    }
  };

  const invite = async () => {
    if (!me?.id) return;
    const how = await shareInvite(me.id, me.name);
    if (how === 'copied') toast({ title: 'Invite link copied', description: 'Send it on WhatsApp, SMS or email.' });
  };

  const q = query.trim().toLowerCase();
  const match = (e: Entry) => !q || label(e.person).toLowerCase().includes(q);
  const shownFriends = friends.filter(match);

  const PersonRow = ({ entry, children, onOpen }: { entry: Entry; children?: React.ReactNode; onOpen?: () => void }) => (
    <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted/50 transition-colors">
      <button type="button" onClick={onOpen} disabled={!onOpen} className="flex flex-1 min-w-0 items-center gap-3 text-left">
        <UserAvatar
          src={entry.person.photoURL || ''}
          fallback={label(entry.person).substring(0, 2).toUpperCase()}
          status={isOnline(entry.person.lastSeen) ? 'online' : 'offline'}
        />
        <span className="flex-1 min-w-0">
          <span className="block font-medium truncate">{label(entry.person)}</span>
          {entry.person.customStatus && (
            <span className="block text-xs text-muted-foreground truncate">{entry.person.customStatus}</span>
          )}
        </span>
      </button>
      {children}
    </div>
  );

  const Empty = ({ icon, title, text, action }: { icon: React.ReactNode; title: string; text: string; action?: React.ReactNode }) => (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
      <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary">{icon}</div>
      <p className="font-semibold">{title}</p>
      <p className="text-sm text-muted-foreground">{text}</p>
      {action}
    </div>
  );

  return (
    <>
      <div className="flex flex-col h-[100dvh] bg-background">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/50 safe-area-top">
          <h1 className="text-xl font-bold">People</h1>
          <div className="flex gap-1">
            <Button variant="ghost" size="icon" onClick={() => setShowQR(true)} aria-label="My QR code">
              <QrCode className="w-5 h-5" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setShowAdd(true)} aria-label="Add someone">
              <Plus className="w-5 h-5" />
            </Button>
          </div>
        </div>

        <Tabs value={tab} onValueChange={setTab} className="flex-1 flex flex-col min-h-0">
          <TabsList className="mx-4 mt-3 grid grid-cols-3">
            <TabsTrigger value="friends">Friends ({friends.length})</TabsTrigger>
            <TabsTrigger value="requests" className="gap-1">
              Requests
              {incoming.length > 0 && (
                <span className="min-w-5 h-5 px-1 rounded-full bg-destructive text-white text-xs font-bold flex items-center justify-center">
                  {incoming.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="sent">Sent ({sent.length})</TabsTrigger>
          </TabsList>

          {loading ? (
            <div className="flex flex-1 items-center justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : failed ? (
            <Empty
              icon={<X className="w-8 h-8" />}
              title="Couldn't load your people"
              text="Check your connection and try again."
              action={<Button size="sm" onClick={() => { setLoading(true); load(); }}>Try again</Button>}
            />
          ) : (
            <ScrollArea className="flex-1 min-h-0 pb-20 md:pb-2">
              <TabsContent value="friends" className="mt-0 p-2">
                {friends.length > 0 && (
                  <div className="px-2 pb-2">
                    <Input placeholder="Search friends" value={query} onChange={(e) => setQuery(e.target.value)} />
                  </div>
                )}
                {shownFriends.length === 0 ? (
                  <Empty
                    icon={<MessageSquare className="w-8 h-8" />}
                    title={q ? 'No friends match' : 'No friends yet'}
                    text={q ? 'Try another name.' : 'Add people by name or email, or invite them with your link.'}
                    action={
                      !q && (
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => setShowAdd(true)}><Plus className="w-4 h-4 mr-1" /> Add someone</Button>
                          <Button size="sm" variant="outline" onClick={invite}><Share2 className="w-4 h-4 mr-1" /> Invite</Button>
                        </div>
                      )
                    }
                  />
                ) : (
                  shownFriends.map((entry) => (
                    <PersonRow key={entry.friendshipId} entry={entry} onOpen={() => router.push(`/dm/${entry.person.id}`)}>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => router.push(`/dm/${entry.person.id}`)}
                        aria-label={`Message ${label(entry.person)}`}
                      >
                        <MessageSquare className="w-4 h-4" />
                      </Button>
                    </PersonRow>
                  ))
                )}
              </TabsContent>

              <TabsContent value="requests" className="mt-0 p-2">
                {incoming.length === 0 ? (
                  <Empty icon={<Check className="w-8 h-8" />} title="All caught up" text="No one is waiting for you to answer." />
                ) : (
                  incoming.map((entry) => (
                    <PersonRow key={entry.friendshipId} entry={entry}>
                      <div className="flex gap-2">
                        <Button size="sm" disabled={busyId === entry.friendshipId} onClick={() => answer(entry, 'accept')}>
                          {busyId === entry.friendshipId ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Accept'}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={busyId === entry.friendshipId}
                          onClick={() => answer(entry, 'reject')}
                        >
                          Decline
                        </Button>
                      </div>
                    </PersonRow>
                  ))
                )}
              </TabsContent>

              <TabsContent value="sent" className="mt-0 p-2">
                {sent.length === 0 ? (
                  <Empty icon={<Clock className="w-8 h-8" />} title="No pending requests" text="Requests you send appear here until they're answered." />
                ) : (
                  sent.map((entry) => (
                    <PersonRow key={entry.friendshipId} entry={entry}>
                      <span className="text-xs text-muted-foreground mr-1">Waiting</span>
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={busyId === entry.friendshipId}
                        onClick={() => cancelSent(entry)}
                        aria-label={`Cancel request to ${label(entry.person)}`}
                      >
                        Cancel
                      </Button>
                    </PersonRow>
                  ))
                )}
              </TabsContent>
            </ScrollArea>
          )}
        </Tabs>
      </div>

      <QRContactSheet open={showQR} onOpenChange={setShowQR} />
      <AddContactSheet
        open={showAdd}
        onOpenChange={setShowAdd}
        onFriendAdded={() => {
          setTab('sent');
          load();
        }}
      />
    </>
  );
}
