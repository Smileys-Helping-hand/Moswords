'use client';

import { useEffect, useState, useRef, use, useCallback } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
// Use native scrolling for better mobile behavior
import UserAvatar from '@/components/user-avatar';
import ChatMessage from '@/components/chat-message';
import ChatInput from '@/components/chat/ChatInput';
import { ArrowLeft, Users, Settings, Phone, Video, ArrowDown } from 'lucide-react';
import { motion } from 'framer-motion';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  decryptFile,
  decryptMessage,
  encryptFile,
  encryptMessage,
  ensureConversationKey,
} from '@/lib/crypto/e2e-client';

interface Message {
  id: string;
  content: string;
  contentNonce?: string | null;
  isEncrypted?: boolean | null;
  userId: string;
  groupChatId: string;
  createdAt: Date;
  deleted: boolean;
  mediaUrl?: string | null;
  mediaType?: string | null;
  mediaEncrypted?: boolean | null;
  mediaNonce?: string | null;
  sender?: {
    id: string;
    email: string;
    name: string | null;
    displayName: string | null;
    photoURL: string | null;
  };
}

interface GroupChat {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  createdBy: string;
  createdAt: Date;
}

interface Member {
  id: string;
  userId: string;
  role: string;
  joinedAt: Date;
  user?: {
    id: string;
    email: string;
    name: string | null;
    displayName: string | null;
    photoURL: string | null;
    lastSeen: string | null;
  };
}

