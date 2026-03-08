'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import UserAvatar from '@/components/user-avatar';
import { Loader2, MessageSquare, ArrowLeft, Users, Check, CheckCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import CreateGroupChatDialog from '@/components/create-group-chat-dialog';
import FriendsDialog from '@/components/friends-dialog';
import { format, isToday, isYesterday, parseISO } from 'date-fns';
import SponsoredChatRow from '@/components/ads/SponsoredChatRow';
import { MOCK_ADS } from '@/lib/mock-ads';

type Conversation = {
  otherUserId: string;
  otherUser?: {
    id: string;
    email: string;
    name: string | null;
    displayName: string | null;
    photoURL: string | null;
    lastSeen: string | null;
  };
  lastMessage: {
    id: string;
    content: string;
    senderId: string;
    receiverId: string;
    createdAt: string;
    read: boolean;
    archived: boolean;
  };
  unreadCount: number;
};

type GroupChat = {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  memberCount: number;
  userRole: string;
};

export default function DMInboxPage() {
  const { status, session } = useAuth();
  const currentUserId = (session?.user as any)?.id || (session?.user as any)?.uid;
  const router = useRouter();

  /** Smart timestamp: time for today, day for this week, date otherwise */
  function formatConvoTime(iso: string): string {
    try {
      const d = parseISO(iso);
      if (isToday(d)) return format(d, 'h:mm a');
      if (isYesterday(d)) return 'Yesterday';
      return format(d, 'MMM d');
    } catch {
      return '';
    }
  }
  const [loading, setLoading] = useState(true);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [groupChats, setGroupChats] = useState<GroupChat[]>([]);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
      return;
    }

    const load = async () => {
      try {
        const [convRes, groupRes] = await Promise.all([
          fetch('/api/conversations'),
          fetch('/api/group-chats')
        ]);
        
        if (convRes.ok) {
          const convData = await convRes.json();
          setConversations(convData.conversations ?? []);
        }
        
        if (groupRes.ok) {
          const groupData = await groupRes.json();
          setGroupChats(groupData.groupChats ?? []);
        }
      } finally {
        setLoading(false);
      }
    };

    if (status === 'authenticated') {
      load();
      const interval = setInterval(load, 5000);
      return () => clearInterval(interval);
    }
  }, [status, router]);

  if (loading || status === 'loading') {
    return (
      <div className="h-screen w-full flex flex-col bg-background">
        {/* Skeleton header */}
        <div className="px-3 py-3 border-b border-border/50 flex items-center gap-3">
          <div className="skeleton w-9 h-9 rounded-xl" />
          <div className="skeleton w-7 h-7 rounded-full" />
          <div className="skeleton flex-1 h-6 rounded-lg" />
          <div className="skeleton w-9 h-9 rounded-xl" />
        </div>
        {/* Skeleton tab strip */}
        <div className="mx-3 mt-3 skeleton h-10 rounded-xl" />
        {/* Skeleton conversation rows */}
        <div className="p-3 space-y-2">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 p-3 rounded-xl">
              <div className="skeleton w-12 h-12 rounded-full shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="flex justify-between">
                  <div className="skeleton h-4 w-32 rounded" />
                  <div className="skeleton h-3 w-12 rounded" />
                </div>
                <div className="skeleton h-3 w-48 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-full flex flex-col bg-gradient-to-br from-background via-background to-primary/5 overflow-x-hidden">
      {/* Header - Compact */}
      <motion.header
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="glass-panel border-b border-white/10 px-3 py-2 shrink-0"
      >
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => router.push('/')} className="shrink-0 w-9 h-9">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <MessageSquare className="w-5 h-5 text-primary shrink-0" />
          <h1 className="font-bold text-lg flex-1 truncate">Messages</h1>
          <FriendsDialog />
          <CreateGroupChatDialog />
        </div>
      </motion.header>

      <Tabs defaultValue="dms" className="flex-1 flex flex-col min-h-0 overflow-hidden">
        <TabsList className="mx-3 mt-3 shrink-0 grid grid-cols-2 h-10">
          <TabsTrigger value="dms" className="text-sm font-medium">
            <MessageSquare className="w-4 h-4 mr-1.5" />
            Chats
          </TabsTrigger>
          <TabsTrigger value="groups" className="text-sm font-medium">
            <Users className="w-4 h-4 mr-1.5" />
            Groups ({groupChats.length})
          </TabsTrigger>
        </TabsList>

        <ScrollArea className="flex-1 p-3 pb-24 md:pb-4 smooth-scroll">
          <TabsContent value="dms" className="mt-0">
            <div className="max-w-3xl mx-auto space-y-2">
              {conversations.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No conversations yet</p>
                  <p className="text-xs mt-1">Add friends and start chatting!</p>
                </div>
              ) : (
                <AnimatePresence>
                  {conversations.flatMap((c, index) => {
                    const isSentByMe = c.lastMessage.senderId === currentUserId;
                    const isUnread = c.unreadCount > 0 && !isSentByMe;
                    const row = (
                      <motion.button
                        key={c.otherUserId}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.04 }}
                        onClick={() => router.push(`/dm/${c.otherUserId}`)}
                        className="w-full text-left glass-panel hover:bg-primary/8 active:scale-[0.99] active:bg-primary/10 transition-all duration-150 rounded-xl p-3 group border border-transparent hover:border-primary/25 hover:shadow-[0_2px_12px_0_hsl(var(--primary)/0.12)]"
                      >
                        <div className="flex items-center gap-3">
                          <div className="relative shrink-0">
                            <UserAvatar
                              src={c.otherUser?.photoURL || ''}
                              fallback={(c.otherUser?.displayName || c.otherUser?.name || c.otherUser?.email || 'U').substring(0, 2).toUpperCase()}
                              status={c.otherUser?.lastSeen === 'online' ? 'online' : 'offline'}
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2 mb-0.5">
                              <p className={`truncate ${isUnread ? 'font-semibold text-foreground' : 'font-medium text-foreground/80'}`}>
                                {c.otherUser?.displayName || c.otherUser?.name || c.otherUser?.email}
                              </p>
                              <span className={`text-xs shrink-0 tabular-nums ${isUnread ? 'text-primary font-semibold' : 'text-muted-foreground'}`}>
                                {formatConvoTime(c.lastMessage.createdAt)}
                              </span>
                            </div>
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-1 min-w-0">
                                {/* Sent/read tick for messages sent by me */}
                                {isSentByMe && (
                                  c.lastMessage.read
                                    ? <CheckCheck className="w-3.5 h-3.5 text-primary shrink-0" />
                                    : <Check className="w-3 h-3 text-muted-foreground shrink-0" />
                                )}
                                <p className={`text-sm truncate ${isUnread ? 'text-foreground/90' : 'text-muted-foreground'}`}>
                                  {isSentByMe ? 'You: ' : ''}
                                  {c.lastMessage.content}
                                </p>
                              </div>
                              {c.unreadCount > 0 && !isSentByMe && (
                                <div className="bg-primary text-primary-foreground text-[11px] font-bold rounded-full min-w-[20px] h-5 flex items-center justify-center px-1.5 shrink-0 shadow-md unread-ring">
                                  {c.unreadCount > 99 ? '99+' : c.unreadCount}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </motion.button>
                    );
                    // Inject an ad after every 4th real conversation
                    const items: React.ReactNode[] = [row];
                    if ((index + 1) % 4 === 0 && MOCK_ADS.length > 0) {
                      const adIndex = Math.floor(index / 4) % MOCK_ADS.length;
                      items.push(
                        <SponsoredChatRow
                          key={`ad-${index}`}
                          ad={MOCK_ADS[adIndex]}
                          animationDelay={(index + 1) * 0.04}
                        />,
                      );
                    }
                    return items;
                  })}
                </AnimatePresence>
              )}
            </div>
          </TabsContent>

          <TabsContent value="groups" className="mt-0">
            <div className="max-w-3xl mx-auto space-y-2">
              {groupChats.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No group chats yet</p>
                  <p className="text-xs mt-1 mb-4">Create a group to chat with multiple friends!</p>
                  <CreateGroupChatDialog />
                </div>
              ) : (
                <AnimatePresence>
                  {groupChats.map((group, index) => (
                    <motion.button
                      key={group.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      onClick={() => router.push(`/group/${group.id}`)}
                      className="w-full text-left glass-panel hover:bg-primary/8 active:scale-[0.99] transition-all duration-150 rounded-xl p-3 border border-transparent hover:border-primary/25 hover:shadow-[0_2px_12px_0_hsl(var(--primary)/0.12)]"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-violet-500 to-indigo-700 flex items-center justify-center shadow-md ring-2 ring-violet-500/20">
                          <span className="text-white font-bold text-base select-none">{group.name.substring(0, 2).toUpperCase()}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className="font-medium truncate">{group.name}</p>
                            {group.userRole === 'admin' && (
                              <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded">
                                Admin
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {group.memberCount} {group.memberCount === 1 ? 'member' : 'members'}
                          </p>
                          {group.description && (
                            <p className="text-xs text-muted-foreground truncate mt-0.5">
                              {group.description}
                            </p>
                          )}
                        </div>
                      </div>
                    </motion.button>
                  ))}
                </AnimatePresence>
              )}
            </div>
          </TabsContent>
        </ScrollArea>
      </Tabs>
    </div>
  );
}
