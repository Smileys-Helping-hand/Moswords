'use client';

import { useState, useEffect, useRef, use } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { ScrollArea } from '@/components/ui/scroll-area';
import ChatHeader from '@/components/chat-header';
import ChatMessages from '@/components/chat-messages';
import ChatInput from '@/components/chat-input';
import MainLayout from '@/components/main-layout';
import LoadingScreen from '@/components/loading-screen';
import { Loader2 } from 'lucide-react';

interface Message {
  id: string;
  content: string;
  channelId: string;
  userId: string;
  createdAt: Date;
  deleted: boolean;
  user?: {
    id: string;
    displayName: string | null;
    photoURL: string | null;
  };
}

interface Channel {
  id: string;
  name: string;
  type: string;
  serverId: string;
}

interface Server {
  id: string;
  name: string;
  imageUrl: string | null;
}

export default function ServerChannelPage({
  params,
}: {
  params: Promise<{ serverId: string; channelId: string }>;
}) {
  const { serverId, channelId } = use(params);
  const { user, status } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [channel, setChannel] = useState<Channel | null>(null);
  const [server, setServer] = useState<Server | null>(null);
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      try {
        setLoading(true);

        // Fetch server details
        const serverRes = await fetch(`/api/servers/${serverId}`);
        if (!serverRes.ok) throw new Error('Failed to fetch server');
        const serverData = await serverRes.json();
        setServer(serverData.server);

        // Fetch channel details
        const channelRes = await fetch(`/api/servers/${serverId}/channels`);
        if (!channelRes.ok) throw new Error('Failed to fetch channels');
        const channelData = await channelRes.json();
        const currentChannel = channelData.channels.find((ch: Channel) => ch.id === channelId);
        
        if (!currentChannel) {
          toast({
            variant: 'destructive',
            title: 'Channel not found',
            description: 'This channel no longer exists',
          });
          router.push('/');
          return;
        }
        setChannel(currentChannel);

        // Fetch messages
        const messagesRes = await fetch(`/api/channels/${channelId}/messages`);
        if (!messagesRes.ok) throw new Error('Failed to fetch messages');
        const messagesData = await messagesRes.json();
        
        // Transform the API response to match the Message interface
        const transformedMessages = (messagesData.messages || []).map((item: any) => ({
          id: item.message.id,
          content: item.message.content,
          channelId: item.message.channelId,
          userId: item.message.userId,
          createdAt: item.message.createdAt,
          deleted: item.message.deleted,
          user: {
            id: item.user.id,
            displayName: item.user.displayName || item.user.name,
            photoURL: item.user.photoURL || item.user.image,
          },
        }));
        setMessages(transformedMessages);
      } catch (error) {
        console.error('Error fetching data:', error);
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Failed to load channel data',
        });
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    // Poll for new messages every 3 seconds
    const interval = setInterval(async () => {
      try {
        const messagesRes = await fetch(`/api/channels/${channelId}/messages`);
        if (messagesRes.ok) {
          const messagesData = await messagesRes.json();
          const transformedMessages = (messagesData.messages || []).map((item: any) => ({
            id: item.message.id,
            content: item.message.content,
            channelId: item.message.channelId,
            userId: item.message.userId,
            createdAt: item.message.createdAt,
            deleted: item.message.deleted,
            user: {
              id: item.user.id,
              displayName: item.user.displayName || item.user.name,
              photoURL: item.user.photoURL || item.user.image,
            },
          }));
          setMessages(transformedMessages);
        }
      } catch (error) {
        console.error('Error polling messages:', error);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [user, serverId, channelId, toast, router]);

  cons
      // Transform the message to match our interface
      const newMessage = {
        id: data.message.message.id,
        content: data.message.message.content,
        channelId: data.message.message.channelId,
        userId: data.message.message.userId,
        createdAt: data.message.message.createdAt,
        deleted: data.message.message.deleted,
        user: {
          id: data.message.user.id,
          displayName: data.message.user.displayName || data.message.user.name,
          photoURL: data.message.user.photoURL || data.message.user.image,
        },
      };
      
      setMessages((prev) => [...prev, newMstring) => {
    if (!user || !content.trim()) return;

    try {
      const response = await fetch(`/api/channels/${channelId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });

      if (!response.ok) throw new Error('Failed to send message');

      const data = await response.json();
      setMessages((prev) => [...prev, data.message]);

      // Scroll to bottom after sending
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to send message',
      });
    }
  };

  if (status === 'loading' || loading) {
    return <LoadingScreen />;
  }

  if (!user) {
    return null;
  }

  return (
    <MainLayout>
      <div className="flex flex-col h-full">
        <ChatHeader
          title={channel?.name ? `# ${channel.name}` : 'Loading...'}
          subtitle={server?.name || ''}
          type="channel"
        />
        
        <ChatMessages
          messages={messages}
          currentUserId={user.id}
          type="channel"
        />

        <ChatInput
          onSendMessage={handleSendMessage}
          placeholder={`Message #${channel?.name || 'channel'}`}
        />
      </div>
    </MainLayout>
  );
}