export default function GroupChatPage({ params }: { params: Promise<{ groupChatId: string }> }) {
  const isProbablyEncryptedContent = useCallback((value: string) => {
    const trimmed = value.trim();
    if (trimmed.length < 48) return false;
    if (/\s/.test(trimmed)) return false;
    return /^[A-Za-z0-9+/=_-]+$/.test(trimmed);
  }, []);
  const { groupChatId } = use(params);
  const { status, session } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const currentUserId = (session?.user as any)?.id;
  const [messages, setMessages] = useState<Message[]>([]);
  const [groupChat, setGroupChat] = useState<GroupChat | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [userRole, setUserRole] = useState<string>('member');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [hasNewMessages, setHasNewMessages] = useState(false);
  const [showMembers, setShowMembers] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);
  const [availableFriends, setAvailableFriends] = useState<any[]>([]);
  const [addingMember, setAddingMember] = useState(false);
  const previousMessageCount = useRef<number>(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const mediaUrlsRef = useRef<string[]>([]);
  const memberIdsRef = useRef<string[]>([]);
  // Incremental poll refs (avoid stale closures + prevent infinite re-renders)
  const lastMessageIdRef = useRef<string>('');
  const hasInitialLoadRef = useRef(false);
  const canDecryptRef = useRef(false);
  const encryptionInitRef = useRef(false);
  const migratedIdsRef = useRef<Set<string>>(new Set());
  const groupNameRef = useRef<string>(''); // for toast without state dep

  const revokeMediaUrls = useCallback(() => {
    for (const url of mediaUrlsRef.current) {
      URL.revokeObjectURL(url);
    }
    mediaUrlsRef.current = [];
  }, []);

  const scrollToBottom = (smooth = true) => {
    messagesEndRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' });
  };

  const checkIfAtBottom = useCallback(() => {
    if (!containerRef.current) return true;
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    const threshold = 150;
    return scrollHeight - scrollTop - clientHeight < threshold;
  }, []);

  const handleScroll = useCallback(() => {
    const atBottom = checkIfAtBottom();
    setIsAtBottom(atBottom);
    if (atBottom) {
      setHasNewMessages(false);
    }
  }, [checkIfAtBottom]);

  useEffect(() => {
    if (messages.length === 0) return;
    if (isAtBottom) {
      scrollToBottom(true);
    }
  }, [messages.length, isAtBottom]);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
      return;
    }
    if (status !== 'authenticated') return;

    const initEncryption = async (memberIds: string[]) => {
      if (encryptionInitRef.current) return;
      try {
        await ensureConversationKey('group', groupChatId, memberIds);
        canDecryptRef.current = true;
      } catch {
        canDecryptRef.current = false;
      }
      encryptionInitRef.current = true;
    };

    const decryptAndMigrateMsg = async (msg: Message, memberIds: string[]): Promise<Message> => {
      let content = msg.content;
      const contentNonce = msg.contentNonce || undefined;
      const looksEncrypted = isProbablyEncryptedContent(content);
      const isEncrypted = !!msg.isEncrypted || !!contentNonce || looksEncrypted;

      if (isEncrypted) {
        if (!contentNonce || !canDecryptRef.current) {
          content = '[Encrypted message]';
        } else {
          const decrypted = await decryptMessage('group', groupChatId, msg.content, contentNonce);
          content = decrypted ?? '[Encrypted message]';
        }
      } else if (!isEncrypted && msg.content && !looksEncrypted && !migratedIdsRef.current.has(msg.id)) {
        // One-time migration: encrypt plaintext messages — track to avoid repeating
        migratedIdsRef.current.add(msg.id);
        try {
          const encrypted = await encryptMessage('group', groupChatId, memberIds, msg.content);
          await fetch('/api/messages/encrypt', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'group',
              id: msg.id,
              content: encrypted.ciphertext,
              contentNonce: encrypted.nonce,
            }),
          });
        } catch { /* migration errors are non-fatal */ }
      }

      let mediaUrl = msg.mediaUrl || undefined;
      if (msg.mediaEncrypted && msg.mediaNonce && mediaUrl) {
        try {
          const mediaResponse = await fetch(mediaUrl);
          const mediaBuffer = await mediaResponse.arrayBuffer();
          const decryptedBlob = await decryptFile('group', groupChatId, mediaBuffer, msg.mediaNonce);
          if (decryptedBlob) {
            const decryptedUrl = URL.createObjectURL(decryptedBlob);
            mediaUrlsRef.current.push(decryptedUrl);
            mediaUrl = decryptedUrl;
          }
        } catch { mediaUrl = undefined; }
      }

      return { ...msg, content, mediaUrl } as Message;
    };

    // ── Initial load ────────────────────────────────────────────────────────
    const initialLoad = async () => {
      try {
        const [detailsRes, messagesRes] = await Promise.all([
          fetch(`/api/group-chats/${groupChatId}`),
          fetch(`/api/group-chats/${groupChatId}/messages?limit=50`),
        ]);

        if (!detailsRes.ok) throw new Error('Failed to fetch group');
        const detailsData = await detailsRes.json();
        setGroupChat(detailsData.groupChat);
        setMembers(detailsData.members);
        setUserRole(detailsData.userRole);
        groupNameRef.current = detailsData.groupChat.name;

        const memberIds = (detailsData.members as Member[]).map((m) => m.userId);
        memberIdsRef.current = memberIds;

        await initEncryption(memberIds);

        if (!messagesRes.ok) throw new Error('Failed to fetch messages');
        const messagesData = await messagesRes.json();

        revokeMediaUrls();
        const decrypted: Message[] = await Promise.all(
          (messagesData.messages as Message[]).map((m) => decryptAndMigrateMsg(m, memberIds))
        );

        setMessages(decrypted);
        if (decrypted.length > 0) {
          lastMessageIdRef.current = decrypted[decrypted.length - 1].id;
          previousMessageCount.current = decrypted.length;
        }
        hasInitialLoadRef.current = true;
      } catch (error) {
        console.error('Error fetching group chat:', error);
        toast({ variant: 'destructive', title: 'Error', description: 'Failed to load group chat' });
      } finally {
        setLoading(false);
      }
    };

    // ── Incremental poll: only new messages ─────────────────────────────────
    const pollNewMessages = async () => {
      if (!hasInitialLoadRef.current) return;
      const afterId = lastMessageIdRef.current;
      if (!afterId) return;

      try {
        const response = await fetch(`/api/group-chats/${groupChatId}/messages?after=${afterId}`);
        if (!response.ok) return;
        const data = await response.json();
        if (!data.messages || data.messages.length === 0) return;

        const memberIds = memberIdsRef.current;
        const newDecrypted: Message[] = await Promise.all(
          (data.messages as Message[]).map((m) => decryptAndMigrateMsg(m, memberIds))
        );

        setMessages((prev) => {
          const existingIds = new Set(prev.map((m) => m.id));
          const trulyNew = newDecrypted.filter((m) => !existingIds.has(m.id));
          if (trulyNew.length === 0) return prev;
          if (!checkIfAtBottom()) setHasNewMessages(true);
          return [...prev, ...trulyNew];
        });

        lastMessageIdRef.current = data.messages[data.messages.length - 1].id;

        // Toast for new messages from others
        const lastNew = newDecrypted[newDecrypted.length - 1];
        if (lastNew && lastNew.userId !== currentUserId) {
          toast({
            title: `👥 New message in ${groupNameRef.current}`,
            description: `${lastNew.sender?.displayName || lastNew.sender?.name || 'Someone'}: ${lastNew.content.substring(0, 50)}${lastNew.content.length > 50 ? '...' : ''}`,
            duration: 5000,
          });
        }
      } catch { /* silently ignore poll errors */ }
    };

    initialLoad();

    const getInterval = () => (document.hidden ? 10000 : 4000);
    let intervalId = setInterval(pollNewMessages, getInterval());
    const onVisibilityChange = () => {
      clearInterval(intervalId);
      if (!document.hidden) pollNewMessages();
      intervalId = setInterval(pollNewMessages, getInterval());
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      clearInterval(intervalId);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      revokeMediaUrls();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, groupChatId, router]); // minimal deps — all other state accessed via refs

  const handleSendMessage = async (text?: string, files?: File[]) => {
    const messageText = text || newMessage;
    if ((!messageText.trim() && (!files || files.length === 0)) || sending) return;

    setSending(true);
    try {
      // Use cached member IDs (populated during initialLoad)
      const memberIds = memberIdsRef.current;
      const encrypted = await encryptMessage('group', groupChatId, memberIds, messageText.trim());

      let mediaUrl: string | undefined;
      let mediaType: string | undefined;
      let mediaEncrypted: boolean | undefined;
      let mediaNonce: string | undefined;

      if (files && files.length > 0) {
        const file = files[0];
        const encryptedFile = await encryptFile('group', groupChatId, memberIds, file);
        const formData = new FormData();
        formData.append('file', encryptedFile.file);
        const uploadRes = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });
        if (!uploadRes.ok) {
          throw new Error('Failed to upload file');
        }
        const uploadData = await uploadRes.json();
        mediaUrl = uploadData.url;
        mediaType = file.type.startsWith('image/')
          ? 'image'
          : file.type.startsWith('video/')
            ? 'video'
            : file.type.startsWith('audio/')
              ? 'audio'
              : 'file';
        mediaEncrypted = true;
        mediaNonce = encryptedFile.mediaNonce;
      }

      const response = await fetch(`/api/group-chats/${groupChatId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: encrypted.ciphertext,
          contentNonce: encrypted.nonce,
          isEncrypted: true,
          ...(mediaUrl && { mediaUrl }),
          ...(mediaType && { mediaType }),
          ...(mediaEncrypted && { mediaEncrypted }),
          ...(mediaNonce && { mediaNonce }),
        }),
      });

      if (!response.ok) throw new Error('Failed to send message');

      const data = await response.json();
      setMessages((prev) => [...prev, data.message]);
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to send message',
      });
    } finally {
      setSending(false);
    }
  };

  const handleLeaveGroup = async () => {
    if (!confirm('Are you sure you want to leave this group?')) return;

    try {
      const response = await fetch(`/api/group-chats/${groupChatId}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to leave group');

      toast({
        title: 'Left group',
        description: 'You have left the group chat',
      });

      router.push('/');
    } catch (error) {
      console.error('Error leaving group:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to leave group',
      });
    }
  };

  const fetchAvailableFriends = useCallback(async () => {
    try {
      const response = await fetch('/api/friends');
      if (!response.ok) throw new Error('Failed to fetch friends');
      const data = await response.json();
      
      // Filter out friends who are already members
      const memberIds = new Set(members.map(m => m.userId));
      const available = data.friends
        .filter((f: any) => f.status === 'accepted' && f.friend && !memberIds.has(f.friend.id))
        .map((f: any) => f.friend);
      
      setAvailableFriends(available);
    } catch (error) {
      console.error('Error fetching friends:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load friends',
      });
    }
  }, [members, toast]);

  const handleAddMember = async (friendId: string) => {
    setAddingMember(true);
    try {
      const response = await fetch(`/api/group-chats/${groupChatId}/members`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          newMemberId: friendId,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to add member');
      }

      toast({
        title: 'Member added',
        description: 'Successfully added member to the group',
      });

      // Refresh members list
      const detailsRes = await fetch(`/api/group-chats/${groupChatId}`);
      if (detailsRes.ok) {
        const detailsData = await detailsRes.json();
        setMembers(detailsData.members);
      }

      setShowAddMember(false);
      await fetchAvailableFriends(); // Refresh available friends
    } catch (error: any) {
      console.error('Error adding member:', error);
      toast({
        variant: 'destructive',
        title: 'Failed to add member',
        description: error.message || 'An error occurred',
      });
    } finally {
      setAddingMember(false);
    }
  };

  // Fetch available friends when showing add member dialog
  useEffect(() => {
    if (showAddMember) {
      fetchAvailableFriends();
    }
  }, [showAddMember, fetchAvailableFriends]);

  if (loading || status === 'loading') {
    return (
      <div className="flex flex-col h-[calc(100dvh-4rem)] md:h-screen bg-background">
        {/* Skeleton header */}
        <div className="px-3 py-2.5 border-b border-border/40 flex items-center gap-3">
          <div className="skeleton w-9 h-9 rounded-xl" />
          <div className="skeleton w-10 h-10 rounded-full shrink-0" />
          <div className="flex-1 space-y-1.5">
            <div className="skeleton h-4 w-36 rounded" />
            <div className="skeleton h-3 w-20 rounded" />
          </div>
          <div className="skeleton w-9 h-9 rounded-xl" />
          <div className="skeleton w-9 h-9 rounded-xl" />
        </div>
        {/* Skeleton messages */}
        <div className="flex-1 p-4 chat-bg space-y-4">
          {[80, 140, 100, 60, 200, 80, 120].map((w, i) => (
            <div key={i} className={`flex items-end gap-2 ${i % 2 === 0 ? '' : 'flex-row-reverse'}`}>
              {i % 2 === 0 && <div className="skeleton w-8 h-8 rounded-full shrink-0" />}
              <div className="skeleton h-10 rounded-2xl" style={{ width: w }} />
            </div>
          ))}
        </div>
        {/* Skeleton input */}
        <div className="p-4 border-t border-border/40 flex items-center gap-2">
          <div className="skeleton w-9 h-9 rounded-xl" />
          <div className="skeleton flex-1 h-10 rounded-xl" />
          <div className="skeleton w-9 h-9 rounded-xl" />
        </div>
      </div>
    );
  }

  if (!groupChat) {
    return (
      <div className="h-screen w-full flex items-center justify-center">
        <p className="text-muted-foreground">Group chat not found</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100dvh-4rem)] md:h-screen min-h-0 bg-background">{/* removed broken gradient that adds animated layers */}
      {/* Header */}
      <motion.header
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="bg-background/95 backdrop-blur-sm border-b border-border/50 px-3 py-2.5 flex items-center justify-between gap-2 shadow-sm shrink-0"
      >
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <Button variant="ghost" size="icon" onClick={() => router.back()} className="shrink-0 h-9 w-9">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
            <Users className="w-4 h-4 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="font-semibold text-sm leading-tight truncate">{groupChat.name}</h1>
            <p className="text-[11px] leading-tight text-muted-foreground">
              {members.length} {members.length === 1 ? 'member' : 'members'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <Button variant="ghost" size="icon" className="text-primary h-9 w-9"
            onClick={() => router.push(`/call?room=group-${groupChatId}&type=voice`)} aria-label="Voice call">
            <Phone className="w-5 h-5" />
          </Button>
          <Button variant="ghost" size="icon" className="text-primary h-9 w-9"
            onClick={() => router.push(`/call?room=group-${groupChatId}&type=video`)} aria-label="Video call">
            <Video className="w-5 h-5" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9">
                <Settings className="w-5 h-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setShowMembers(true)}>View Members</DropdownMenuItem>
              <DropdownMenuItem onClick={handleLeaveGroup} className="text-destructive">Leave Group</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </motion.header>

      {/* Messages */}
      <div
        ref={containerRef}
        className="flex-1 min-h-0 overflow-y-auto p-4 relative chat-bg"
        onScroll={handleScroll}
      >
        <div className="max-w-4xl mx-auto space-y-4">
          {messages.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p>No messages yet</p>
              <p className="text-xs mt-1">Be the first to send a message!</p>
            </div>
          ) : (
            messages.map((message, index) => {
              const showAvatar = index === 0 || messages[index - 1].userId !== message.userId;

              return (
                <ChatMessage
                  key={message.id}
                  showAvatar={showAvatar}
                  isCurrentUser={message.userId === currentUserId}
                  message={{
                    id: message.id,
                    content: message.content,
                    timestamp: new Date(message.createdAt),
                    author: {
                      uid: message.userId,
                      displayName: message.sender?.displayName || message.sender?.name || 'User',
                      photoURL: message.sender?.photoURL || '',
                      imageHint: (message.sender?.displayName || message.sender?.name || message.sender?.email || 'U').substring(0, 2).toUpperCase(),
                    },
                    reactions: [],
                    isFlagged: false,
                  }}
                />
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {hasNewMessages && (
          <div className="absolute bottom-4 right-4">
            <Button
              size="sm"
              className="rounded-full glass-card shadow-lg border border-primary/30 hover:scale-105 transition-transform bg-primary/20 hover:bg-primary/30 flex items-center gap-2"
              onClick={() => {
                scrollToBottom(true);
                setHasNewMessages(false);
              }}
            >
              <span className="text-xs font-medium">New messages</span>
              <ArrowDown className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Input — extra bottom space on mobile to clear fixed nav */}
      <div className="bg-background/95 backdrop-blur-sm border-t border-border/50 px-4 pt-3 pb-3 shrink-0">
        <ChatInput
          value={newMessage}
          onChange={setNewMessage}
          onSend={(text, files) => handleSendMessage(text, files)}
          placeholder={`Message ${groupChat.name}`}
          disabled={sending}
        />
      </div>

      {/* Members Dialog */}
      <Dialog open={showMembers} onOpenChange={setShowMembers}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Group Members</DialogTitle>
            <DialogDescription>
              {members.length} {members.length === 1 ? 'member' : 'members'} in this group
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="h-[300px] pr-4">
            <div className="space-y-2">
              {members.map((member) => (
                <div key={member.id} className="flex items-center gap-3 p-2 rounded-lg bg-muted/50">
                  <UserAvatar
                    src={member.user?.photoURL || ''}
                    fallback={(member.user?.displayName || member.user?.name || member.user?.email || 'U').substring(0, 2).toUpperCase()}
                  />
                  <div className="flex-1">
                    <p className="font-medium text-sm">
                      {member.user?.displayName || member.user?.name || member.user?.email}
                    </p>
                    {member.role === 'admin' && (
                      <p className="text-xs text-primary">Admin</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
          {userRole === 'admin' && (
            <div className="flex gap-2 pt-4 border-t">
              <Button
                variant="default"
                className="w-full gap-2"
                onClick={() => {
                  setShowMembers(false);
                  setShowAddMember(true);
                }}
              >
                <Users className="w-4 h-4" />
                Add Member
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Add Member Dialog */}
      <Dialog open={showAddMember} onOpenChange={setShowAddMember}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Member</DialogTitle>
            <DialogDescription>
              Select a friend to add to this group
            </DialogDescription>
          </DialogHeader>
          {availableFriends.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              No friends available to add
            </div>
          ) : (
            <ScrollArea className="h-[300px] pr-4">
              <div className="space-y-2">
                {availableFriends.map((friend) => (
                  <motion.button
                    key={friend.id}
                    onClick={() => handleAddMember(friend.id)}
                    disabled={addingMember}
                    className="w-full flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors disabled:opacity-50"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <UserAvatar
                      src={friend.photoURL || ''}
                      fallback={(friend.displayName || friend.name || friend.email || 'U').substring(0, 2).toUpperCase()}
                    />
                    <div className="flex-1 text-left">
                      <p className="font-medium text-sm">
                        {friend.displayName || friend.name || friend.email}
                      </p>
                    </div>
                  </motion.button>
                ))}
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
