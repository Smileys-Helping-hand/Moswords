"use client";

import { useState, useRef, useEffect, KeyboardEvent } from 'react';
import { Send, Smile, Plus, Mic, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import dynamic from 'next/dynamic';
import TextareaAutosize from 'react-textarea-autosize';
import { motion, AnimatePresence } from 'framer-motion';
import { useDropzone } from 'react-dropzone';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

// Utility function to merge Tailwind classes
const cn = (...inputs: any[]) => twMerge(clsx(inputs));

// Dynamically import EmojiPicker to avoid SSR issues
const EmojiPicker = dynamic(
  () => import('emoji-picker-react'),
  { 
    ssr: false,
    loading: () => (
      <div className="w-[350px] h-[400px] bg-black/80 backdrop-blur-xl border border-white/20 rounded-2xl flex items-center justify-center">
        <div className="text-white/60">Loading emojis...</div>
      </div>
    )
  }
);

interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: (text: string, files?: File[]) => void;
  placeholder?: string;
  disabled?: boolean;
  maxRows?: number;
}

interface FilePreview {
  file: File;
  preview: string;
}

export default function ChatInput({
  value,
  onChange,
  onSend,
  placeholder = "Type a message...",
  disabled = false,
  maxRows = 5,
}: ChatInputProps) {
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [files, setFiles] = useState<FilePreview[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const emojiButtonRef = useRef<HTMLButtonElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Configure react-dropzone
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (acceptedFiles) => {
      const newFiles = acceptedFiles.map(file => ({
        file,
        preview: URL.createObjectURL(file)
      }));
      setFiles(prev => [...prev, ...newFiles]);
    },
    noClick: true,
    noKeyboard: true,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp'],
      'video/*': ['.mp4', '.mov', '.avi'],
      'application/pdf': ['.pdf'],
      'text/*': ['.txt', '.md'],
    }
  });

  // Handle emoji selection
  const handleEmojiClick = (emojiData: any) => {
    const emoji = emojiData.emoji;
    const textarea = textareaRef.current;
    
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const text = value;
      const before = text.substring(0, start);
      const after = text.substring(end);
      
      onChange(before + emoji + after);
      
      // Keep focus and set cursor position after emoji
      setTimeout(() => {
        textarea.focus();
        const newPosition = start + emoji.length;
        textarea.setSelectionRange(newPosition, newPosition);
      }, 0);
    }
  };

  // Handle keyboard shortcuts
  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // Enter without Shift: Send message
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if ((value.trim() || files.length > 0) && !disabled) {
        handleSend();
      }
    }
    // Shift + Enter: Allow new line (default behavior)
  };

  // Handle send
  const handleSend = () => {
    if (disabled) return;
    
    const filesToSend = files.map(f => f.file);
    onSend(value, filesToSend);
    
    // Clear state
    onChange('');
    setFiles([]);
    
    // Revoke object URLs
    files.forEach(f => URL.revokeObjectURL(f.preview));
  };

  // Remove file from preview
  const removeFile = (index: number) => {
    URL.revokeObjectURL(files[index].preview);
    setFiles(files.filter((_, i) => i !== index));
  };

  // Handle file input
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files).map(file => ({
        file,
        preview: URL.createObjectURL(file)
      }));
      setFiles(prev => [...prev, ...newFiles]);
    }
  };

  // Close emoji picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        showEmojiPicker &&
        emojiPickerRef.current &&
        emojiButtonRef.current &&
        !emojiPickerRef.current.contains(event.target as Node) &&
        !emojiButtonRef.current.contains(event.target as Node)
      ) {
        setShowEmojiPicker(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showEmojiPicker]);

  // Cleanup object URLs on unmount
  useEffect(() => {
    return () => {
      files.forEach(f => URL.revokeObjectURL(f.preview));
    };
  }, []);

  const hasContent = value.trim().length > 0 || files.length > 0;

  return (
    <TooltipProvider>
      <div ref={containerRef} className="relative w-full max-w-4xl mx-auto">
        {/* PREVIEW DOCK - Shows file attachments */}
        <AnimatePresence>
          {files.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, y: 10, height: 0 }}
            transition={{ duration: 0.2 }}
            className="mb-2 overflow-hidden"
          >
            <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl p-3">
              <div className="flex gap-2 flex-wrap">
                {files.map((filePreview, index) => (
                  <motion.div
                    key={index}
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.8, opacity: 0 }}
                    className="relative group"
                  >
                    <div className="w-20 h-20 rounded-xl overflow-hidden border-2 border-white/20 bg-black/60">
                      {filePreview.file.type.startsWith('image/') ? (
                        <img
                          src={filePreview.preview}
                          alt={filePreview.file.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xs text-white/70 p-2 text-center">
                          {filePreview.file.name}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => removeFile(index)}
                      className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center shadow-lg transition-all hover:scale-110"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Emoji Picker - Floating Above */}
      <AnimatePresence>
        {showEmojiPicker && (
          <motion.div
            ref={emojiPickerRef}
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute bottom-full mb-2 left-0 z-[100]"
          >
            <div className="bg-black/80 backdrop-blur-xl border border-white/20 rounded-2xl overflow-hidden shadow-2xl">
              <EmojiPicker
                onEmojiClick={handleEmojiClick}
                theme="dark"
                searchPlaceHolder="Search emoji..."
                width={350}
                height={400}
                previewConfig={{ showPreview: false }}
                skinTonesDisabled={false}
                lazyLoadEmojis={true}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* THE INPUT COCKPIT */}
      <div
        {...getRootProps()}
        className={cn(
          "bg-black/40 backdrop-blur-xl border-2 rounded-2xl shadow-xl overflow-hidden transition-all duration-300",
          isDragActive
            ? "border-[#00F0FF] shadow-[0_0_20px_rgba(0,240,255,0.5)] scale-[1.02]"
            : "border-white/10"
        )}
      >
        <input {...getInputProps()} />
        
        <div className="flex items-end gap-2 p-3">
          {/* LEFT ACTIONS */}
          <div className="flex items-center gap-1">
            {/* Plus Icon - File Upload */}
            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={handleFileSelect}
              className="hidden"
              accept="image/*,video/*,.pdf,.txt,.md"
            />
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="shrink-0 hover:bg-white/10 hover:text-white transition-all rounded-xl"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Plus className="w-5 h-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Attach files</p>
              </TooltipContent>
            </Tooltip>

            {/* Smiley - Emoji Picker */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  ref={emojiButtonRef}
                  type="button"
                  variant="ghost"
                  size="icon"
                  className={cn(
                    "shrink-0 hover:bg-white/10 transition-all rounded-xl",
                    showEmojiPicker ? "text-[#00F0FF] bg-white/10" : "hover:text-white"
                  )}
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                >
                  <Smile className="w-5 h-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Add emoji</p>
              </TooltipContent>
            </Tooltip>
          </div>

          {/* CENTER INPUT */}
          <div className="flex-1 relative">
            <TextareaAutosize
              ref={textareaRef}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={isDragActive ? "Drop files here..." : placeholder}
              disabled={disabled}
              minRows={1}
              maxRows={maxRows}
              className="w-full bg-transparent text-white placeholder:text-white/30 resize-none outline-none border-none focus:ring-0 py-2 px-3 rounded-xl transition-all"
              style={{
                fontSize: '15px',
                lineHeight: '1.5',
              }}
            />
          </div>

          {/* RIGHT ACTIONS */}
          <div className="flex items-center gap-1">
            {/* Mic Icon - Voice Notes */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="shrink-0 hover:bg-white/10 hover:text-white transition-all rounded-xl"
                  onClick={() => console.log('Voice recording feature')}
                  disabled={disabled}
                >
                  <Mic className="w-5 h-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Voice message (coming soon)</p>
              </TooltipContent>
            </Tooltip>

            {/* Send Button */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  size="icon"
                  className={cn(
                    "shrink-0 rounded-xl transition-all",
                    hasContent
                      ? "bg-gradient-to-r from-[#00F0FF] to-[#7B2FBE] hover:shadow-[0_0_20px_rgba(0,240,255,0.5)] text-white"
                      : "bg-white/10 text-white/30 cursor-not-allowed"
                  )}
                  onClick={handleSend}
                  disabled={!hasContent || disabled}
                >
                  <Send className="w-5 h-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{hasContent ? 'Send message (Enter)' : 'Type a message'}</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </div>

        {/* Helper Text */}
        <div className="px-4 pb-2 text-xs text-white/40 flex items-center justify-between">
          <span>
            <kbd className="px-1.5 py-0.5 bg-white/10 rounded text-white/60">Enter</kbd> to send · 
            <kbd className="px-1.5 py-0.5 bg-white/10 rounded text-white/60 ml-1">Shift+Enter</kbd> for new line
          </span>
          {isDragActive && (
            <span className="text-[#00F0FF] animate-pulse">Drop to attach</span>
          )}
        </div>
      </div>
      </TooltipProvider>
    </div>
  );
}
