"use client"

import { PlusCircle, SendHorizonal, X, Upload } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { motion, AnimatePresence } from 'framer-motion';
import EmojiPicker from './emoji-picker';
import MediaUploadDialog from './media-upload-dialog';
import { usePathname } from 'next/navigation';
import { useChatContext } from '@/providers/chat-provider';
import { useDropzone } from 'react-dropzone';
import Image from 'next/image';

interface ImagePreview {
  file: File;
  url: string;
  uploadedUrl?: string;
}

export default function ChatInput() {
  const pathname = usePathname();
  const [message, setMessage] = useState('');
  const [uploading, setUploading] = useState(false);
  const [imagePreview, setImagePreview] = useState<ImagePreview | null>(null);
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeChannelId, setActiveChannelId] = useState<string | null>(null);
  const [channelName, setChannelName] = useState('general');
  
  const { sendMessage } = useChatContext();

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

  // Upload image to server
  const uploadImageToServer = useCallback(async (file: File): Promise<string | null> => {
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error('Upload failed');

      const data = await response.json();
      return data.url;
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        variant: 'destructive',
        title: 'Upload failed',
        description: 'Failed to upload image.',
      });
      return null;
    }
  }, [toast]);

  // Handle file selection (from button or drag & drop)
  const handleFileSelection = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) {
      toast({
        variant: 'destructive',
        title: 'Invalid file type',
        description: 'Please select an image file.',
      });
      return;
    }
    uploadImage(file);
  }, [toast, uploadImage]);

  // Handle paste for images
  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (const item of items) {
      if (item.type.startsWith('image/')) {
        e.preventDefault();
        const file = item.getAsFile();
        if (file) {
          handleFileSelection(file);
        }
        break;
      }
    }
  }, [handleFileSelection]);

  // Handle file input change
  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelection(file);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, [handleFileSelection]);

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
      con{...getRootProps()} className="relative">
      {/* Drag & Drop Overlay */}
      <AnimatePresence>
        {isDragActive && (
          <motion.div
            className="absolute inset-0 z-[60] bg-primary/20 backdrop-blur-sm border-4 border-dashed border-primary rounded-lg flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="text-center">
              <Upload className="w-16 h-16 text-primary mx-auto mb-4" />
              <h3 className="text-2xl font-bold text-gradient mb-2">Drop to Upload</h3>
              <p className="text-muted-foreground">Release to add image to message</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="p-2 md:p-4 glass-panel border-t border-white/10 relative z-50">
        {/* Hidden file input */}
        <input {...getInputProps()} />
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileSelect}
        />

        {/* Image Preview */}
        <AnimatePresence>
          {imagePreview && (
            <motion.div
              className="mb-3 p-3 glass-card rounded-lg border border-primary/30"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
            >
              <div className="flex items-start gap-3">
                <div className="relative w-20 h-20 rounded-lg overflow-hidden border-2 border-white/20 flex-shrink-0">
                  <Image
                    src={imagePreview.url}
                    alt="Preview"
                    fill
                    className="object-cover"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground mb-1">
                    {imagePreview.file.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {(imagePreview.file.size / 1024).toFixed(1)} KB
                  </p>
                  <p className="text-xs text-primary mt-1">
                    Add a caption below and press Enter to send
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 hover:bg-red-500/20 hover:text-red-400 flex-shrink-0"
                  onClick={handleCancelPreview}
                  disabled={uploading}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        
        <motion.div 
          className="relative"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
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
        animatImage attachment button */}
          <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }} className="pointer-events-auto">
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8 md:h-10 md:w-10 hover:text-primary pointer-events-auto"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading || !!imagePreview}
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
          placeholder={uploading ? 'Sending...' : imagePreview ? 'Add a caption (optional)' : `Message #${channelName}`} 
          className="pl-20 sm:pl-28 md:pl-36 pr-12 md:pr-14 h-11 md:h-12 rounded-xl glass-card border-white/20 focus:border-primary transition-all relative z-0 text-sm md:text-base" 
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          onPaste={handlePaste}
          disabled={uploading || !activeChannelId}
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
            disabled={uploading || !activeChannelId || (!message.trim() && !imagePreview
            className="h-8 w-8 md:h-10 md:w-10 text-primary hover:bg-primary/20 pointer-events-auto"
            onClick={handleSend}
            disabled={uploadingPaste || !activeChannelId || !message.trim()}
          >
              <SendHorizonal className="w-4 h-4 md:w-5 md:h-5" />
          </Button>
        {/* Upload indicator */}
        <AnimatePresence>
          {uploading && (
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
                Uploading and sending...
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
