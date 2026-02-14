/**
 * Typing Indicator Component
 * Shows when users are typing in the channel
 */

'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useTypingIndicator } from '@/hooks/use-typing-indicator';

interface TypingIndicatorProps {
  channelId: string | null;
  className?: string;
}

export default function TypingIndicator({ channelId, className = '' }: TypingIndicatorProps) {
  const { typingText, isAnyoneTyping } = useTypingIndicator(channelId);

  if (!isAnyoneTyping || !typingText) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 10, height: 0 }}
        animate={{ opacity: 1, y: 0, height: 'auto' }}
        exit={{ opacity: 0, y: 10, height: 0 }}
        className={`px-4 py-2 text-sm text-muted-foreground flex items-center gap-2 ${className}`}
      >
        <div className="flex gap-1">
          <motion.span
            className="w-1.5 h-1.5 rounded-full bg-primary"
            animate={{ scale: [1, 1.5, 1], opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1.2, repeat: Infinity, delay: 0 }}
          />
          <motion.span
            className="w-1.5 h-1.5 rounded-full bg-primary"
            animate={{ scale: [1, 1.5, 1], opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1.2, repeat: Infinity, delay: 0.2 }}
          />
          <motion.span
            className="w-1.5 h-1.5 rounded-full bg-primary"
            animate={{ scale: [1, 1.5, 1], opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1.2, repeat: Infinity, delay: 0.4 }}
          />
        </div>
        <span className="italic">{typingText}</span>
      </motion.div>
    </AnimatePresence>
  );
}
