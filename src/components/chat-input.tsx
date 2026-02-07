"use client"

import { PlusCircle, SendHorizonal } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { motion, AnimatePresence } from 'framer-motion';
import EmojiPicker from './emoji-picker';
import MediaUploadDialog from './media-upload-dialog';
import { usePathname } from 'next/navigation';

export default function ChatInput() {
  const pathname = usePathname();
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [activeChannelId, setActiveChannelId] = useState<string | null>(null);
  const [channelName, setChannelName] = useState('general');
  const { toast } = useToast();

  const handleEmojiSelect = (emoji: string) => {
    setMessage(prev => prev + emoji);
  };

  // Extract channelId from URL
  useEffect(() => {
    const channelMatch = pathname?.match(/\/channels\/([^\/]+)/);
    if (channelMatch) {
      setActiveChannelId(channelMatch[1]);
    } else {
      setActiveChannelId(null);
    }
  }, [pathname]);

  // Fetch channel name when channelId changes
  useEffect(() => {
    if (!activeChannelId) return;

    const fetchChannelName = async () => {
      try {
        const serverMatch = pathname?.match(/\/servers\/([^\/]+)/);
        if (!serverMatch) return;
        
        const serverId = serverMatch[1];
        const channelsResponse = await fetch(`/api/servers/${serverId}/channels`);
        if (!channelsResponse.ok) return;
        const channelsData = await channelsResponse.json();
        
        const channel = channelsData.channels.find((ch: any) => ch.id === activeChannelId);
        if (channel) {
          setChannelName(channel.name);
        }
      } catch (error) {
        console.error("Failed to fetch channel name:", error);
      }
    };
    
    fetchChannelName();
  }, [activeChannelId, pathname]);

  const handleSend = async () => {
    if (!message.trim() || !activeChannelId || sending) return;

    setSending(true);
    try {
      const response = await fetch(`/api/channels/${activeChannelId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: message.trim() }),
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
      
      setMessage('');
    } catch (error) {
      console.error('Failed to send message:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: (error as Error).message || 'Failed to send message',
      });
    } finally {
      setSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="p-4 glass-panel border-t border-white/10 relative z-50">
      <motion.div 
        className="relative"
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
      >
        <div className="absolute left-2 top-1/2 -translate-y-1/2 flex items-center gap-1 z-10 pointer-events-auto">
          <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }} className="pointer-events-auto">
            <Button variant="ghost" size="icon" className="h-10 w-10 hover:text-primary pointer-events-auto">
                <PlusCircle className="w-5 h-5" />
            </Button>
          </motion.div>
          <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }} className="pointer-events-auto">
            <MediaUploadDialog />
          </motion.div>
          <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }} className="pointer-events-auto">
            <EmojiPicker onEmojiSelect={handleEmojiSelect} />
          </motion.div>
        </div>
        <Input 
          placeholder={`Message #${channelName}`} 
          className="pl-36 pr-14 h-12 rounded-xl glass-card border-white/20 focus:border-primary transition-all relative z-0" 
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          disabled={sending || !activeChannelId}
        />
        <motion.div
          className="absolute right-2 top-1/2 -translate-y-1/2 z-10 pointer-events-auto"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
        >
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-10 w-10 text-primary hover:bg-primary/20 pointer-events-auto"
            onClick={handleSend}
            disabled={sending || !activeChannelId || !message.trim()}
          >
              <SendHorizonal className="w-5 h-5" />
          </Button>
        </motion.div>
      </motion.div>
      
      {/* Typing indicator */}
      <AnimatePresence>
        {message.length > 0 && (
          <motion.div
            className="mt-2 text-xs text-muted-foreground px-2"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <span className="flex items-center gap-1">
              <motion.span
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                ●
              </motion.span>
              Someone is typing...
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
