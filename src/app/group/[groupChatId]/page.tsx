'use client';

import { useEffect, useState, useRef, use } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import UserAvatar from '@/components/user-avatar';
import ChatMessage from '@/components/chat-message';
import { Send, ArrowLeft, Users, Settings, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface Message {
  id: string;
  content: string;
  userId: string;
  groupChatId: string;
  createdAt: Date;
  deleted: boolean;
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
  const { groupChatId } = use(params);
  const { status } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [groupChat, setGroupChat] = useState<GroupChat | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [userRole, setUserRole] = useState<string>('member');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [showMembers, setShowMembers] = useState(false);
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

    const fetchData = async () => {
      try {
        // Fetch group details
        const detailsRes = await fetch(`/api/group-chats/${groupChatId}`);
        if (!detailsRes.ok) throw new Error('Failed to fetch group');
        const detailsData = await detailsRes.json();
        setGroupChat(detailsData.groupChat);
        setMembers(detailsData.members);
        setUserRole(detailsData.userRole);

        // Fetch messages
        const messagesRes = await fetch(`/api/group-chats/${groupChatId}/messages`);
        if (!messagesRes.ok) throw new Error('Failed to fetch messages');
        const messagesData = await messagesRes.json();
        
        // Deduplicate messages by ID
        const uniqueMessages = Array.from(
          new Map(messagesData.messages.map((m: Message) => [m.id, m])).values()
        ) as Message[];
        
        // Check for new messages and show notification
        if (uniqueMessages.length > previousMessageCount.current && previousMessageCount.current > 0) {
          const newMessagesArray = uniqueMessages.slice(previousMessageCount.current);
          const lastNewMessage = newMessagesArray[newMessagesArray.length - 1];
          
          // Only notify if the new message is from another user
          if (lastNewMessage && lastNewMessage.sender) {
            toast({
              title: `New message in ${detailsData.groupChat.name}`,
              description: `${lastNewMessage.sender.displayName || lastNewMessage.sender.name || 'Someone'}: ${lastNewMessage.content.substring(0, 50)}${lastNewMessage.content.length > 50 ? '...' : ''}`,
            });
          }
        }
        previousMessageCount.current = uniqueMessages.length;
        setMessages(uniqueMessages);
      } catch (error) {
        console.error('Error fetching group chat:', error);
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Failed to load group chat',
        });
      } finally {
        setLoading(false);
      }
    };

    if (status === 'authenticated') {
      fetchData();
      const interval = setInterval(fetchData, 3000);
      return () => clearInterval(interval);
    }
  }, [status, groupChatId, router, toast, groupChat]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || sending) return;

    setSending(true);
    try {
      const response = await fetch(`/api/group-chats/${groupChatId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: newMessage.trim(),
        }),
      });

      if (!response.ok) throw new Error('Failed to send message');

      const data = await response.json();
      setMessages([...messages, data.message]);
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

  if (loading || status === 'loading') {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
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
    <div className="h-screen w-full flex flex-col bg-gradient-to-br from-background via-background to-primary/5">
      {/* Header */}
      <motion.header
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="glass-panel border-b border-white/10 p-4 flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.push('/')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
              <Users className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="font-semibold">{groupChat.name}</h1>
              <p className="text-xs text-muted-foreground">
                {members.length} {members.length === 1 ? 'member' : 'members'}
              </p>
            </div>
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <Settings className="w-5 h-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setShowMembers(true)}>
              View Members
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleLeaveGroup} className="text-destructive">
              Leave Group
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </motion.header>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4">
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
      </ScrollArea>

      {/* Input */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="glass-panel border-t border-white/10 p-4"
      >
        <form onSubmit={handleSendMessage} className="max-w-4xl mx-auto flex gap-2">
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder={`Message ${groupChat.name}`}
            disabled={sending}
            className="flex-1"
          />
          <Button type="submit" disabled={!newMessage.trim() || sending}>
            <Send className="w-4 h-4" />
          </Button>
        </form>
      </motion.div>

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
        </DialogContent>
      </Dialog>
    </div>
  );
}
