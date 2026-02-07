'use client';

import { useState, useEffect, useRef, use } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
// Use native scrolling for better mobile behavior
import UserAvatar from '@/components/user-avatar';
import ChatMessage from '@/components/chat-message';
import ChatInput from '@/components/chat/ChatInput';
import { Send, ArrowLeft, Archive, MoreVertical, Loader2, Phone, Video } from 'lucide-react';
import { motion } from 'framer-motion';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface Message {
  id: string;
  content: string;
  senderId: string;
  receiverId: string;
  createdAt: Date;
  read: boolean;
  archived: boolean;
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
  const { status } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [otherUser, setOtherUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const previousMessageCount = useRef<number>(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

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
        const uniqueMessages = Array.from(
          new Map(data.messages.map((m: Message) => [m.id, m])).values()
        ) as Message[];
        
        // Check for new messages and show notification
        if (uniqueMessages.length > previousMessageCount.current && previousMessageCount.current > 0) {
          const newMessagesArray = uniqueMessages.slice(previousMessageCount.current);
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
        previousMessageCount.current = uniqueMessages.length;
        setMessages(uniqueMessages);
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
      return () => clearInterval(interval);
    }
  }, [status, userId, router, toast, otherUser]);

  const handleSendMessage = async (text?: string, files?: File[]) => {
    const messageText = text || newMessage;
    if ((!messageText.trim() && (!files || files.length === 0)) || sending) return;

    setSending(true);
    try {
      // TODO: Implement file upload to storage service
      // For now, just send text messages
      if (files && files.length > 0) {
        console.log('Files to upload:', files);
        toast({
          title: 'File upload',
          description: 'File upload feature coming soon!',
        });
      }

      const response = await fetch('/api/direct-messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          receiverId: userId,
          content: messageText.trim(),
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
        className="glass-panel border-b border-white/10 p-4 flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
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
              <div>
                <h2 className="font-semibold">
                  {otherUser.displayName || otherUser.name || otherUser.email?.split('@')[0] || 'Anonymous'}
                </h2>
                <p className="text-xs text-muted-foreground">{otherUser.email}</p>
              </div>
            </>
          )}
        </div>

        <div className="flex items-center gap-1">
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
      <div className="flex-1 min-h-0 overflow-y-auto p-4">
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
