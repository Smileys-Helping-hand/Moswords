'use client';

import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { isOnline } from '@/lib/presence';
import { useAuth } from '@/hooks/use-auth';
import { useSyncBatches } from '@/providers/sync-provider';
import { openMessageSearch } from '@/components/message-search';
import { shareInvite } from '@/lib/invite';
import { useToast } from '@/hooks/use-toast';
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
  Radio,
  QrCode,
  Plus,
  Pin,
  PinOff,
  FolderInput,
  ArchiveRestore,
  ArrowLeft,
  Pencil,
  ChevronRight,
  Share2,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import CreateGroupChatDialog from '@/components/create-group-chat-dialog';
import FriendsDialog from '@/components/friends-dialog';
import QRContactSheet from '@/components/qr-contact-sheet';
import AddContactSheet from '@/components/add-contact-sheet';
import { Button } from '@/components/ui/button';
import { MoswordsBrand } from '@/components/icons';
import { useMobileFeatures } from '@/hooks/use-mobile-features';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  FolderNameDialog,
  ManageFoldersDialog,
  useChatOrganisation,
  type ChatFolder,
  type ChatType,
} from './chat-organisation';
import { format, isToday, isYesterday, parseISO } from 'date-fns';
import { signOut } from 'next-auth/react';
import {
  loadConversationListIDB,
  saveConversationListIDB,
  type CachedConversation,
} from '@/lib/idb-cache';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

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
  createdAt?: string;
  lastActivityAt?: string | null;
  lastMessage?: {
    content: string;
    isEncrypted: boolean | null;
    mediaType: string | null;
    senderName: string | null;
    createdAt: string;
  } | null;
};

/** One row in the unified list: a DM or a group. */
type ListItem = {
  type: ChatType;
  id: string;
  name: string;
  photoURL: string | null;
  lastAt: string;
  preview: string;
  unread: number;
  sentByMe: boolean;
  read: boolean;
  online: boolean;
  isAdmin: boolean;
};

