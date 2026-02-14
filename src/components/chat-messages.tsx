"use client";

import ChatMessage from './chat-message';
import { Hash, ArrowDown } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Skeleton } from './ui/skeleton';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from './ui/button';
import { usePathname } from 'next/navigation';
import { useChat } from '@/hooks/use-chat';

interface Channel {
  id: string;
  name: string;
  type: string;
  serverId: string;
}

export default function ChatMessages() {
  const pathname = usePathname();
  const [currentChannel, setCurrentChannel] = useState<Channel | null>(null);
  const [activeChannelId, setActiveChannelId] = useState<string | null>(null);

  // Extract channelId from URL
  useEffect(() => {
    const channelMatch = pathname?.match(/\/channels\/([^\/]+)/);
    if (channelMatch) {
      setActiveChannelId(channelMatch[1]);
    } else {
      setActiveChannelId(null);
    }
  }, [pathname]);

  // Use the new chat hook with optimistic updates
  const {
    messages,
    loading,
    retryMessage,
    deleteFailedMessage,
    scrollToBottom,
    messagesEndRef,
    containerRef,
    handleScroll,
    hasNewMessages,
  } = useChat({ 
    channelId: activeChannelId,
    enabled: !!activeChannelId 
  });


  // Fetch channel details when channelId changes
  useEffect(() => {
    if (!activeChannelId) return;

    const fetchChannelDetails = async () => {
      try {
        const serverMatch = pathname?.match(/\/servers\/([^\/]+)/);
        if (!serverMatch) return;
        
        const serverId = serverMatch[1];
        const channelsResponse = await fetch(`/api/servers/${serverId}/channels`);
        if (!channelsResponse.ok) return;
        const channelsData = await channelsResponse.json();
        
        const channel = channelsData.channels.find((ch: Channel) => ch.id === activeChannelId);
        if (channel) {
          setCurrentChannel(channel);
        }
      } catch (error) {
        console.error("Failed to fetch channel details:", error);
      }
    };
    
    fetchChannelDetails();
  }, [activeChannelId, pathname]);

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
      className="flex-1 overflow-y-auto p-3 md:p-4 pb-32 space-y-4 md:space-y-6 relative scroll-smooth smooth-scroll"
      onScroll={handleScroll}
    >
      <motion.div 
        className="flex items-start gap-3 md:gap-4"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <motion.div 
          className="w-12 h-12 md:w-16 md:h-16 rounded-full glass-card flex items-center justify-center shrink-0"
          whileHover={{ scale: 1.1, rotate: 5 }}
          transition={{ type: "spring", stiffness: 400, damping: 10 }}
        >
            <Hash className="w-6 h-6 md:w-8 md:h-8 text-primary" />
        </motion.div>
        <div className="min-w-0">
            <motion.h2 
              className="text-xl md:text-3xl font-bold text-gradient truncate"
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
          const nextMsg = index < messages.length - 1 ? messages[index + 1] : null;
          
          // Message grouping logic - within 60 seconds and same author
          const shouldGroup = prevMsg && 
            prevMsg.author.uid === msg.author.uid &&
            Math.abs(new Date(msg.timestamp).getTime() - new Date(prevMsg.timestamp).getTime()) < 60000;
          
          const isGroupedWithNext = nextMsg &&
            nextMsg.author.uid === msg.author.uid &&
            Math.abs(new Date(nextMsg.timestamp).getTime() - new Date(msg.timestamp).getTime()) < 60000;
          
          return (
            <ChatMessage 
              key={msg.id}
              message={msg}
              showAvatar={!shouldGroup}
              isGrouped={shouldGroup}
              isLastInGroup={!isGroupedWithNext}
              onRetry={msg.status === 'error' && msg.tempId ? () => retryMessage(msg.tempId!) : undefined}
              onDelete={msg.status === 'error' && msg.tempId ? () => deleteFailedMessage(msg.tempId!) : undefined}
            />
          );
        })}
      </AnimatePresence>
      <div ref={messagesEndRef} className="h-4" />
      
      {/* New Messages badge/button */}
      <AnimatePresence>
        {hasNewMessages && (
          <motion.div
            className="absolute bottom-4 right-4 z-10"
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
          >
            <Button
              onClick={scrollToBottom}
              size="default"
              className="rounded-full glass-card shadow-lg border border-primary/30 hover:scale-105 transition-transform bg-primary/20 hover:bg-primary/30 flex items-center gap-2"
            >
              <span className="text-sm font-medium">New Messages</span>
              <ArrowDown className="w-4 h-4" />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

    