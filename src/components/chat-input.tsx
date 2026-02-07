"use client"

import { PlusCircle, SendHorizonal, Image as ImageIcon } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { useState, useEffect, useRef, useCallback } from 'react';
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
  const [uploadingPaste, setUploadingPaste] = useState(false);
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  // Handle media upload completion from dialog
  const handleMediaUpload = useCallback(async (url: string, type: 'image' | 'video' | 'audio' | 'file') => {
    if (!activeChannelId) return;

    setSending(true);
    try {
      const response = await fetch(`/api/channels/${activeChannelId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          content: type === 'image' ? '📷 Image' : type === 'video' ? '🎬 Video' : type === 'audio' ? '🎵 Audio' : '📎 File',
          mediaUrl: url,
          mediaType: type,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send media message');
      }

      toast({
        title: 'Media sent!',
        description: 'Your file has been shared in the channel.',
      });
    } catch (error) {
      console.error('Failed to send media message:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to send media message',
      });
    } finally {
      setSending(false);
    }
  }, [activeChannelId, toast]);

  // Handle paste for images
  const handlePaste = useCallback(async (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (const item of items) {
      if (item.type.startsWith('image/')) {
        e.preventDefault();
        const file = item.getAsFile();
        if (!file) continue;

        setUploadingPaste(true);
        toast({
          title: 'Uploading image...',
          description: 'Pasted image is being uploaded.',
        });

        try {
          const formData = new FormData();
          formData.append('file', file);

          const response = await fetch('/api/upload', {
            method: 'POST',
            body: formData,
          });

          if (!response.ok) {
            throw new Error('Upload failed');
          }

          const data = await response.json();
          await handleMediaUpload(data.url, data.type);
        } catch (error) {
          console.error('Paste upload error:', error);
          toast({
            variant: 'destructive',
            title: 'Upload failed',
            description: 'Failed to upload pasted image.',
          });
        } finally {
          setUploadingPaste(false);
        }
        break;
      }
    }
  }, [handleMediaUpload, toast]);

  // Handle file input change for quick image upload
  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingPaste(true);
    toast({
      title: 'Uploading...',
      description: file.name,
    });

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const data = await response.json();
      await handleMediaUpload(data.url, data.type);
    } catch (error) {
      console.error('File upload error:', error);
      toast({
        variant: 'destructive',
        title: 'Upload failed',
        description: 'Failed to upload file.',
      });
    } finally {
      setUploadingPaste(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, [handleMediaUpload, toast]);

  return (
    <div className="p-2 md:p-4 glass-panel border-t border-white/10 relative z-50">
      {/* Hidden file input for quick image upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*,audio/*,.pdf,.doc,.docx"
        className="hidden"
        onChange={handleFileSelect}
      />
      
      <motion.div 
        className="relative"
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
      >
        <div className="absolute left-1 md:left-2 top-1/2 -translate-y-1/2 flex items-center gap-0.5 md:gap-1 z-10 pointer-events-auto">
          {/* Plus/attachment button - triggers file picker */}
          <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }} className="pointer-events-auto">
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8 md:h-10 md:w-10 hover:text-primary pointer-events-auto"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingPaste}
            >
                <PlusCircle className="w-4 h-4 md:w-5 md:h-5" />
            </Button>
          </motion.div>
          <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }} className="pointer-events-auto">
            <MediaUploadDialog onUploadComplete={handleMediaUpload} />
          </motion.div>
          <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }} className="pointer-events-auto">
            <EmojiPicker onEmojiSelect={handleEmojiSelect} />
          </motion.div>
        </div>
        <Input 
          ref={inputRef}
          placeholder={uploadingPaste ? 'Uploading...' : `Message #${channelName}`} 
          className="pl-20 sm:pl-28 md:pl-36 pr-12 md:pr-14 h-11 md:h-12 rounded-xl glass-card border-white/20 focus:border-primary transition-all relative z-0 text-sm md:text-base" 
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          onPaste={handlePaste}
          disabled={sending || uploadingPaste || !activeChannelId}
        />
        <motion.div
          className="absolute right-1 md:right-2 top-1/2 -translate-y-1/2 z-10 pointer-events-auto"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
        >
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8 md:h-10 md:w-10 text-primary hover:bg-primary/20 pointer-events-auto"
            onClick={handleSend}
            disabled={sending || uploadingPaste || !activeChannelId || !message.trim()}
          >
              <SendHorizonal className="w-4 h-4 md:w-5 md:h-5" />
          </Button>
        </motion.div>
      </motion.div>
      
      {/* Upload indicator */}
      <AnimatePresence>
        {uploadingPaste && (
          <motion.div
            className="mt-2 text-xs text-primary px-2"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <span className="flex items-center gap-2">
              <motion.span
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              >
                ⏳
              </motion.span>
              Uploading media...
            </span>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Typing indicator */}
      <AnimatePresence>
        {message.length > 0 && !uploadingPaste && (
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