const MEDIA_LABELS: Record<string, string> = {
  image: '📷 Photo',
  video: '🎥 Video',
  audio: '🎤 Voice message',
  gif: '🎞️ GIF',
  sticker: '🎨 Sticker',
  file: '📎 File',
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
  const { haptic } = useMobileFeatures();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [groupChats, setGroupChats] = useState<GroupChat[]>([]);
  const [search, setSearch] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [showQRSheet, setShowQRSheet] = useState(false);
  const [showAddSheet, setShowAddSheet] = useState(false);

  // Mute state lives in localStorage as `muted_<me>_<conversationId>` — the same
  // key the chat screen and NotificationManager use, so muting anywhere applies everywhere.
  const [mutedIds, setMutedIds] = useState<Set<string>>(new Set());
  useEffect(() => {
    if (!currentUserId) return;
    try {
      const ids = new Set<string>();
      const prefix = `muted_${currentUserId}_`;
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith(prefix) && localStorage.getItem(key) === '1') ids.add(key.slice(prefix.length));
      }
      // One-time migration from the old list-only format.
      const legacy = localStorage.getItem(`muted_convos_${currentUserId}`);
      if (legacy) {
        for (const id of JSON.parse(legacy) as string[]) {
          ids.add(id);
          localStorage.setItem(`${prefix}${id}`, '1');
        }
        localStorage.removeItem(`muted_convos_${currentUserId}`);
      }
      setMutedIds(ids);
    } catch {}
  }, [currentUserId]);

  const toggleMute = (otherUserId: string) => {
    setMutedIds(prev => {
      const next = new Set(prev);
      const key = `muted_${currentUserId}_${otherUserId}`;
      try {
        if (next.has(otherUserId)) {
          next.delete(otherUserId);
          localStorage.removeItem(key);
        } else {
          next.add(otherUserId);
          localStorage.setItem(key, '1');
        }
      } catch {}
      return next;
    });
  };

  const handleDeleteConvo = async (otherUserId: string) => {
    await fetch(`/api/conversations/${otherUserId}`, { method: 'DELETE' });
    setConversations(prev => prev.filter(c => c.otherUserId !== otherUserId));
    if (pathname === `/dm/${otherUserId}`) router.push('/dm');
  };

  const load = useCallback(async (isInitial = false) => {
    // Cache-first: show cached data instantly on initial load
    if (isInitial && currentUserId) {
      const cached = await loadConversationListIDB(currentUserId);
      if (cached && cached.length > 0) {
        setConversations(cached as any[]);
        setLoading(false);
      }
    }
    try {
      const [convRes, groupRes] = await Promise.all([
        fetch('/api/conversations'),
        fetch('/api/group-chats'),
      ]);
      if (convRes.ok) {
        const d = await convRes.json();
        const convList = d.conversations ?? [];
        setConversations(convList);
        if (currentUserId) saveConversationListIDB(currentUserId, convList);
      }
      if (groupRes.ok) {
        const d = await groupRes.json();
        setGroupChats(d.groupChats ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, [currentUserId]);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
      return;
    }
    if (status === 'authenticated') {
      load(true);
      // Returning to the app refreshes the list at most every 15 s; the sync
      // loop keeps it current in between.
      let lastLoad = Date.now();
      const onVisibility = () => {
        if (document.hidden || Date.now() - lastLoad < 15_000) return;
        lastLoad = Date.now();
        load(false);
      };
      document.addEventListener('visibilitychange', onVisibility);
      return () => document.removeEventListener('visibilitychange', onVisibility);
    }
  }, [status, router, load]);

  // Refresh only when the sync loop reports activity that changes this list,
  // debounced so a burst of messages costs one reload.
  const reloadTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (reloadTimerRef.current) clearTimeout(reloadTimerRef.current); }, []);
  useSyncBatches((batch) => {
    const changed = batch.reset || batch.dms.length > 0 || batch.groupMessages.length > 0 || batch.reads.length > 0;
    if (!changed) return;
    if (reloadTimerRef.current) clearTimeout(reloadTimerRef.current);
    reloadTimerRef.current = setTimeout(() => load(false), 800);
  });

  // ── Organisation: archive / pin / folders (per user) ─────────────────────
  const org = useChatOrganisation(status === 'authenticated');
  const [filter, setFilter] = useState<string>('all'); // all | unread | dms | groups | archived | folder:<id>
  const [folderDialog, setFolderDialog] = useState<{ mode: 'create' } | { mode: 'rename'; folder: ChatFolder } | null>(null);
  const [moveAfterCreate, setMoveAfterCreate] = useState<{ type: ChatType; id: string } | null>(null);
  const [manageFolders, setManageFolders] = useState(false);

  // A deleted folder can't stay selected.
  useEffect(() => {
    if (filter.startsWith('folder:') && !org.folders.some((f) => `folder:${f.id}` === filter)) setFilter('all');
  }, [filter, org.folders]);

  const items = useMemo<ListItem[]>(() => [
    ...conversations.map((c) => {
      const sentByMe = c.lastMessage.senderId === currentUserId;
      const mediaType = (c.lastMessage as { mediaType?: string | null }).mediaType;
      const body =
        mediaType && MEDIA_LABELS[mediaType] && !c.lastMessage.content
          ? MEDIA_LABELS[mediaType]
          : getPreviewText(c.lastMessage.content, c.lastMessage.isEncrypted);
      return {
        type: 'dm' as const,
        id: c.otherUserId,
        name: c.otherUser?.displayName || c.otherUser?.name || c.otherUser?.email?.split('@')[0] || 'User',
        photoURL: c.otherUser?.photoURL ?? null,
        lastAt: String(c.lastMessage.createdAt),
        preview: (sentByMe ? 'You: ' : '') + body,
        unread: sentByMe ? 0 : c.unreadCount,
        sentByMe,
        read: c.lastMessage.read,
        online: isOnline(c.otherUser?.lastSeen),
        isAdmin: false,
      };
    }),
    ...groupChats.map((g) => {
      const lm = g.lastMessage;
      const body = lm
        ? lm.mediaType && MEDIA_LABELS[lm.mediaType]
          ? MEDIA_LABELS[lm.mediaType]
          : getPreviewText(lm.content, lm.isEncrypted)
        : '';
      return {
        type: 'group' as const,
        id: g.id,
        name: g.name,
        photoURL: g.imageUrl,
        lastAt: String(g.lastActivityAt || g.createdAt || ''),
        preview: lm ? `${lm.senderName || 'Someone'}: ${body}` : `${g.memberCount} member${g.memberCount !== 1 ? 's' : ''}`,
        unread: 0,
        sentByMe: false,
        read: true,
        online: false,
        isAdmin: g.userRole === 'admin',
      };
    }),
  ], [conversations, groupChats, currentUserId]);

  const q = search.trim().toLowerCase();
  const visible = items
    .filter((it) => {
      const p = org.get(it.type, it.id);
      if (q && !it.name.toLowerCase().includes(q)) return false;
      if (filter === 'archived') return p.archived;
      if (p.archived) return false;
      if (filter === 'unread') return it.unread > 0;
      if (filter === 'dms') return it.type === 'dm';
      if (filter === 'groups') return it.type === 'group';
      if (filter.startsWith('folder:')) return p.folderId === filter.slice(7);
      return true;
    })
    .sort((a, b) => {
      const pin = Number(org.get(b.type, b.id).pinned) - Number(org.get(a.type, a.id).pinned);
      return pin || new Date(b.lastAt).getTime() - new Date(a.lastAt).getTime();
    });
  const archivedCount = items.filter((it) => org.get(it.type, it.id).archived).length;
  const unreadCount = items.filter((it) => it.unread > 0 && !org.get(it.type, it.id).archived).length;

  const chips: { id: string; label: string; count?: number }[] = [
    { id: 'all', label: 'All' },
    { id: 'unread', label: 'Unread', count: unreadCount },
    { id: 'dms', label: 'Chats' },
    { id: 'groups', label: 'Groups' },
    ...org.folders.map((f) => ({ id: `folder:${f.id}`, label: f.name })),
  ];

  const openChat = (it: ListItem) => router.push(it.type === 'dm' ? `/dm/${it.id}` : `/group/${it.id}`);

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
    <>
    <div className="h-full flex flex-col bg-background overflow-hidden">
      {/* ── Header Top Bar ── */}
      <div className="px-4 pt-3 pb-2.5 border-b border-border/30 shrink-0 bg-background/95 backdrop-blur-xl transition-all">
        <div className="flex items-center justify-between mb-3">
          <MoswordsBrand iconSize="w-8 h-8" showWordmark={true} />
          <div className="flex items-center gap-1.5">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                haptic.light();
                setShowQRSheet(true);
              }}
              className="rounded-xl w-9 h-9 text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-all hover:scale-105 active:scale-95"
              title="My QR Code"
            >
              <QrCode className="w-4.5 h-4.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                haptic.light();
                setShowAddSheet(true);
              }}
              className="rounded-xl w-9 h-9 text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-all hover:scale-105 active:scale-95"
              title="Add contact"
            >
              <Plus className="w-5 h-5" />
            </Button>
            <CreateGroupChatDialog />
          </div>
        </div>
        {/* Search bar */}
        <div className="relative group/search">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within/search:text-primary transition-colors pointer-events-none" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search messages & contacts..."
            className="pl-9.5 pr-4 h-9.5 bg-muted/50 border border-border/40 focus-visible:border-primary/50 focus-visible:ring-2 focus-visible:ring-primary/20 rounded-full text-sm transition-all"
          />
        </div>
        {search.trim().length >= 2 && (
          <button
            type="button"
            onClick={() => openMessageSearch(search.trim())}
            className="mt-1.5 w-full text-left text-xs text-primary hover:underline px-3 font-medium flex items-center gap-1"
          >
            <span>Search all messages for &ldquo;{search.trim()}&rdquo;</span>
            <ChevronRight className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* ── Filter chips: All · Unread · Chats · Groups · folders ── */}
      {filter === 'archived' ? (
        <div className="flex items-center gap-2 px-3 py-2 shrink-0 border-b border-border/20 bg-muted/20">
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={() => setFilter('all')} aria-label="Back to chats">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <p className="font-semibold text-sm">Archived</p>
          <p className="text-xs text-muted-foreground ml-auto">Hidden only for you</p>
        </div>
      ) : (
        <div className="flex items-center gap-1.5 overflow-x-auto px-3 py-2 shrink-0 [scrollbar-width:none] border-b border-border/10" role="tablist" aria-label="Chat filters">
          {chips.map((chip) => {
            const isSelected = filter === chip.id;
            return (
              <button
                key={chip.id}
                role="tab"
                aria-selected={isSelected}
                onClick={() => {
                  haptic.light();
                  setFilter(chip.id);
                }}
                className={`relative shrink-0 rounded-full px-3.5 h-7 text-xs font-medium transition-all duration-200 select-none ${
                  isSelected
                    ? 'bg-gradient-to-r from-cyan-500 to-violet-600 text-white shadow-[0_2px_12px_rgba(0,240,255,0.3)] scale-[1.03]'
                    : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground active:scale-95'
                }`}
              >
                {chip.label}
                {chip.count ? (
                  <span className={`ml-1.5 px-1.5 py-0.2 rounded-full text-[10px] font-bold ${isSelected ? 'bg-white/25 text-white' : 'bg-primary/20 text-primary'}`}>
                    {chip.count}
                  </span>
                ) : null}
              </button>
            );
          })}
          <button
            onClick={() => setFolderDialog({ mode: 'create' })}
            className="shrink-0 rounded-full px-2.5 h-7 text-xs text-primary hover:bg-primary/10 flex items-center gap-1"
            aria-label="New folder"
          >
            <Plus className="h-3.5 w-3.5" /> Folder
          </button>
          {org.folders.length > 0 && (
            <button
              onClick={() => setManageFolders(true)}
              className="shrink-0 rounded-full h-7 w-7 flex items-center justify-center text-muted-foreground hover:bg-muted"
              aria-label="Edit folders"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      )}

      <ScrollArea className="flex-1 min-h-0 overflow-hidden pb-20 md:pb-2">
        <div className="px-2 pb-2">
          {filter === 'all' && archivedCount > 0 && !q && (
            <button
              onClick={() => setFilter('archived')}
              className="w-full flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-muted/60 text-left"
            >
              <span className="w-11 h-11 rounded-full bg-muted flex items-center justify-center shrink-0">
                <Archive className="w-5 h-5 text-muted-foreground" />
              </span>
              <span className="flex-1 text-sm font-medium">Archived</span>
              <span className="text-xs text-muted-foreground">{archivedCount}</span>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </button>
          )}

          {visible.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground px-4">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                {filter === 'archived' ? <Archive className="w-8 h-8 text-primary/50" /> : <MessageSquare className="w-8 h-8 text-primary/50" />}
              </div>
              {q ? (
                <p className="text-sm">Nothing matches &ldquo;{search}&rdquo;</p>
              ) : filter === 'archived' ? (
                <p className="text-sm">No archived chats. Archive a chat from its ⋮ menu to tidy your list.</p>
              ) : filter.startsWith('folder:') ? (
                <p className="text-sm">This folder is empty. Use a chat&apos;s ⋮ menu → Move to folder.</p>
              ) : filter === 'unread' ? (
                <p className="text-sm">You&apos;re all caught up.</p>
              ) : filter === 'groups' ? (
                <>
                  <p className="font-medium mb-1">No groups yet</p>
                  <p className="text-xs mb-4">Create a group to chat with several people at once.</p>
                  <CreateGroupChatDialog />
                </>
              ) : (
                <>
                  <p className="font-medium mb-1">No conversations yet</p>
                  <p className="text-xs mb-4">Add people by name or email, or share your QR code.</p>
                  <div className="flex flex-wrap justify-center gap-2">
                    <Button size="sm" onClick={() => setShowAddSheet(true)}>
                      <Plus className="w-4 h-4 mr-1" /> Add someone
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={async () => {
                        if (!currentUserId) return;
                        const how = await shareInvite(currentUserId, session?.user?.name);
                        if (how === 'copied') toast({ title: 'Invite link copied', description: 'Send it to friends on WhatsApp, SMS or email.' });
                      }}
                    >
                      <Share2 className="w-4 h-4 mr-1" /> Invite friends
                    </Button>
                  </div>
                </>
              )}
            </div>
          ) : (
            visible.map((it) => {
              const pref = org.get(it.type, it.id);
              const active = pathname === (it.type === 'dm' ? `/dm/${it.id}` : `/group/${it.id}`);
              const muted = mutedIds.has(it.id);
              return (
                <div key={`${it.type}:${it.id}`} className="relative group/row">
                  <button
                    onClick={() => openChat(it)}
                    className={`w-full text-left rounded-2xl px-3 py-2.5 pr-10 transition-all flex items-center gap-3 ${
                      active
                        ? 'bg-gradient-to-r from-primary/20 via-primary/10 to-transparent border-l-3 border-primary shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]'
                        : 'hover:bg-muted/50 active:bg-muted/70 border-l-3 border-transparent'
                    }`}
                  >
                    <div className="relative shrink-0">
                      {it.type === 'dm' ? (
                        <UserAvatar
                          src={it.photoURL || ''}
                          fallback={it.name.substring(0, 2).toUpperCase()}
                          status={it.online ? 'online' : 'offline'}
                        />
                      ) : (
                        <div className="w-11 h-11 rounded-full bg-gradient-to-br from-violet-500 to-indigo-700 flex items-center justify-center ring-1 ring-violet-500/20 shadow-md">
                          <span className="text-white font-bold text-sm select-none">{it.name.substring(0, 2).toUpperCase()}</span>
                        </div>
                      )}
                      {muted && (
                        <BellOff className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 text-muted-foreground bg-background rounded-full p-px" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-0.5">
                        <p className={`truncate text-sm flex items-center gap-1.5 ${it.unread ? 'font-bold' : 'font-medium text-foreground/85'}`}>
                          {it.type === 'group' && <Users className="w-3.5 h-3.5 text-violet-400 shrink-0" />}
                          <span className="truncate">{it.name}</span>
                        </p>
                        <span className={`text-[11px] shrink-0 tabular-nums ${it.unread ? 'text-primary font-semibold' : 'text-muted-foreground'}`}>
                          {it.lastAt ? formatConvoTime(it.lastAt) : ''}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1 min-w-0">
                          {it.type === 'dm' && it.sentByMe &&
                            (it.read ? (
                              <CheckCheck className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                            ) : (
                              <Check className="w-3 h-3 text-muted-foreground shrink-0" />
                            ))}
                          <p className={`text-xs truncate ${it.unread ? 'text-foreground/90 font-medium' : 'text-muted-foreground'}`}>
                            {it.preview}
                          </p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          {pref.pinned && <Pin className="w-3 h-3 text-muted-foreground rotate-45" aria-label="Pinned" />}
                          {it.unread > 0 && (
                            <span className="bg-gradient-to-r from-cyan-500 to-violet-600 text-white text-[10px] font-bold rounded-full min-w-[20px] h-5 flex items-center justify-center px-1.5 shadow-[0_0_10px_rgba(0,240,255,0.4)] animate-pulse">
                              {it.unread > 99 ? '99+' : it.unread}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </button>

                  {/* Actions — always visible on touch, on hover for mouse */}
                  <div className="absolute right-1.5 top-1/2 -translate-y-1/2 md:opacity-0 md:group-hover/row:opacity-100 md:focus-within:opacity-100 transition-opacity">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          className="p-1.5 rounded-lg hover:bg-muted/80 text-muted-foreground hover:text-foreground"
                          aria-label={`Options for ${it.name}`}
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-52">
                        <DropdownMenuItem onClick={() => org.update(it.type, it.id, { pinned: !pref.pinned })}>
                          {pref.pinned ? <PinOff className="w-4 h-4 mr-2" /> : <Pin className="w-4 h-4 mr-2" />}
                          {pref.pinned ? 'Unpin' : 'Pin to top'}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => org.update(it.type, it.id, { archived: !pref.archived })}>
                          {pref.archived ? <ArchiveRestore className="w-4 h-4 mr-2" /> : <Archive className="w-4 h-4 mr-2" />}
                          {pref.archived ? 'Unarchive' : 'Archive'}
                        </DropdownMenuItem>
                        <DropdownMenuSub>
                          <DropdownMenuSubTrigger>
                            <FolderInput className="w-4 h-4 mr-2" />
                            Move to folder
                          </DropdownMenuSubTrigger>
                          <DropdownMenuSubContent className="w-48">
                            {org.folders.map((f) => (
                              <DropdownMenuItem key={f.id} onClick={() => org.update(it.type, it.id, { folderId: f.id })}>
                                <span className="flex-1 truncate">{f.name}</span>
                                {pref.folderId === f.id && <Check className="w-4 h-4 ml-2" />}
                              </DropdownMenuItem>
                            ))}
                            {org.folders.length > 0 && <DropdownMenuSeparator />}
                            <DropdownMenuItem
                              onClick={() => {
                                setMoveAfterCreate({ type: it.type, id: it.id });
                                setFolderDialog({ mode: 'create' });
                              }}
                            >
                              <Plus className="w-4 h-4 mr-2" /> New folder…
                            </DropdownMenuItem>
                            {pref.folderId && (
                              <DropdownMenuItem onClick={() => org.update(it.type, it.id, { folderId: null })}>
                                Remove from folder
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuSubContent>
                        </DropdownMenuSub>
                        <DropdownMenuItem onClick={() => toggleMute(it.id)}>
                          {muted ? <Bell className="w-4 h-4 mr-2" /> : <BellOff className="w-4 h-4 mr-2" />}
                          {muted ? 'Unmute' : 'Mute notifications'}
                        </DropdownMenuItem>
                        {it.type === 'dm' && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => setDeleteTarget(it.id)}
                              className="text-destructive focus:text-destructive focus:bg-destructive/10"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Clear chat
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </ScrollArea>

      {/* ── Profile strip at bottom (desktop only) — like WhatsApp's bottom bar ── */}
      <div className="hidden md:flex items-center gap-2 px-3 py-2.5 border-t border-border/20 bg-background shrink-0">
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
          onClick={() => router.push('/updates')}
          className="p-2 rounded-xl hover:bg-muted/60 transition-colors text-muted-foreground hover:text-foreground"
          title="Status &amp; Updates"
        >
          <Radio className="w-4 h-4" />
        </button>
        <button
          onClick={() => router.push('/settings')}
          className="p-2 rounded-xl hover:bg-muted/60 transition-colors text-muted-foreground hover:text-foreground"
          title="Settings"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>
    </div>

    {/* Delete conversation confirmation */}
    <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
      <AlertDialogContent className="glass-card border-white/20">
        <AlertDialogHeader>
          <AlertDialogTitle>Clear this chat?</AlertDialogTitle>
          <AlertDialogDescription>
            This clears the chat history on your side only. The other person keeps their copy.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive hover:bg-destructive/90"
            onClick={() => { if (deleteTarget) handleDeleteConvo(deleteTarget); setDeleteTarget(null); }}
          >
            Clear chat
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

    <FolderNameDialog
      open={!!folderDialog}
      title={folderDialog?.mode === 'rename' ? 'Rename folder' : 'New folder'}
      initialName={folderDialog?.mode === 'rename' ? folderDialog.folder.name : ''}
      onOpenChange={(open) => {
        if (!open) {
          setFolderDialog(null);
          setMoveAfterCreate(null);
        }
      }}
      onSubmit={async (name) => {
        if (folderDialog?.mode === 'rename') {
          await org.renameFolder(folderDialog.folder.id, name);
          return;
        }
        const folder = await org.createFolder(name);
        if (folder && moveAfterCreate) await org.update(moveAfterCreate.type, moveAfterCreate.id, { folderId: folder.id });
        if (folder && !moveAfterCreate) setFilter(`folder:${folder.id}`);
        setMoveAfterCreate(null);
      }}
    />
    <ManageFoldersDialog
      open={manageFolders}
      onOpenChange={setManageFolders}
      folders={org.folders}
      onRename={(folder) => setFolderDialog({ mode: 'rename', folder })}
      onDelete={(folder) => org.deleteFolder(folder.id)}
      onCreate={() => setFolderDialog({ mode: 'create' })}
    />

    {/* QR Code Sheet */}
    <QRContactSheet open={showQRSheet} onOpenChange={setShowQRSheet} />

    {/* Add Contact Sheet */}
    <AddContactSheet open={showAddSheet} onOpenChange={setShowAddSheet} onFriendAdded={load} />
    </>
  );
}
