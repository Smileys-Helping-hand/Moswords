"use client";

/**
 * MediaPicker — GIF search & selection popover (Giphy-powered).
 *
 * Props:
 *   onSelect(gifUrl)  – called when the user taps a GIF
 *   onClose()         – called after selection (parent closes the popover)
 *
 * Requires NEXT_PUBLIC_GIPHY_API_KEY in env.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { GiphyFetch } from '@giphy/js-fetch-api';
import type { IGif } from '@giphy/js-types';
import { Search, Loader2, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

// ── Giphy client ──────────────────────────────────────────────────────────────
const API_KEY = process.env.NEXT_PUBLIC_GIPHY_API_KEY ?? '';
let gf: GiphyFetch | null = null;
if (API_KEY) {
  gf = new GiphyFetch(API_KEY);
}

// ── Types ─────────────────────────────────────────────────────────────────────
interface MediaPickerProps {
  onSelect: (gifUrl: string) => void;
  onClose?: () => void;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
/** Pick the best-resolution src for display that is still ≤ 480px wide */
function getDisplayUrl(gif: IGif): string {
  return (
    gif.images.fixed_height?.url ||
    gif.images.downsized?.url ||
    gif.images.original.url
  );
}

/** The original URL we store as the "sent GIF" so it loops cleanly */
function getOriginalUrl(gif: IGif): string {
  return gif.images.original.url;
}

// ── Component ──────────────────────────────────────────────────────────────────
export default function MediaPicker({ onSelect, onClose }: MediaPickerProps) {
  const [query, setQuery] = useState('');
  const [gifs, setGifs] = useState<IGif[]>([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchGifs = useCallback(async (searchQuery: string) => {
    if (!gf) {
      setGifs([]);
      return;
    }
    setLoading(true);
    try {
      const result = searchQuery.trim()
        ? await gf.search(searchQuery, { limit: 24, rating: 'g' })
        : await gf.trending({ limit: 24, rating: 'g' });
      setGifs(result.data);
    } catch {
      setGifs([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch trending on mount
  useEffect(() => {
    fetchGifs('');
  }, [fetchGifs]);

  // Debounced search as the user types
  const handleSearch = (value: string) => {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchGifs(value), 350);
  };

  const handleSelect = (gif: IGif) => {
    onSelect(getOriginalUrl(gif));
    onClose?.();
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96, y: 8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96, y: 8 }}
      transition={{ duration: 0.15 }}
      className="w-72 rounded-xl overflow-hidden border border-border bg-card shadow-2xl flex flex-col"
      style={{ maxHeight: 380 }}
    >
      {/* Search bar */}
      <div className="p-2 border-b border-border shrink-0">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
          <Input
            autoFocus
            value={query}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Search GIFs…"
            className="pl-8 h-8 text-sm bg-muted/50 border-transparent focus-visible:border-primary rounded-lg"
          />
          {query && (
            <button
              onClick={() => handleSearch('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Grid */}
      <div className="overflow-y-auto flex-1 p-2">
        {!API_KEY && (
          <div className="flex flex-col items-center justify-center h-32 gap-2 text-center px-4">
            <p className="text-xs text-muted-foreground">
              Add <code className="bg-muted px-1 rounded">NEXT_PUBLIC_GIPHY_API_KEY</code> to{' '}
              <code className="bg-muted px-1 rounded">.env.local</code> to enable GIFs.
            </p>
          </div>
        )}

        {API_KEY && loading && (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
          </div>
        )}

        {API_KEY && !loading && gifs.length === 0 && (
          <div className="flex items-center justify-center h-32">
            <p className="text-xs text-muted-foreground">No GIFs found</p>
          </div>
        )}

        {API_KEY && !loading && gifs.length > 0 && (
          <div className="grid grid-cols-3 gap-1.5">
            <AnimatePresence>
              {gifs.map((gif) => (
                <motion.button
                  key={gif.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.1 }}
                  onClick={() => handleSelect(gif)}
                  className={cn(
                    'relative rounded-lg overflow-hidden bg-muted hover:ring-2 hover:ring-primary/60',
                    'transition-all active:scale-95',
                  )}
                  style={{ aspectRatio: '1' }}
                  title={gif.title}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={getDisplayUrl(gif)}
                    alt={gif.title}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </motion.button>
              ))}
            </AnimatePresence>
          </div>
        )}

        {/* Giphy attribution — required by API terms */}
        {API_KEY && (
          <p className="text-center text-[9px] text-muted-foreground/50 mt-2 select-none">
            Powered by GIPHY
          </p>
        )}
      </div>
    </motion.div>
  );
}
