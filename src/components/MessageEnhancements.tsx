'use client';

import { memo, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, MessageCircle, Laugh, Zap, Flame, Sparkles } from 'lucide-react';

/**
 * Enhanced message reactions - like WhatsApp but better
 */
export const ReactionButton = memo(function ReactionButton({
  messageId,
  onReact,
  disabled = false,
}: {
  messageId: string;
  onReact: (emoji: string) => void;
  disabled?: boolean;
}) {
  const [showReactions, setShowReactions] = useState(false);

  const reactions = [
    { emoji: '👍', label: 'Like', icon: null },
    { emoji: '❤️', label: 'Love', icon: Heart },
    { emoji: '😂', label: 'Laugh', icon: Laugh },
    { emoji: '😮', label: 'Wow', icon: null },
    { emoji: '😢', label: 'Sad', icon: null },
    { emoji: '🔥', label: 'Fire', icon: Flame },
  ];

  const handleReact = useCallback(
    (emoji: string) => {
      onReact(emoji);
      setShowReactions(false);
    },
    [onReact]
  );

  if (disabled) return null;

  return (
    <div className="relative">
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setShowReactions(!showReactions)}
        className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
        title="Add reaction"
      >
        <Sparkles className="w-4 h-4 text-muted-foreground" />
      </motion.button>

      <AnimatePresence>
        {showReactions && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.8 }}
            className="absolute bottom-full mb-2 left-0 bg-background border border-border rounded-full p-2 flex gap-1 shadow-lg z-50"
          >
            {reactions.map(({ emoji, label }) => (
              <motion.button
                key={emoji}
                whileHover={{ scale: 1.2 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => handleReact(emoji)}
                title={label}
                className="text-xl hover:bg-primary/20 p-1 rounded transition-colors"
              >
                {emoji}
              </motion.button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

/**
 * Message delivery status with animations
 */
export const MessageStatus = memo(function MessageStatus({
  status,
}: {
  status: 'sending' | 'sent' | 'delivered' | 'read';
}) {
  const statusConfig = {
    sending: { icon: '⏱️', color: 'text-yellow-500', label: 'Sending...' },
    sent: { icon: '✓', color: 'text-gray-500', label: 'Sent' },
    delivered: { icon: '✓✓', color: 'text-gray-500', label: 'Delivered' },
    read: { icon: '✓✓', color: 'text-blue-500', label: 'Read' },
  };

  const config = statusConfig[status];

  return (
    <motion.span
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`text-xs ${config.color} font-semibold flex items-center gap-0.5`}
      title={config.label}
    >
      {status === 'sending' && (
        <motion.span
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        >
          ⏱️
        </motion.span>
      )}
      {status !== 'sending' && config.icon}
    </motion.span>
  );
});

/**
 * Fun message bubble animations
 */
export const MessageBubbleAnimation = memo(function MessageBubbleAnimation({
  children,
  isOwn,
  animationType = 'slide',
}: {
  children: React.ReactNode;
  isOwn: boolean;
  animationType?: 'slide' | 'fade' | 'pop' | 'bounce';
}) {
  const animationVariants = {
    slide: {
      initial: { opacity: 0, x: isOwn ? 50 : -50 },
      animate: { opacity: 1, x: 0 },
      transition: { duration: 0.3 },
    },
    fade: {
      initial: { opacity: 0 },
      animate: { opacity: 1 },
      transition: { duration: 0.2 },
    },
    pop: {
      initial: { opacity: 0, scale: 0.8 },
      animate: { opacity: 1, scale: 1 },
      transition: { duration: 0.3, type: 'spring', stiffness: 300 },
    },
    bounce: {
      initial: { opacity: 0, y: 20 },
      animate: { opacity: 1, y: 0 },
      transition: { duration: 0.4, type: 'spring', bounce: 0.5 },
    },
  };

  return (
    <motion.div {...animationVariants[animationType]}>
      {children}
    </motion.div>
  );
});

/**
 * Typing indicator with animation
 */
export const TypingIndicator = memo(function TypingIndicator({
  name,
}: {
  name: string;
}) {
  return (
    <div className="flex items-center gap-1 p-3 bg-white/5 rounded-lg w-fit">
      <span className="text-sm text-muted-foreground">{name} is typing</span>
      <div className="flex gap-1">
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            animate={{ y: [0, -8, 0] }}
            transition={{
              duration: 0.6,
              delay: i * 0.1,
              repeat: Infinity,
            }}
            className="w-2 h-2 rounded-full bg-primary"
          />
        ))}
      </div>
    </div>
  );
});

/**
 * Message sent celebration animation
 */
export const MessageSentAnimation = memo(function MessageSentAnimation({
  show,
}: {
  show: boolean;
}) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0 }}
          transition={{ duration: 0.3, type: 'spring' }}
          className="fixed bottom-20 right-4 text-4xl z-50"
        >
          ✨
        </motion.div>
      )}
    </AnimatePresence>
  );
});
