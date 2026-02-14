/**
 * Message Reactions Component
 * Displays and allows adding emoji reactions to messages
 */

'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Smile, Plus } from 'lucide-react';
import { Button } from './ui/button';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { useToast } from '@/hooks/use-toast';

interface Reaction {
  emoji: string;
  count: number;
  hasReacted: boolean;
  users: { userId: string; userName: string }[];
}

interface MessageReactionsProps {
  messageId: string;
  compact?: boolean;
}

const QUICK_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🎉', '🚀', '👀'];

export default function MessageReactions({ messageId, compact = false }: MessageReactionsProps) {
  const [reactions, setReactions] = useState<Reaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const { toast } = useToast();

  const fetchReactions = async () => {
    try {
      const response = await fetch(`/api/messages/${messageId}/reactions`);
      if (!response.ok) return;

      const data = await response.json();
      setReactions(data.reactions || []);
    } catch (error) {
      console.error('Failed to fetch reactions:', error);
    }
  };

  useEffect(() => {
    fetchReactions();
  }, [messageId]);

  const handleReaction = async (emoji: string) => {
    if (loading) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/messages/${messageId}/reactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emoji }),
      });

      if (!response.ok) throw new Error('Failed to add reaction');

      const data = await response.json();
      
      // Update reactions optimistically
      setReactions(prev => {
        const existing = prev.find(r => r.emoji === emoji);
        if (data.action === 'removed') {
          if (!existing) return prev;
          if (existing.count === 1) {
            return prev.filter(r => r.emoji !== emoji);
          }
          return prev.map(r =>
            r.emoji === emoji
              ? { ...r, count: r.count - 1, hasReacted: false }
              : r
          );
        } else {
          if (existing) {
            return prev.map(r =>
              r.emoji === emoji
                ? { ...r, count: r.count + 1, hasReacted: true }
                : r
            );
          }
          return [...prev, { emoji, count: 1, hasReacted: true, users: [] }];
        }
      });

      setShowPicker(false);
    } catch (error) {
      console.error('Failed to add reaction:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to add reaction',
      });
    } finally {
      setLoading(false);
    }
  };

  const getTooltipText = (reaction: Reaction): string => {
    if (reaction.users.length === 0) return reaction.emoji;
    if (reaction.users.length === 1) {
      return `${reaction.users[0].userName} reacted with ${reaction.emoji}`;
    }
    if (reaction.users.length <= 3) {
      const names = reaction.users.map(u => u.userName).join(', ');
      return `${names} reacted with ${reaction.emoji}`;
    }
    const names = reaction.users.slice(0, 2).map(u => u.userName).join(', ');
    return `${names} and ${reaction.users.length - 2} others reacted with ${reaction.emoji}`;
  };

  if (reactions.length === 0 && compact) {
    return null;
  }

  return (
    <div className="flex items-center gap-1 flex-wrap mt-1">
      <AnimatePresence>
        {reactions.map((reaction) => (
          <motion.button
            key={reaction.emoji}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => handleReaction(reaction.emoji)}
            className={`
              inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs
              transition-all border
              ${
                reaction.hasReacted
                  ? 'bg-primary/20 border-primary/40 text-primary'
                  : 'bg-white/5 border-white/10 hover:bg-white/10 text-foreground'
              }
            `}
            title={getTooltipText(reaction)}
          >
            <span className="text-sm">{reaction.emoji}</span>
            <span className="text-xs font-medium">{reaction.count}</span>
          </motion.button>
        ))}
      </AnimatePresence>

      {/* Add Reaction Button */}
      <Popover open={showPicker} onOpenChange={setShowPicker}>
        <PopoverTrigger asChild>
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 hover:border-primary/40 transition-all text-muted-foreground hover:text-primary"
            title="Add reaction"
          >
            <Smile className="w-3.5 h-3.5" />
          </motion.button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-3 glass-card border-white/20">
          <div className="grid grid-cols-4 gap-2">
            {QUICK_REACTIONS.map((emoji) => (
              <motion.button
                key={emoji}
                whileHover={{ scale: 1.2 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => handleReaction(emoji)}
                className="text-2xl p-2 rounded-lg hover:bg-white/10 transition-colors"
                disabled={loading}
              >
                {emoji}
              </motion.button>
            ))}
          </div>
          <div className="mt-2 pt-2 border-t border-white/10 text-xs text-center text-muted-foreground">
            Click an emoji to react
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
