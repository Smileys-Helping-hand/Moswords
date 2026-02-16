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
  encryptMessage,
  getDmScopeId,
  ensureConversationKey,
  decryptFile,
  encryptFile,
} from '@/lib/crypto/e2e-client';

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
  const isProbablyEncryptedContent = useCallback((value: string) => {
    const trimmed = value.trim();
    if (trimmed.length < 48) return false;
    if (/\s/.test(trimmed)) return false;
    return /^[A-Za-z0-9+/=_-]+$/.test(trimmed);
  }, []);
  const { userId } = use(params);
  const { status, session } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [otherUser, setOtherUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [hasNewMessages, setHasNewMessages] = useState(false);
  const previousMessageCount = useRef<number>(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const mediaUrlsRef = useRef<string[]>([]);
  const recipientIdsRef = useRef<string[]>([]);

  const getRecipientIds = useCallback(async () => {
    if (recipientIdsRef.current.length > 0) return recipientIdsRef.current;
    const ids = [userId];
    recipientIdsRef.current = ids;
    return ids;
  }, [userId]);

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
        const recipientIds = await getRecipientIds();

        let canDecrypt = false;
        try {
          await ensureConversationKey('dm', scopeId, recipientIds);
          canDecrypt = true;
        } catch (error) {
          console.warn('Failed to ensure DM key:', error);
        }

        const decryptedMessages = await Promise.all(
          uniqueMessages.map(async (msg) => {
            let content = msg.content;
            const contentNonce = msg.contentNonce || undefined;
            const looksEncrypted = isProbablyEncryptedContent(content);
            const isEncrypted = !!msg.isEncrypted || !!contentNonce || looksEncrypted;
            if (isEncrypted) {
              if (!contentNonce || !canDecrypt) {
                content = '[Encrypted message]';
              } else {
                const decrypted = await decryptMessage('dm', scopeId, msg.content, contentNonce);
                content = decrypted ?? '[Encrypted message]';
              }
            }

            if (!isEncrypted && content && !looksEncrypted) {
              try {
                const encrypted = await encryptMessage('dm', scopeId, recipientIds, content);
                await fetch('/api/messages/encrypt', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    type: 'dm',
                    id: msg.id,
                    content: encrypted.ciphertext,
                    contentNonce: encrypted.nonce,
                  }),
                });
              } catch (error) {
                console.error('Failed to migrate DM encryption:', error);
              }
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
  }, [status, userId, router, toast, otherUser, session, revokeMediaUrls, getRecipientIds, checkIfAtBottom]);

  const handleSendMessage = async (text?: string, files?: File[]) => {
    const messageText = text || newMessage;
    if ((!messageText.trim() && (!files || files.length === 0)) || sending) return;

    setSending(true);
    try {
      const scopeId = getDmScopeId(userId, (session?.user as any)?.id || '');
      const recipientIds = await getRecipientIds();
      const encrypted = await encryptMessage('dm', scopeId, recipientIds, messageText.trim());

      let mediaUrl: string | undefined;
      let mediaType: string | undefined;
      let mediaEncrypted: boolean | undefined;
      let mediaNonce: string | undefined;

      if (files && files.length > 0) {
        const file = files[0];
        const encryptedFile = await encryptFile('dm', scopeId, recipientIds, file);
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

      const response = await fetch('/api/direct-messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          receiverId: userId,
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
      <div className="h-screen w-full flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="h-screen w-full flex flex-col min-h-0 bg-gradient-to-br from-background via-background to-primary/5">
      {/* Header */}
      <motion.header
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="glass-panel border-b border-white/10 p-4 flex flex-wrap items-center justify-between gap-3"
      >
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push('/')}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          {otherUser && (
            <>
              <UserAvatar
                src={otherUser.photoURL || ''}
                fallback={(otherUser.displayName || otherUser.email).substring(0, 2).toUpperCase()}
                status="online"
              />
              <div className="min-w-0">
                <h2 className="font-semibold truncate">
                  {otherUser.displayName || otherUser.name || otherUser.email?.split('@')[0] || 'Anonymous'}
                </h2>
                <p className="text-xs text-muted-foreground truncate hidden sm:block">{otherUser.email}</p>
              </div>
            </>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <Button
            variant="ghost"
            size="icon"
            className="text-primary"
            onClick={() => router.push(`/call?room=dm-${userId}&type=voice`)}
            aria-label="Start voice call"
          >
            <Phone className="w-5 h-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-primary"
            onClick={() => router.push(`/call?room=dm-${userId}&type=video`)}
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
        className="flex-1 min-h-0 overflow-y-auto p-4 relative"
        onScroll={handleScroll}
      >
        <div className="space-y-4 max-w-4xl mx-auto">
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

      {/* Input */}
      <div className="glass-panel border-t border-white/10 p-4">
        <ChatInput
          value={newMessage}
          onChange={setNewMessage}
          onSend={(text, files) => handleSendMessage(text, files)}
          placeholder={`Message ${otherUser?.displayName || otherUser?.name || 'user'}...`}
          disabled={sending}
        />
      </div>
    </div>
  );
}
