'use client';

import { useState, useEffect, useRef, use, useCallback } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
// Use native scrolling for better mobile behavior
import UserAvatar from '@/components/user-avatar';
import ChatMessage from '@/components/chat-message';
import ChatInput from '@/components/chat/ChatInput';
import { Send, ArrowLeft, Archive, MoreVertical, Loader2, Phone, Video, ArrowDown } from 'lucide-react';
import { motion } from 'framer-motion';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  decryptMessage,
  getDmScopeId,
  decryptFile,
} from '@/lib/crypto/e2e-client';
import { compressImage } from '@/lib/image-compress';
import { useWebRTC } from '@/hooks/use-webrtc';
import CallScreen from '@/components/call/CallScreen';

interface Message {
  id: string;
  content: string;
  contentNonce?: string | null;
  isEncrypted?: boolean | null;
  senderId: string;
  receiverId: string;
  createdAt: Date;
  read: boolean;
  archived: boolean;
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

interface User {
  id: string;
  email: string;
  name: string | null;
  displayName: string | null;
  photoURL: string | null;
}

export default function DMPage({ params }: { params: Promise<{ userId: string }> }) {

  const { userId } = use(params);
  const { status, session } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const currentUserId = (session?.user as any)?.id || (session?.user as any)?.uid;

  // ── WebRTC calling ──────────────────────────────────────────────────────────
  const {
    callState,
    remoteParticipant,
    localStream,
    remoteStream,
    isMuted,
    isCameraOff,
    startCall,
    acceptCall,
    declineCall,
    endCall,
    toggleMute,
    toggleCamera,
  } = useWebRTC();

  // ────────────────────────────────────────────────────────────────────────────

  const [messages, setMessages] = useState<Message[]>([]);
  const [otherUser, setOtherUser] = useState<User | null>(null);

  const handleVoiceCall = useCallback(() => {
    if (!otherUser) return;
    startCall(
      {
        userId: otherUser.id,
        displayName: otherUser.displayName || otherUser.name || otherUser.email?.split('@')[0] || 'User',
        photoURL: otherUser.photoURL,
      },
      'voice',
    );
  }, [otherUser, startCall]);

  const handleVideoCall = useCallback(() => {
    if (!otherUser) return;
    startCall(
      {
        userId: otherUser.id,
        displayName: otherUser.displayName || otherUser.name || otherUser.email?.split('@')[0] || 'User',
        photoURL: otherUser.photoURL,
      },
      'video',
    );
  }, [otherUser, startCall]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [hasNewMessages, setHasNewMessages] = useState(false);
  const previousMessageCount = useRef<number>(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const mediaUrlsRef = useRef<string[]>([]);

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

    // Mark this conversation as viewed for notification badge
    const stored = localStorage.getItem('viewedConversations');
    const viewedSet = stored ? new Set(JSON.parse(stored)) : new Set();
    viewedSet.add(userId);
    localStorage.setItem('viewedConversations', JSON.stringify(Array.from(viewedSet)));
    
    // Dispatch event to notify other components
    window.dispatchEvent(new Event('viewedConversationsUpdated'));

    const fetchConversation = async () => {
      try {
        // Always fetch the other user's profile (conversation may be empty)
        const otherRes = await fetch(`/api/users/${userId}`);
        if (otherRes.ok) {
          const otherData = await otherRes.json();
          setOtherUser(otherData.user);
        }

        const response = await fetch(`/api/conversations/${userId}`);
        if (!response.ok) throw new Error('Failed to fetch conversation');
        const data = await response.json();
        
        // Deduplicate messages by ID
        revokeMediaUrls();
        const uniqueMessages = Array.from(
          new Map(data.messages.map((m: Message) => [m.id, m])).values()
        ) as Message[];

        const scopeId = getDmScopeId(userId, (session?.user as any)?.id || '');

        // Detect base64 ciphertext that may have been stored without proper flags
        const looksLikeCiphertext = (s: string) => {
          if (!s || s.length < 20) return false;
          const stripped = s.replace(/[\s\n\r]/g, '');
          const b64Chars = (stripped.match(/[A-Za-z0-9+/=]/g) || []).length;
          return b64Chars / stripped.length > 0.97 && stripped.length > 30 && !s.includes(' ');
        };

        const decryptedMessages = await Promise.all(
          uniqueMessages.map(async (msg) => {
            let content = msg.content;
            // Try to decrypt messages that were previously encrypted with E2E keys
            if (msg.isEncrypted || msg.contentNonce) {
              if (msg.contentNonce) {
                const decrypted = await decryptMessage('dm', scopeId, msg.content, msg.contentNonce);
                content = decrypted ?? '🔒 Encrypted message';
              } else {
                // isEncrypted true but no nonce — key was lost
                content = '🔒 Encrypted message';
              }
            } else if (looksLikeCiphertext(msg.content)) {
              // Fallback: content looks like base64 ciphertext but flags weren't set properly
              content = '🔒 Encrypted message';
            }

            let mediaUrl = msg.mediaUrl || undefined;
            if (msg.mediaEncrypted && msg.mediaNonce && mediaUrl) {
              try {
                const mediaResponse = await fetch(mediaUrl);
                const mediaBuffer = await mediaResponse.arrayBuffer();
                const decryptedBlob = await decryptFile('dm', scopeId, mediaBuffer, msg.mediaNonce);
                if (decryptedBlob) {
                  const decryptedUrl = URL.createObjectURL(decryptedBlob);
                  mediaUrlsRef.current.push(decryptedUrl);
                  mediaUrl = decryptedUrl;
                }
              } catch (error) {
                console.error('Failed to decrypt DM media:', error);
                mediaUrl = undefined;
              }
            }

            return {
              ...msg,
              content,
              mediaUrl,
            } as Message;
          })
        );
        
        const atBottom = checkIfAtBottom();
        if (!atBottom && decryptedMessages.length > previousMessageCount.current) {
          setHasNewMessages(true);
        }

        // Check for new messages and show notification
        if (decryptedMessages.length > previousMessageCount.current && previousMessageCount.current > 0) {
          const newMessagesArray = decryptedMessages.slice(previousMessageCount.current);
          const lastNewMessage = newMessagesArray[newMessagesArray.length - 1];
          
          // Only notify if the new message is from the other user (not sent by current user)
          if (lastNewMessage && lastNewMessage.senderId === userId) {
            toast({
              title: '💬 New message',
              description: `${otherUser?.displayName || otherUser?.name || 'User'}: ${lastNewMessage.content.substring(0, 50)}${lastNewMessage.content.length > 50 ? '...' : ''}`,
              duration: 3000,
            });
          }
        }
        previousMessageCount.current = decryptedMessages.length;
        setMessages(decryptedMessages);
      } catch (error) {
        console.error('Error fetching conversation:', error);
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Failed to load conversation',
        });
      } finally {
        setLoading(false);
      }
    };

    if (status === 'authenticated') {
      fetchConversation();
      const interval = setInterval(fetchConversation, 3000); // Poll every 3 seconds
      return () => {
        clearInterval(interval);
        revokeMediaUrls();
      };
    }
  }, [status, userId, router, toast, otherUser, session, revokeMediaUrls, checkIfAtBottom]);

  const handleSendMessage = async (text?: string, files?: File[]) => {
    const messageText = text || newMessage;
    if ((!messageText.trim() && (!files || files.length === 0)) || sending) return;

    setSending(true);
    try {
      let mediaUrl: string | undefined;
      let mediaType: string | undefined;

      if (files && files.length > 0) {
        let file = files[0];
        // Compress images to save mobile data
        if (file.type.startsWith('image/')) {
          file = await compressImage(file);
        }
        const formData = new FormData();
        formData.append('file', file);
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
      }

      const response = await fetch('/api/direct-messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          receiverId: userId,
          content: messageText.trim(),
          isEncrypted: false,
          ...(mediaUrl && { mediaUrl }),
          ...(mediaType && { mediaType }),
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

  /** Send an unencrypted GIF (public Giphy URL — no sensitive content) */
  const handleSendGif = async (gifUrl: string) => {
    if (sending) return;
    setSending(true);
    try {
      const response = await fetch('/api/direct-messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          receiverId: userId,
          content: '🎞️ GIF',
          isEncrypted: false,
          mediaUrl: gifUrl,
          mediaType: 'gif',
        }),
      });
      if (!response.ok) throw new Error('Failed to send GIF');
      const data = await response.json();
      setMessages((prev) => [...prev, data.message]);
    } catch {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to send GIF' });
    } finally {
      setSending(false);
    }
  };

  /** Send a user sticker (R2 URL, unencrypted PNG) */
  const handleSendSticker = async (stickerUrl: string) => {
    if (sending) return;
    setSending(true);
    try {
      const response = await fetch('/api/direct-messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          receiverId: userId,
          content: '🎨 Sticker',
          isEncrypted: false,
          mediaUrl: stickerUrl,
          mediaType: 'sticker',
        }),
      });
      if (!response.ok) throw new Error('Failed to send sticker');
      const data = await response.json();
      setMessages((prev) => [...prev, data.message]);
    } catch {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to send sticker' });
    } finally {
      setSending(false);
    }
  };

  const handleArchive = async () => {
    try {
      const response = await fetch(`/api/conversations/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ archived: true }),
      });

      if (!response.ok) throw new Error('Failed to archive');

      toast({
        title: 'Conversation archived',
        description: 'This conversation has been archived',
      });

      router.push('/dm');
    } catch (error) {
      console.error('Error archiving conversation:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to archive conversation',
      });
    }
  };

  if (loading || status === 'loading') {
    return (
      <div className="h-[calc(100dvh-4rem)] md:h-full flex flex-col bg-background">
        {/* Skeleton header */}
        <div className="px-3 py-2.5 border-b border-border/40 flex items-center gap-3">
          <div className="skeleton w-9 h-9 rounded-xl md:hidden" />
          <div className="skeleton w-11 h-11 rounded-full shrink-0" />
          <div className="flex-1 space-y-1.5">
            <div className="skeleton h-4 w-36 rounded" />
            <div className="skeleton h-3 w-20 rounded" />
          </div>
          <div className="skeleton w-9 h-9 rounded-xl" />
          <div className="skeleton w-9 h-9 rounded-xl" />
        </div>
        {/* Skeleton messages */}
        <div className="flex-1 p-4 chat-bg space-y-4">
          {[80, 60, 200, 100, 140, 80, 120].map((w, i) => (
            <div key={i} className={`flex items-end gap-2 ${i % 2 === 0 ? '' : 'flex-row-reverse'}`}>
              {i % 2 === 0 && <div className="skeleton w-8 h-8 rounded-full shrink-0" />}
              <div className={`skeleton h-10 rounded-2xl`} style={{ width: w }} />
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

  return (
    <div className="h-[calc(100dvh-4rem)] md:h-full flex flex-col min-h-0 bg-background">
      {/* WebRTC Call Overlay */}
      <CallScreen
        callState={callState}
        remoteParticipant={remoteParticipant}
        localStream={localStream}
        remoteStream={remoteStream}
        isMuted={isMuted}
        isCameraOff={isCameraOff}
        onAccept={acceptCall}
        onDecline={declineCall}
        onEnd={endCall}
        onToggleMute={toggleMute}
        onToggleCamera={toggleCamera}
      />
      {/* Header */}
      <motion.header
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="bg-background/95 backdrop-blur-sm border-b border-border/50 px-3 py-2.5 flex items-center justify-between gap-2 shadow-sm shrink-0"
      >
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          {/* Back arrow — mobile only, desktop has sidebar */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push('/dm')}
            className="md:hidden shrink-0 h-9 w-9"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          {otherUser && (
            <>
              <div className="relative shrink-0 cursor-pointer">
                <UserAvatar
                  src={otherUser.photoURL || ''}
                  fallback={(otherUser.displayName || otherUser.name || otherUser.email || 'U').substring(0, 2).toUpperCase()}
                  status={otherUser.lastSeen === 'online' ? 'online' : 'offline'}
                />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="font-semibold text-sm leading-tight truncate">
                  {otherUser.displayName || otherUser.name || otherUser.email?.split('@')[0] || 'User'}
                </h2>
                <p className="text-[11px] leading-tight truncate text-muted-foreground">
                  {otherUser.lastSeen === 'online' ? (
                    <span className="text-green-400 font-medium">Online</span>
                  ) : (
                    'tap for info'
                  )}
                </p>
              </div>
            </>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <Button
            variant="ghost"
            size="icon"
            className="text-primary"
            onClick={handleVoiceCall}
            aria-label="Start voice call"
          >
            <Phone className="w-5 h-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-primary"
            onClick={handleVideoCall}
            aria-label="Start video call"
          >
            <Video className="w-5 h-5" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreVertical className="w-5 h-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="glass-card border-white/20">
              <DropdownMenuItem onClick={handleArchive}>
                <Archive className="w-4 h-4 mr-2" />
                Archive Conversation
              </DropdownMenuItem>
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
        <div className="space-y-0 max-w-4xl mx-auto">
          {messages.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p>No messages yet</p>
              <p className="text-xs mt-1">Start the conversation!</p>
            </div>
          ) : (
            messages.map((msg, index) => {
              const showAvatar = index === 0 || messages[index - 1].senderId !== msg.senderId;
              
              // Parse date properly - handle both string and Date objects
              let timestamp: Date;
              if (typeof msg.createdAt === 'string') {
                timestamp = new Date(msg.createdAt);
              } else if (msg.createdAt instanceof Date) {
                timestamp = msg.createdAt;
              } else {
                timestamp = new Date();
              }

              // Get display name with fallback to email username or Anonymous
              const displayName = msg.sender?.displayName 
                || msg.sender?.name 
                || msg.sender?.email?.split('@')[0] 
                || 'Anonymous';

              return (
                <ChatMessage
                  key={`${msg.id}-${index}`}
                  showAvatar={showAvatar}
                  isCurrentUser={msg.senderId === currentUserId}
                  message={{
                    id: msg.id,
                    content: msg.content,
                    timestamp: timestamp,
                    author: {
                      uid: msg.senderId,
                      displayName: displayName,
                      photoURL: msg.sender?.photoURL || '',
                      imageHint: displayName.substring(0, 2).toUpperCase(),
                    },
                    reactions: [],
                    isFlagged: false,
                    mediaUrl: msg.mediaUrl ?? undefined,
                    mediaType: (msg.mediaType ?? undefined) as any,
                    // Derive read receipt from the DM read boolean
                    readStatus: msg.senderId === currentUserId
                      ? (msg.read ? 'read' : 'sent')
                      : undefined,
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
          onSendGif={handleSendGif}
          onSendSticker={handleSendSticker}
          placeholder={`Message ${otherUser?.displayName || otherUser?.name || 'user'}...`}
          disabled={sending}
        />
      </div>
    </div>
  );
}
