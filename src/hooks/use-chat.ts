"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import { useToast } from './use-toast';
import { useAuth } from './use-auth';
import { useMessageSound } from './use-sound-effect';
import {
  decryptFile,
  decryptMessage,
  encryptMessage,
} from '@/lib/crypto/e2e-client';

export interface OptimisticMessage {
  id: string;
  content: string;
  contentNonce?: string;
  isEncrypted?: boolean;
  timestamp: Date;
  author: {
    uid: string;
    displayName: string;
    photoURL: string;
    imageHint: string;
  };
  reactions: { emoji: string; count: number; reacted: boolean }[];
  isFlagged?: boolean;
  toxicityReason?: string;
  mediaUrl?: string;
  mediaType?: 'image' | 'video' | 'audio' | 'file';
  mediaEncrypted?: boolean;
  mediaNonce?: string;
  status?: 'sending' | 'sent' | 'error';
  tempId?: string;
}

interface UseChatOptions {
  channelId: string | null;
  enabled?: boolean;
}

export function useChat({ channelId, enabled = true }: UseChatOptions) {
  const [messages, setMessages] = useState<OptimisticMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [hasNewMessages, setHasNewMessages] = useState(false);
  const { toast } = useToast();
  const { session } = useAuth();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const lastMessageCountRef = useRef(0);
  const channelMembersRef = useRef<string[]>([]);
  const mediaUrlsRef = useRef<string[]>([]);

  // Sound effect for incoming messages
  const currentUserId = (session?.user as any)?.id || (session?.user as any)?.uid;
  useMessageSound(messages, currentUserId, enabled);

  // Scroll to bottom function
  const scrollToBottom = useCallback((smooth = true) => {
    messagesEndRef.current?.scrollIntoView({ 
      behavior: smooth ? 'smooth' : 'auto' 
    });
  }, []);

  // Check if user is at bottom
  const checkIfAtBottom = useCallback(() => {
    if (!containerRef.current) return true;
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    const threshold = 150;
    return scrollHeight - scrollTop - clientHeight < threshold;
  }, []);

  // Handle scroll
  const handleScroll = useCallback(() => {
    const atBottom = checkIfAtBottom();
    setIsAtBottom(atBottom);
    if (atBottom) {
      setHasNewMessages(false);
    }
  }, [checkIfAtBottom]);

  const fetchChannelMembers = useCallback(async () => {
    if (!channelId) return [];
    if (channelMembersRef.current.length > 0) return channelMembersRef.current;

    try {
      const response = await fetch(`/api/channels/${channelId}/members`);
      if (!response.ok) return [];
      const data = await response.json();
      const memberIds = (data.members || []).map((member: any) => member.id);
      channelMembersRef.current = memberIds;
      return memberIds;
    } catch (error) {
      console.error('Failed to fetch channel members:', error);
      return [];
    }
  }, [channelId]);

  const revokeMediaUrls = useCallback(() => {
    for (const url of mediaUrlsRef.current) {
      URL.revokeObjectURL(url);
    }
    mediaUrlsRef.current = [];
  }, []);

  // Fetch messages from server
  useEffect(() => {
    if (!channelId || !enabled) {
      setLoading(false);
      return;
    }

    const fetchMessages = async () => {
      try {
        const memberIds = await fetchChannelMembers();
        const response = await fetch(`/api/channels/${channelId}/messages`);
        if (!response.ok) throw new Error('Failed to fetch messages');
        const data = await response.json();

        revokeMediaUrls();

        const serverMessages: OptimisticMessage[] = await Promise.all(
          data.messages.reverse().map(async (msg: any) => {
            let content = msg.message.content as string;
            const isEncrypted = !!msg.message.isEncrypted;
            const contentNonce = msg.message.contentNonce as string | undefined;

            if (isEncrypted && contentNonce) {
              const decrypted = await decryptMessage('channel', channelId, content, contentNonce);
              content = decrypted ?? '[Encrypted message]';
            }

            if (!isEncrypted && content && memberIds.length > 0) {
              try {
                const encrypted = await encryptMessage('channel', channelId, memberIds, content);
                await fetch('/api/messages/encrypt', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    type: 'channel',
                    id: msg.message.id,
                    content: encrypted.ciphertext,
                    contentNonce: encrypted.nonce,
                  }),
                });
              } catch (error) {
                console.error('Failed to migrate message encryption:', error);
              }
            }

            let mediaUrl = msg.message.mediaUrl || undefined;
            if (msg.message.mediaEncrypted && msg.message.mediaNonce && mediaUrl) {
              try {
                const mediaResponse = await fetch(mediaUrl);
                const mediaBuffer = await mediaResponse.arrayBuffer();
                const decryptedBlob = await decryptFile('channel', channelId, mediaBuffer, msg.message.mediaNonce);
                if (decryptedBlob) {
                  const decryptedUrl = URL.createObjectURL(decryptedBlob);
                  mediaUrlsRef.current.push(decryptedUrl);
                  mediaUrl = decryptedUrl;
                }
              } catch (error) {
                console.error('Failed to decrypt media:', error);
                mediaUrl = undefined;
              }
            }

            return {
              id: msg.message.id,
              content,
              contentNonce: msg.message.contentNonce || undefined,
              isEncrypted: msg.message.isEncrypted || false,
              timestamp: msg.message.createdAt,
              author: {
                uid: msg.user.id,
                displayName: msg.user.displayName || msg.user.name || 'Unknown',
                photoURL: msg.user.photoURL || msg.user.image || '',
                imageHint: '',
              },
              reactions: [],
              isFlagged: false,
              mediaUrl,
              mediaType: msg.message.mediaType as 'image' | 'video' | 'audio' | 'file' | undefined,
              mediaEncrypted: msg.message.mediaEncrypted || false,
              mediaNonce: msg.message.mediaNonce || undefined,
              status: 'sent',
            };
          })
        );

        setMessages(prevMessages => {
          // Merge with optimistic messages
          const optimisticMessages = prevMessages.filter(m => m.status === 'sending' || m.status === 'error');
          return [...serverMessages, ...optimisticMessages];
        });

        // Check if new messages arrived while user was scrolled up
        if (serverMessages.length > lastMessageCountRef.current) {
          if (!checkIfAtBottom()) {
            setHasNewMessages(true);
          }
        }
        lastMessageCountRef.current = serverMessages.length;
        
      } catch (error) {
        console.error("Failed to fetch messages:", error);
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Failed to load messages',
        });
      } finally {
        setLoading(false);
      }
    };

    fetchMessages();
    const interval = setInterval(fetchMessages, 3000);
    return () => {
      clearInterval(interval);
      revokeMediaUrls();
    };
  }, [channelId, enabled, toast, checkIfAtBottom, fetchChannelMembers, revokeMediaUrls]);

  // Auto-scroll when new messages arrive (only if at bottom)
  useEffect(() => {
    if (messages.length > 0 && isAtBottom && !loading) {
      scrollToBottom(true);
    }
  }, [messages.length, isAtBottom, loading, scrollToBottom]);

  // Send message with optimistic update
  const sendMessage = useCallback(async (
    content: string,
    mediaUrl?: string,
    mediaType?: 'image' | 'video' | 'audio' | 'file',
    mediaEncrypted?: boolean,
    mediaNonce?: string
  ) => {
    if (!channelId || !session?.user) return;

    const tempId = `temp-${Date.now()}-${Math.random()}`;
    const user = session.user as any;

    // Create optimistic message
    const optimisticMessage: OptimisticMessage = {
      id: tempId,
      tempId,
      content,
      timestamp: new Date(),
      author: {
        uid: user.id || user.uid || '',
        displayName: user.displayName || user.name || 'You',
        photoURL: user.photoURL || user.image || '',
        imageHint: '',
      },
      reactions: [],
      mediaUrl,
      mediaType,
      mediaEncrypted: !!mediaEncrypted,
      mediaNonce,
      status: 'sending',
    };

    // Add optimistic message immediately
    setMessages(prev => [...prev, optimisticMessage]);
    
    // Scroll to bottom immediately
    setTimeout(() => scrollToBottom(true), 50);

    try {
      const memberIds = await fetchChannelMembers();
      const encrypted = await encryptMessage('channel', channelId, memberIds, content.trim());

      const response = await fetch(`/api/channels/${channelId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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

      if (!response.ok) {
        let payload: any = null;
        try {
          payload = await response.json();
        } catch {
          // ignore
        }
        const reason = payload?.toxicityReason;
        const errorMessage = payload?.error || 'Failed to send message';
        
        if (reason) {
          // Update message to show it was flagged
          setMessages(prev =>
            prev.map(m =>
              m.tempId === tempId
                ? { ...m, status: 'error', toxicityReason: reason, isFlagged: true }
                : m
            )
          );
          toast({
            variant: 'destructive',
            title: 'Message blocked',
            description: reason,
            duration: 12000,
          });
          return;
        }
        
        throw new Error(errorMessage);
      }

      const data = await response.json();
      const realMessage = data.message;

      // Update optimistic message with real data
      setMessages(prev =>
        prev.map(m =>
          m.tempId === tempId
            ? {
                ...m,
                id: realMessage.id,
                tempId: undefined,
                status: 'sent',
                timestamp: realMessage.createdAt,
                contentNonce: realMessage.contentNonce,
                isEncrypted: realMessage.isEncrypted,
              }
            : m
        )
      );
    } catch (error) {
      console.error('Failed to send message:', error);
      
      // Mark message as failed
      setMessages(prev =>
        prev.map(m =>
          m.tempId === tempId
            ? { ...m, status: 'error' }
            : m
        )
      );

      toast({
        variant: 'destructive',
        title: 'Error',
        description: (error as Error).message || 'Failed to send message',
      });
    }
  }, [channelId, session, toast, scrollToBottom, fetchChannelMembers]);

  // Retry failed message
  const retryMessage = useCallback(async (tempId: string) => {
    const message = messages.find(m => m.tempId === tempId);
    if (!message) return;

    // Remove the failed message
    setMessages(prev => prev.filter(m => m.tempId !== tempId));
    
    // Re-send with same content
    await sendMessage(message.content, message.mediaUrl, message.mediaType, message.mediaEncrypted, message.mediaNonce);
  }, [messages, sendMessage]);

  // Delete failed message
  const deleteFailedMessage = useCallback((tempId: string) => {
    setMessages(prev => prev.filter(m => m.tempId !== tempId));
  }, []);

  // Scroll to bottom and clear new messages badge
  const scrollToBottomAndClearBadge = useCallback(() => {
    scrollToBottom(true);
    setHasNewMessages(false);
  }, [scrollToBottom]);

  return {
    messages,
    loading,
    sendMessage,
    retryMessage,
    deleteFailedMessage,
    scrollToBottom: scrollToBottomAndClearBadge,
    messagesEndRef,
    containerRef,
    handleScroll,
    hasNewMessages,
    isAtBottom,
  };
}
