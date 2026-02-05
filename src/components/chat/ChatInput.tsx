"use client";

import { useState, useRef, useEffect, KeyboardEvent } from 'react';
import { Send, Smile, Paperclip } from 'lucide-react';
import { Button } from '@/components/ui/button';
import dynamic from 'next/dynamic';
import TextareaAutosize from 'react-textarea-autosize';
import { motion, AnimatePresence } from 'framer-motion';

// Dynamically import EmojiPicker to avoid SSR issues
const EmojiPicker = dynamic(
  () => import('emoji-picker-react'),
  { ssr: false }
);

interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  placeholder?: string;
  disabled?: boolean;
  maxRows?: number;
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
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const emojiButtonRef = useRef<HTMLButtonElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);

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
      if (value.trim() && !disabled) {
        onSend();
      }
    }
    // Shift + Enter: Allow new line (default behavior)
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

  // Handle attachment click (placeholder)
  const handleAttachmentClick = () => {
    console.log('Open File Dialog');
    // TODO: Implement file upload functionality
  };

  return (
    <div className="relative w-full max-w-4xl mx-auto">
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
            <div className="glass-card border border-white/20 rounded-2xl overflow-hidden shadow-2xl">
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

      {/* The Glass Cockpit Input Bar */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="glass-panel border border-white/20 rounded-2xl shadow-xl overflow-hidden"
      >
        <div className="flex items-end gap-2 p-3">
          {/* Emoji Trigger Button */}
          <Button
            ref={emojiButtonRef}
            type="button"
            variant="ghost"
            size="icon"
            className="shrink-0 hover:bg-white/10 hover:text-primary transition-colors rounded-xl"
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            disabled={disabled}
          >
            <Smile className={`w-5 h-5 ${showEmojiPicker ? 'text-primary' : ''}`} />
          </Button>

          {/* Attachment Button */}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="shrink-0 hover:bg-white/10 hover:text-primary transition-colors rounded-xl"
            onClick={handleAttachmentClick}
            disabled={disabled}
          >
            <Paperclip className="w-5 h-5" />
          </Button>

          {/* Auto-Expanding Text Area */}
          <div className="flex-1 relative">
            <TextareaAutosize
              ref={textareaRef}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              disabled={disabled}
              minRows={1}
              maxRows={maxRows}
              className="w-full bg-transparent text-foreground placeholder:text-muted-foreground resize-none outline-none border-none focus:ring-0 py-2 px-3 rounded-xl transition-all"
              style={{
                fontSize: '15px',
                lineHeight: '1.5',
              }}
            />
          </div>

          {/* Send Button */}
          <Button
            type="button"
            size="icon"
            className="shrink-0 rounded-xl bg-primary hover:bg-primary/90 transition-all disabled:opacity-50"
            onClick={onSend}
            disabled={!value.trim() || disabled}
          >
            <Send className="w-5 h-5" />
          </Button>
        </div>

        {/* Helper Text */}
        <div className="px-4 pb-2 text-xs text-muted-foreground/60">
          Press <kbd className="px-1 py-0.5 bg-white/10 rounded">Enter</kbd> to send, <kbd className="px-1 py-0.5 bg-white/10 rounded">Shift+Enter</kbd> for new line
        </div>
      </motion.div>
    </div>
  );
}
