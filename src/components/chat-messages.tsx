"use client";

import ChatMessage from './chat-message';
import { Hash, ArrowDown } from 'lucide-react';
import { useEffect, useState, useRef } from 'react';
import { Skeleton } from './ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from './ui/button';

interface Channel {
  id: string;
  name: string;
  type: string;
  serverId: string;
}

interface Message {
  message: {
    id: string;
    content: string;
    channelId: string;
    userId: string;
    createdAt: Date;
  };
  user: {
    id: string;
    name: string | null;
    displayName: string | null;
    image: string | null;
    photoURL: string | null;
  };
}

export default function ChatMessages() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentChannel, setCurrentChannel] = useState<Channel | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeChannelId, setActiveChannelId] = useState<string | null>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleScroll = () => {
    if (!containerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 200;
    setShowScrollButton(!isNearBottom);
  };

  // Get the first channel as active
  useEffect(() => {
    const fetchChannels = async () => {
      try {
        const serversResponse = await fetch('/api/servers');
        if (!serversResponse.ok) return;
        const serversData = await serversResponse.json();
        if (serversData.servers.length === 0) return;
        
        const firstServer = serversData.servers[0].server;
        const channelsResponse = await fetch(`/api/servers/${firstServer.id}/channels`);
        if (!channelsResponse.ok) return;
        const channelsData = await channelsResponse.json();
        
        if (channelsData.channels.length > 0) {
          const firstChannel = channelsData.channels[0];
          setActiveChannelId(firstChannel.id);
          setCurrentChannel(firstChannel);
        }
      } catch (error) {
        console.error("Failed to fetch initial channel:", error);
      }
    };
    fetchChannels();
  }, []);

  useEffect(() => {
    if (!activeChannelId) {
      setLoading(false);
      return;
    }

    const fetchMessages = async () => {
      try {
        const response = await fetch(`/api/channels/${activeChannelId}/messages`);
        if (!response.ok) throw new Error('Failed to fetch messages');
        const data = await response.json();
        setMessages(data.messages.reverse());
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
    return () => clearInterval(interval);
  }, [activeChannelId, toast]);

  if (loading) {
    return (
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
            <div className="flex items-start gap-4">
                <Skeleton className="w-16 h-16 rounded-full" />
                <div className="space-y-2">
                    <Skeleton className="h-8 w-48" />
                    <Skeleton className="h-6 w-72" />
                </div>
            </div>
            <div className="space-y-4">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-12 w-3/4" />
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-10 w-1/2" />
            </div>
        </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className="flex-1 overflow-y-auto p-4 space-y-6 relative scroll-smooth"
      onScroll={handleScroll}
    >
      <motion.div 
        className="flex items-start gap-4"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <motion.div 
          className="w-16 h-16 rounded-full glass-card flex items-center justify-center"
          whileHover={{ scale: 1.1, rotate: 5 }}
          transition={{ type: "spring", stiffness: 400, damping: 10 }}
        >
            <Hash className="w-8 h-8 text-primary" />
        </motion.div>
        <div>
            <motion.h2 
              className="text-3xl font-bold text-gradient"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
            >
              Welcome to #{currentChannel?.name}!
            </motion.h2>
            <motion.p 
              className="text-muted-foreground"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
            >
              This is the start of the #{currentChannel?.name} channel.
            </motion.p>
        </div>
      </motion.div>

      <AnimatePresence>
        {messages.map((msg, index) => {
          const prevMsg = index > 0 ? messages[index - 1] : null;
          const showAvatar = !prevMsg || prevMsg.user.id !== msg.user.id;
          
          return (
            <ChatMessage 
              key={msg.message.id} 
              message={{
                id: msg.message.id,
                content: msg.message.content,
                timestamp: msg.message.createdAt,
                author: {
                  uid: msg.user.id,
                  displayName: msg.user.displayName || msg.user.name || 'Unknown',
                  photoURL: msg.user.photoURL || msg.user.image || '',
                  imageHint: '',
                },
                reactions: [],
                isFlagged: false,
              }}
              showAvatar={showAvatar}
            />
          );
        })}
      </AnimatePresence>
      <div ref={messagesEndRef} className="h-4" />
      
      {/* Scroll to bottom button */}
      <AnimatePresence>
        {showScrollButton && (
          <motion.div
            className="absolute bottom-4 right-4 z-10"
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
          >
            <Button
              onClick={scrollToBottom}
              size="icon"
              className="rounded-full glass-card shadow-lg border border-white/20 hover:scale-110 transition-transform"
            >
              <ArrowDown className="w-5 h-5" />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

    