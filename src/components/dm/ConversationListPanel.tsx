'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useRouter, usePathname } from 'next/navigation';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import UserAvatar from '@/components/user-avatar';
import {
  MessageSquare,
  Search,
  Users,
  Check,
  CheckCheck,
  Settings,
  MoreVertical,
  BellOff,
  Bell,
  Archive,
  Trash2,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import CreateGroupChatDialog from '@/components/create-group-chat-dialog';
import FriendsDialog from '@/components/friends-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import SponsoredChatRow from '@/components/ads/SponsoredChatRow';
import { MOCK_ADS } from '@/lib/mock-ads';
import { format, isToday, isYesterday, parseISO } from 'date-fns';
import { signOut } from 'next-auth/react';

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
    isEncrypted?: boolean | null;
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

/** Detect if a message preview is encrypted */
function getPreviewText(content: string, isEncrypted?: boolean | null): string {
  if (isEncrypted) return '🔒 Encrypted message';
  if (
    content.length > 20 &&
    /^[A-Za-z0-9+/=_-]+$/.test(content) &&
    !/\s/.test(content)
  ) {
    return '🔒 Encrypted message';
  }
  return content;
}

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

interface ConversationListPanelProps {
  /** When true (desktop sidebar) hide the back-button and use compact header */
  compact?: boolean;
}

export default function ConversationListPanel({ compact = false }: ConversationListPanelProps) {
  const { status, session } = useAuth();
  const currentUserId = (session?.user as any)?.id || (session?.user as any)?.uid;
  const router = useRouter();
  const pathname = usePathname();

  const [loading, setLoading] = useState(true);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [groupChats, setGroupChats] = useState<GroupChat[]>([]);
  const [search, setSearch] = useState('');

  // Mute state stored in localStorage
  const [mutedIds, setMutedIds] = useState<Set<string>>(new Set());
  useEffect(() => {
    if (!currentUserId) return;
    try {
      const raw = localStorage.getItem(`muted_convos_${currentUserId}`);
      if (raw) setMutedIds(new Set(JSON.parse(raw)));
    } catch {}
  }, [currentUserId]);

  const toggleMute = (otherUserId: string) => {
    setMutedIds(prev => {
      const next = new Set(prev);
      if (next.has(otherUserId)) next.delete(otherUserId); else next.add(otherUserId);
      try { localStorage.setItem(`muted_convos_${currentUserId}`, JSON.stringify([...next])); } catch {}
      return next;
    });
  };

  const handleArchiveConvo = async (otherUserId: string) => {
    await fetch(`/api/conversations/${otherUserId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ archived: true }),
    });
    setConversations(prev => prev.filter(c => c.otherUserId !== otherUserId));
  };

  const handleDeleteConvo = async (otherUserId: string) => {
    if (!confirm('Delete this conversation? This cannot be undone.')) return;
    await fetch(`/api/conversations/${otherUserId}`, { method: 'DELETE' });
    setConversations(prev => prev.filter(c => c.otherUserId !== otherUserId));
    if (pathname === `/dm/${otherUserId}`) router.push('/dm');
  };

  const load = useCallback(async () => {
    try {
      const [convRes, groupRes] = await Promise.all([
        fetch('/api/conversations'),
        fetch('/api/group-chats'),
      ]);
      if (convRes.ok) {
        const d = await convRes.json();
        setConversations(d.conversations ?? []);
      }
      if (groupRes.ok) {
        const d = await groupRes.json();
        setGroupChats(d.groupChats ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
      return;
    }
    if (status === 'authenticated') {
      load();
      const interval = setInterval(load, 5000);
      return () => clearInterval(interval);
    }
  }, [status, router, load]);

  const filteredConversations = conversations.filter((c) => {
    if (!search) return true;
    const q = search.toLowerCase();
    const name =
      (c.otherUser?.displayName || c.otherUser?.name || c.otherUser?.email || '').toLowerCase();
    return name.includes(q);
  });

  const filteredGroups = groupChats.filter((g) => {
    if (!search) return true;
    return g.name.toLowerCase().includes(search.toLowerCase());
  });

  if (loading) {
    return (
      <div className="h-full flex flex-col bg-background">
        {/* Skeleton header */}
        <div className="px-4 pt-4 pb-3 border-b border-border/50 space-y-3">
          <div className="flex items-center justify-between">
            <div className="skeleton h-7 w-28 rounded-lg" />
            <div className="flex gap-2">
              <div className="skeleton w-9 h-9 rounded-xl" />
              <div className="skeleton w-9 h-9 rounded-xl" />
            </div>
          </div>
          <div className="skeleton h-10 w-full rounded-xl" />
        </div>
        <div className="mx-4 mt-3 skeleton h-10 rounded-xl" />
        <div className="p-3 space-y-1">
          {Array.from({ length: 8 }).map((_, i) => (
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
    <div className="h-full flex flex-col bg-background overflow-hidden">
      {/* ── Header ── */}
      <div className="px-4 pt-3 pb-2.5 border-b border-border/20 shrink-0 bg-background">
        <div className="flex items-center justify-between mb-2.5">
          <h1 className="text-[22px] font-bold tracking-tight">Messages</h1>
          <div className="flex items-center gap-0.5">
            <FriendsDialog />
            <CreateGroupChatDialog />
          </div>
        </div>
        {/* Search bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search"
            className="pl-9 h-9 bg-muted/60 border-none focus-visible:ring-1 focus-visible:ring-primary/40 rounded-full text-sm"
          />
        </div>
      </div>

      <Tabs defaultValue="dms" className="flex-1 flex flex-col min-h-0 overflow-hidden">
        <TabsList className="mx-3 mt-2 mb-1 shrink-0 grid grid-cols-2 h-8 bg-muted/50 rounded-lg">
          <TabsTrigger value="dms" className="text-xs font-semibold gap-1 rounded-md">
            <MessageSquare className="w-3 h-3" />
            Chats
            {conversations.reduce((n, c) => n + (c.unreadCount > 0 ? 1 : 0), 0) > 0 && (
              <span className="ml-0.5 bg-primary text-primary-foreground text-[9px] font-bold rounded-full min-w-[16px] h-4 flex items-center justify-center px-1">
                {conversations.reduce((n, c) => n + (c.unreadCount > 0 ? 1 : 0), 0)}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="groups" className="text-xs font-semibold gap-1 rounded-md">
            <Users className="w-3 h-3" />
            Groups ({groupChats.length})
          </TabsTrigger>
        </TabsList>

        <ScrollArea className="flex-1 min-h-0 overflow-hidden pb-20 md:pb-2">
          {/* —— DMs tab —— */}
          <TabsContent value="dms" className="mt-0 px-2">
            <AnimatePresence initial={false}>
              {filteredConversations.length === 0 ? (
                <div className="text-center py-16 text-muted-foreground px-4">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                    <MessageSquare className="w-8 h-8 text-primary/50" />
                  </div>
                  {search ? (
                    <p className="text-sm">No conversations matching "{search}"</p>
                  ) : (
                    <>
                      <p className="font-medium mb-1">No conversations yet</p>
                      <p className="text-xs">Add friends and start chatting!</p>
                    </>
                  )}
                </div>
              ) : (
                filteredConversations.flatMap((c, index) => {
                  const isSentByMe = c.lastMessage.senderId === currentUserId;
                  const isUnread = c.unreadCount > 0 && !isSentByMe;
                  const activePath = pathname === `/dm/${c.otherUserId}`;
                  const preview = getPreviewText(c.lastMessage.content, c.lastMessage.isEncrypted);

                  const isMuted = mutedIds.has(c.otherUserId);

                  const row = (
                    <motion.div
                      key={c.otherUserId}
                      layout
                      initial={{ opacity: 0, x: -12 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -12 }}
                      transition={{ duration: 0.15, delay: index * 0.02 }}
                      className="relative group/row"
                    >
                      <button
                        onClick={() => router.push(`/dm/${c.otherUserId}`)}
                        className={`w-full text-left rounded-xl px-3 py-2.5 transition-all duration-150 flex items-center gap-3 pr-10 ${
                          activePath
                            ? 'bg-primary/15 border border-primary/30'
                            : 'hover:bg-muted/60 active:bg-muted/80 border border-transparent'
                        }`}
                      >
                        {/* Avatar */}
                        <div className="relative shrink-0">
                          <UserAvatar
                            src={c.otherUser?.photoURL || ''}
                            fallback={(
                              c.otherUser?.displayName ||
                              c.otherUser?.name ||
                              c.otherUser?.email ||
                              'U'
                            )
                              .substring(0, 2)
                              .toUpperCase()}
                            status={c.otherUser?.lastSeen === 'online' ? 'online' : 'offline'}
                          />
                          {isMuted && (
                            <BellOff className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 text-muted-foreground bg-background rounded-full p-px" />
                          )}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2 mb-0.5">
                            <p
                              className={`truncate text-sm ${
                                isUnread ? 'font-bold text-foreground' : 'font-medium text-foreground/80'
                              }`}
                            >
                              {c.otherUser?.displayName ||
                                c.otherUser?.name ||
                                c.otherUser?.email}
                            </p>
                            <span
                              className={`text-[11px] shrink-0 tabular-nums ${
                                isUnread ? 'text-primary font-semibold' : 'text-muted-foreground'
                              }`}
                            >
                              {formatConvoTime(c.lastMessage.createdAt)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1 min-w-0">
                              {isSentByMe &&
                                (c.lastMessage.read ? (
                                  <CheckCheck className="w-3.5 h-3.5 text-primary shrink-0" />
                                ) : (
                                  <Check className="w-3 h-3 text-muted-foreground shrink-0" />
                                ))}
                              <p
                                className={`text-xs truncate ${
                                  isUnread ? 'text-foreground/80 font-medium' : 'text-muted-foreground'
                                }`}
                              >
                                {isSentByMe ? 'You: ' : ''}
                                {preview}
                              </p>
                            </div>
                            {c.unreadCount > 0 && !isSentByMe && (
                              <div className="bg-primary text-primary-foreground text-[10px] font-bold rounded-full min-w-[20px] h-5 flex items-center justify-center px-1.5 shrink-0 shadow-sm">
                                {c.unreadCount > 99 ? '99+' : c.unreadCount}
                              </div>
                            )}
                          </div>
                        </div>
                      </button>

                      {/* Three-dot action menu — visible on hover */}
                      <div className="absolute right-1.5 top-1/2 -translate-y-1/2 opacity-0 group-hover/row:opacity-100 focus-within:opacity-100 transition-opacity">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button
                              className="p-1.5 rounded-lg hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-colors"
                              onClick={e => e.stopPropagation()}
                              aria-label="Conversation options"
                            >
                              <MoreVertical className="w-4 h-4" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="glass-card border-white/20 w-44">
                            <DropdownMenuItem onClick={() => toggleMute(c.otherUserId)}>
                              {isMuted ? (
                                <><Bell className="w-4 h-4 mr-2" />Unmute</>
                              ) : (
                                <><BellOff className="w-4 h-4 mr-2" />Mute</>
                              )}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleArchiveConvo(c.otherUserId)}>
                              <Archive className="w-4 h-4 mr-2" />
                              Archive
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => handleDeleteConvo(c.otherUserId)}
                              className="text-destructive focus:text-destructive focus:bg-destructive/10"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete chat
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </motion.div>
                  );

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
                })
              )}
            </AnimatePresence>
          </TabsContent>

          {/* —— Groups tab —— */}
          <TabsContent value="groups" className="mt-0 px-2">
            {filteredGroups.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground px-4">
                <div className="w-16 h-16 rounded-full bg-violet-500/10 flex items-center justify-center mx-auto mb-3">
                  <Users className="w-8 h-8 text-violet-400/60" />
                </div>
                {search ? (
                  <p className="text-sm">No groups matching "{search}"</p>
                ) : (
                  <>
                    <p className="font-medium mb-1">No group chats yet</p>
                    <p className="text-xs mb-4">Create a group to chat with multiple friends!</p>
                    <CreateGroupChatDialog />
                  </>
                )}
              </div>
            ) : (
              <AnimatePresence initial={false}>
                {filteredGroups.map((group, index) => {
                  const activePath = pathname === `/group/${group.id}`;
                  return (
                    <motion.button
                      key={group.id}
                      layout
                      initial={{ opacity: 0, x: -12 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -12 }}
                      transition={{ duration: 0.15, delay: index * 0.02 }}
                      onClick={() => router.push(`/group/${group.id}`)}
                      className={`w-full text-left rounded-xl px-3 py-2.5 transition-all duration-150 flex items-center gap-3 ${
                        activePath
                          ? 'bg-violet-500/15 border border-violet-500/30'
                          : 'hover:bg-muted/60 active:bg-muted/80 border border-transparent'
                      }`}
                    >
                      <div className="w-11 h-11 rounded-full bg-gradient-to-br from-violet-500 to-indigo-700 flex items-center justify-center shadow-sm ring-1 ring-violet-500/20 shrink-0">
                        <span className="text-white font-bold text-sm select-none">
                          {group.name.substring(0, 2).toUpperCase()}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-medium text-sm truncate">{group.name}</p>
                          {group.userRole === 'admin' && (
                            <span className="text-[10px] bg-primary/20 text-primary px-1.5 py-0.5 rounded shrink-0">
                              Admin
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground truncate mt-0.5">
                          {group.memberCount} member{group.memberCount !== 1 ? 's' : ''}
                          {group.description ? ` · ${group.description}` : ''}
                        </p>
                      </div>
                    </motion.button>
                  );
                })}
              </AnimatePresence>
            )}
          </TabsContent>
        </ScrollArea>
      </Tabs>

      {/* ── Profile strip at bottom (desktop only) — like WhatsApp's bottom bar ── */}
      <div className="hidden md:flex items-center gap-3 px-4 py-3 border-t border-border/20 bg-background shrink-0">
        <div
          className="cursor-pointer shrink-0"
          onClick={() => router.push('/profile')}
          title="View profile"
        >
          <UserAvatar
            src={session?.user?.image || ''}
            fallback={(session?.user?.name || session?.user?.email || 'U').substring(0, 2).toUpperCase()}
          />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate leading-tight">
            {session?.user?.name || 'Me'}
          </p>
          <p className="text-[11px] text-green-400 font-medium leading-tight">Online</p>
        </div>
        <button
          onClick={() => router.push('/profile')}
          className="p-2 rounded-xl hover:bg-muted/60 transition-colors text-muted-foreground hover:text-foreground"
          title="Settings"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
