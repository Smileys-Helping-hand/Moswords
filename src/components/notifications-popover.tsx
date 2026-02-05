"use client";

import { useCallback, useEffect, useState } from 'react';
import { Bell, X } from 'lucide-react';
import { Button } from './ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from './ui/popover';
import { ScrollArea } from './ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { motion, AnimatePresence } from 'framer-motion';
import UserAvatar from './user-avatar';

interface DirectMessage {
  id: string;
  content: string;
  senderId: string;
  receiverId: string;
  createdAt: Date;
  sender?: {
    id: string;
    email: string;
    name: string | null;
    displayName: string | null;
    photoURL: string | null;
  };
}

export default function NotificationsPopover() {
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const { toast } = useToast();

  const fetchMessages = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/direct-messages');
      if (!response.ok) throw new Error('Failed to fetch messages');
      const data = await response.json();
      
      // Get unique conversations grouped by sender
      const conversationMap = new Map<string, DirectMessage>();
      data.messages.forEach((msg: any) => {
        const otherUserId = msg.senderId; // Simplified - in real app check if sender or receiver
        if (!conversationMap.has(otherUserId)) {
          conversationMap.set(otherUserId, msg);
        }
      });
      
      const newMessages = Array.from(conversationMap.values());
      setMessages(newMessages);
      setUnreadCount(newMessages.length);
    } catch (error) {
      console.error('Error fetching messages:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load messages',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // Fetch messages immediately on mount
  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  // Poll for new messages every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchMessages();
    }, 5000);

    return () => clearInterval(interval);
  }, [fetchMessages]);

  // Also fetch when popover opens
  useEffect(() => {
    if (isOpen) {
      fetchMessages();
    }
  }, [isOpen, fetchMessages]);

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative hover:bg-white/10">
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute top-1 right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-xs font-bold"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </motion.span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 glass-card border-white/20 p-0" align="end">
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <h3 className="font-semibold text-gradient">Direct Messages</h3>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => setIsOpen(false)}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
        
        <ScrollArea className="h-[400px]">
          {loading ? (
            <div className="p-4 space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-white/10 animate-pulse" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-24 bg-white/10 rounded animate-pulse" />
                    <div className="h-3 w-full bg-white/10 rounded animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
          ) : messages.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <Bell className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="text-sm">No direct messages yet</p>
              <p className="text-xs mt-1">Use "Add Contact" to start chatting</p>
            </div>
          ) : (
            <div className="p-2">
              <AnimatePresence>
                {messages.map((msg, index) => (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Button
                      variant="ghost"
                      className="w-full justify-start h-auto p-3 hover:bg-white/5"
                      onClick={() => {
                        // Navigate to DM view (we'll implement this next)
                        window.location.href = `/dm/${msg.senderId}`;
                        setIsOpen(false);
                      }}
                    >
                      <div className="flex items-start gap-3 w-full">
                        <UserAvatar
                          src={msg.sender?.photoURL || ''}
                          fallback={(msg.sender?.displayName || msg.sender?.email || 'U').substring(0, 2).toUpperCase()}
                          status="online"
                        />
                        <div className="flex-1 text-left">
                          <div className="flex items-center justify-between mb-1">
                            <p className="font-medium text-sm">
                              {msg.sender?.displayName || msg.sender?.name || msg.sender?.email}
                            </p>
                            <span className="text-xs text-muted-foreground">
                              {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {msg.content}
                          </p>
                        </div>
                      </div>
                    </Button>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </ScrollArea>
        
        {messages.length > 0 && (
          <div className="p-3 border-t border-white/10">
            <Button
              variant="ghost"
              className="w-full text-sm text-primary"
              onClick={() => {
                window.location.href = '/messages';
                setIsOpen(false);
              }}
            >
              View All Messages
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
