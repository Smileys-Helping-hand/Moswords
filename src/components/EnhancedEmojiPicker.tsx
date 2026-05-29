'use client';

import { memo, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, Tabs } from 'lucide-react';

const EMOJI_CATEGORIES = {
  recent: { name: '⏰ Recent', emojis: [] },
  smileys: {
    name: '😀 Smileys',
    emojis: ['😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃', '😉', '😊', '😇', '🥰', '😍', '🤩', '😘', '😗', '😚', '😙', '🥲', '😋', '😛', '😜', '🤪', '😌', '😔', '😑', '😐', '😏', '🥳'],
  },
  nature: {
    name: '🌿 Nature',
    emojis: ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮', '🐷', '🐸', '🐵', '🐔', '🐧', '🐦', '🐤', '🦆', '🦅', '🦉', '🦇', '🐺', '🐗', '🐴', '🦄', '🐝', '🪱', '🐛'],
  },
  food: {
    name: '🍔 Food',
    emojis: ['🍏', '🍎', '🍐', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🍈', '🍒', '🍑', '🥭', '🍍', '🥥', '🥑', '🍅', '🍆', '🥑', '🥦', '🥬', '🌽', '🌶️', '🥒', '🌰', '🍞', '🥐', '🥖', '🥨', '🥯'],
  },
  sports: {
    name: '⚽ Sports',
    emojis: ['⚽', '🏀', '🏈', '⚾', '🥎', '🎾', '🏐', '🏉', '🥏', '🎳', '🏓', '🏸', '🏒', '🏑', '🥍', '🏏', '🥅', '⛳', '⛸️', '🎣', '🎽', '🎿', '⛷️', '🏂', '🪂', '🛼', '🛹', '🛺', '🏋️', '🤼'],
  },
  activities: {
    name: '🎭 Activities',
    emojis: ['🎪', '🎨', '🎬', '🎤', '🎧', '🎼', '🎹', '🥁', '🎷', '🎺', '🎸', '🎻', '🎲', '♟️', '🎯', '🎳', '🎮', '🎰', '🧩', '🚗', '🚕', '🚙', '🚌', '🚎', '🏎️', '🚓', '🚑', '🚒', '🚐'],
  },
  travel: {
    name: '✈️ Travel',
    emojis: ['✈️', '🚁', '🚂', '🚃', '🚄', '🚅', '🚆', '🚇', '🚈', '🚉', '🚊', '🚝', '🚞', '🚋', '🚌', '🚍', '🚎', '🚐', '🚑', '🚒', '🚓', '🚔', '🚕', '🚖', '🚗', '🚘', '🚙', '🚚', '🚛', '🚜'],
  },
};

interface EnhancedEmojiPickerProps {
  onSelect: (emoji: string) => void;
  onClose?: () => void;
}

const EnhancedEmojiPicker = memo(function EnhancedEmojiPicker({
  onSelect,
  onClose,
}: EnhancedEmojiPickerProps) {
  const [activeCategory, setActiveCategory] = useState<keyof typeof EMOJI_CATEGORIES>('smileys');
  const [searchQuery, setSearchQuery] = useState('');
  const [recentEmojis, setRecentEmojis] = useState<string[]>([]);

  const categories = useMemo(() => {
    const result = { ...EMOJI_CATEGORIES };
    result.recent.emojis = recentEmojis.slice(0, 12);
    return result;
  }, [recentEmojis]);

  const filteredEmojis = useMemo(() => {
    if (!searchQuery) {
      return categories[activeCategory]?.emojis || [];
    }

    // Simple emoji name search
    const emojiNames: Record<string, string[]> = {
      'happy': ['😀', '😃', '😄', '😁', '😆', '😅'],
      'love': ['❤️', '🧡', '💛', '💚', '💙', '💜'],
      'fire': ['🔥', '💥', '⚡'],
      'party': ['🎉', '🎊', '🎈', '🎁'],
      'thumbs': ['👍', '👎'],
      'clap': ['👏'],
      'wave': ['👋'],
      'cry': ['😭', '😢', '😩'],
      'laugh': ['🤣', '😂'],
      'sun': ['☀️', '🌞', '🌅'],
      'moon': ['🌙', '⭐', '✨'],
      'heart': ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤'],
      'star': ['⭐', '✨', '💫', '🌟'],
      'ok': ['👌', '✌️', '👆', '👇'],
    };

    const query = searchQuery.toLowerCase();
    for (const [name, emojis] of Object.entries(emojiNames)) {
      if (name.includes(query)) {
        return emojis;
      }
    }

    return [];
  }, [searchQuery, activeCategory, categories]);

  const handleSelect = (emoji: string) => {
    onSelect(emoji);
    // Add to recent
    setRecentEmojis((prev) => [emoji, ...prev.filter((e) => e !== emoji)].slice(0, 12));
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="bg-background border border-border rounded-2xl shadow-lg max-w-sm w-full"
    >
      {/* Header */}
      <div className="p-3 border-b border-border flex items-center justify-between gap-2">
        <Input
          type="text"
          placeholder="Search emojis..."
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            if (!searchQuery && activeCategory !== 'smileys') {
              setActiveCategory('smileys');
            }
          }}
          className="flex-1 text-sm"
        />
        {onClose && (
          <button
            onClick={onClose}
            className="p-1 hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Tabs */}
      {!searchQuery && (
        <div className="flex gap-1 p-2 border-b border-border overflow-x-auto">
          {Object.entries(categories).map(([key, category]) => (
            <motion.button
              key={key}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setActiveCategory(key as keyof typeof EMOJI_CATEGORIES)}
              className={`px-2 py-1 rounded text-sm whitespace-nowrap transition-colors ${
                activeCategory === key
                  ? 'bg-primary text-primary-foreground'
                  : 'hover:bg-white/10'
              }`}
            >
              {category.name.charAt(0)}
            </motion.button>
          ))}
        </div>
      )}

      {/* Emoji Grid */}
      <div className="grid grid-cols-8 gap-1 p-3 max-h-64 overflow-y-auto">
        <AnimatePresence>
          {filteredEmojis.map((emoji, index) => (
            <motion.button
              key={`${emoji}-${index}`}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ delay: index * 0.02 }}
              onClick={() => handleSelect(emoji)}
              className="text-2xl hover:bg-primary/20 p-2 rounded transition-all hover:scale-125 active:scale-100"
              title={emoji}
            >
              {emoji}
            </motion.button>
          ))}
        </AnimatePresence>
      </div>

      {/* Empty State */}
      {filteredEmojis.length === 0 && (
        <div className="flex items-center justify-center h-48 text-muted-foreground">
          <p className="text-sm">No emojis found</p>
        </div>
      )}
    </motion.div>
  );
});

EnhancedEmojiPicker.displayName = 'EnhancedEmojiPicker';

// Simple input component for the search box
function Input({
  type,
  placeholder,
  value,
  onChange,
  className = '',
}: {
  type?: string;
  placeholder?: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  className?: string;
}) {
  return (
    <input
      type={type || 'text'}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      className={`bg-white/5 border border-border rounded-lg px-3 py-2 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary ${className}`}
    />
  );
}

export default EnhancedEmojiPicker;
