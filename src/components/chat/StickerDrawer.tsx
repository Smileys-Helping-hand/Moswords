"use client";

/**
 * StickerDrawer
 *
 * Popover that shows the user's saved stickers + a button to open Sticker Studio.
 *
 * Props:
 *   onSend(url)  – sends the sticker as a message
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, Plus, Smile } from 'lucide-react';
import { cn } from '@/lib/utils';
import StickerStudioModal from './StickerStudioModal';

interface Sticker {
  id: string;
  imageUrl: string;
}

interface Props {
  onSend: (url: string) => void;
  onClose?: () => void;
}

export default function StickerDrawer({ onSend, onClose }: Props) {
  const [stickers, setStickers] = useState<Sticker[]>([]);
  const [loading, setLoading] = useState(true);
  const [studioOpen, setStudioOpen] = useState(false);

  const fetchStickers = async () => {
    try {
      const res = await fetch('/api/stickers');
      if (!res.ok) return;
      const { stickers: data } = await res.json();
      setStickers(data ?? []);
    } catch {
      /* silently fail */
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStickers();
  }, []);

  const handleStickerSaved = (url: string) => {
    // Optimistically add the new sticker and close studio
    setStickers((prev) => [{ id: url, imageUrl: url }, ...prev]);
  };

  const handleSend = (url: string) => {
    onSend(url);
    onClose?.();
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 8 }}
        transition={{ duration: 0.15 }}
        className="w-64 rounded-xl overflow-hidden border border-border bg-card shadow-2xl flex flex-col"
        style={{ maxHeight: 340 }}
      >
        {/* Header */}
        <div className="px-3 py-2 border-b border-border flex items-center justify-between shrink-0">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            My Stickers
          </span>
          <button
            onClick={() => setStudioOpen(true)}
            className="text-xs text-primary hover:text-primary/80 font-medium flex items-center gap-1 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Create
          </button>
        </div>

        {/* Grid */}
        <div className="overflow-y-auto flex-1 p-2">
          {loading && (
            <div className="flex items-center justify-center h-24">
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
            </div>
          )}

          {!loading && stickers.length === 0 && (
            <div className="flex flex-col items-center justify-center h-24 gap-2 text-center px-4">
              <Smile className="w-8 h-8 text-muted-foreground/40" />
              <p className="text-xs text-muted-foreground">No stickers yet</p>
              <button
                onClick={() => setStudioOpen(true)}
                className="text-xs text-primary hover:underline"
              >
                Create your first sticker →
              </button>
            </div>
          )}

          {!loading && stickers.length > 0 && (
            <div className="grid grid-cols-3 gap-1.5">
              <AnimatePresence>
                {stickers.map((s) => (
                  <motion.button
                    key={s.id}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => handleSend(s.imageUrl)}
                    className={cn(
                      'rounded-lg p-1 hover:bg-muted/60 active:scale-95 transition-all',
                      '[background:repeating-conic-gradient(#3f3f4615_0%_25%,transparent_0%_50%)_0_0/12px_12px]',
                    )}
                    style={{ aspectRatio: '1' }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={s.imageUrl}
                      alt="sticker"
                      className="w-full h-full object-contain"
                      style={{ filter: 'drop-shadow(0 0 2px white)' }}
                      loading="lazy"
                    />
                  </motion.button>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      </motion.div>

      <StickerStudioModal
        open={studioOpen}
        onOpenChange={setStudioOpen}
        onStickerSaved={handleStickerSaved}
      />
    </>
  );
}
