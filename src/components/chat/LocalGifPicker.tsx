"use client";

/**
 * LocalGifPicker
 *
 * A fully self-hosted GIF picker backed by:
 *   1. Built-in animated emoji packs (Google Noto Emoji Animated — Apache 2.0)
 *   2. Custom GIFs stored in Cloudflare R2 (uploaded via the admin flow)
 *   3. Optional Giphy search fallback (only when API key is set + user explicitly searches)
 *
 * Zero API calls for browsing the built-in packs.
 * Giphy API is only hit when the user types in the search box AND the key is configured.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { Search, Loader2, X, Plus, Upload } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { BUILT_IN_PACKS, searchBuiltIn, type GifItem, type GifPack } from '@/lib/gif-library';

// ── Types ─────────────────────────────────────────────────────────────────────
interface LocalGifPickerProps {
  onSelect: (gifUrl: string) => void;
  onClose?: () => void;
}

interface GifPackMeta {
  id: string;
  name: string;
  slug: string;
  emoji: string;
  count: number;
}

interface ApiGifItem {
  id: string;
  title: string;
  tags: string[];
  url: string;
  thumbUrl: string | null;
  packSlug: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function apiItemToGifItem(item: ApiGifItem): GifItem {
  return {
    id: item.id,
    title: item.title,
    url: item.url,
    thumbUrl: item.thumbUrl ?? undefined,
    tags: item.tags,
  };
}

// ── Component ──────────────────────────────────────────────────────────────────
export default function LocalGifPicker({ onSelect, onClose }: LocalGifPickerProps) {
  const [activePack, setActivePack] = useState<string>(BUILT_IN_PACKS[0].id);
  const [packs, setPacks] = useState<GifPackMeta[]>(
    BUILT_IN_PACKS.map((p) => ({ id: `builtin__${p.id}`, name: p.name, slug: p.id, emoji: p.emoji, count: p.gifs.length }))
  );
  const [gifs, setGifs] = useState<GifItem[]>(BUILT_IN_PACKS[0].gifs);
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load packs from API (merges DB custom + built-in)
  useEffect(() => {
    fetch('/api/gifs/packs')
      .then((r) => r.json())
      .then((data) => {
        if (data.packs?.length) setPacks(data.packs);
      })
      .catch(() => {/* use built-in static packs */});
  }, []);

  // Load GIFs for active pack
  const loadPack = useCallback(async (packSlug: string) => {
    setLoading(true);
    setQuery('');
    setIsSearching(false);

    // Instant render from built-in data
    const builtIn = BUILT_IN_PACKS.find((p) => p.id === packSlug);
    if (builtIn) setGifs(builtIn.gifs);

    // Then fetch API (includes any custom DB GIFs)
    try {
      const res = await fetch(`/api/gifs?pack=${encodeURIComponent(packSlug)}`);
      const data = await res.json();
      if (data.gifs?.length) setGifs(data.gifs.map(apiItemToGifItem));
    } catch {/* keep built-in */}

    setLoading(false);
  }, []);

  useEffect(() => {
    loadPack(activePack);
  }, [activePack, loadPack]);

  // Search handler (debounced)
  const handleSearch = useCallback((value: string) => {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!value.trim()) {
      setIsSearching(false);
      loadPack(activePack);
      return;
    }

    setIsSearching(true);
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      // First: instant built-in results
      setGifs(searchBuiltIn(value));

      // Then: API search (DB custom GIFs)
      try {
        const res = await fetch(`/api/gifs?q=${encodeURIComponent(value)}`);
        const data = await res.json();
        if (data.gifs?.length) setGifs(data.gifs.map(apiItemToGifItem));
      } catch {/* keep built-in results */}

      setLoading(false);
    }, 300);
  }, [activePack, loadPack]);

  const handleSelect = (gif: GifItem) => {
    onSelect(gif.url);
    onClose?.();
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96, y: 8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96, y: 8 }}
      transition={{ duration: 0.15 }}
      className="w-80 rounded-2xl overflow-hidden border border-border bg-card shadow-2xl flex flex-col"
      style={{ maxHeight: 440 }}
    >
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="p-2 border-b border-border shrink-0 space-y-2">
        {/* Search */}
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

        {/* Pack tabs */}
        {!isSearching && (
          <div className="flex gap-1 overflow-x-auto scrollbar-none pb-0.5">
            {packs.map((pack) => (
              <button
                key={pack.slug}
                onClick={() => setActivePack(pack.slug)}
                className={cn(
                  'flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-all shrink-0',
                  activePack === pack.slug
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground',
                )}
              >
                <span>{pack.emoji}</span>
                <span>{pack.name}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Grid ───────────────────────────────────────────────────────────── */}
      <div className="overflow-y-auto flex-1 p-2">
        {loading && gifs.length === 0 && (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
          </div>
        )}

        {!loading && gifs.length === 0 && (
          <div className="flex flex-col items-center justify-center h-32 gap-2 text-center px-4">
            <span className="text-2xl">🔍</span>
            <p className="text-xs text-muted-foreground">No GIFs found</p>
          </div>
        )}

        {gifs.length > 0 && (
          <div className="grid grid-cols-4 gap-1.5">
            <AnimatePresence mode="popLayout">
              {gifs.map((gif, i) => (
                <motion.button
                  key={gif.id}
                  initial={{ opacity: 0, scale: 0.85 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.85 }}
                  transition={{ duration: 0.1, delay: i * 0.012 }}
                  onClick={() => handleSelect(gif)}
                  className={cn(
                    'relative rounded-xl overflow-hidden bg-muted aspect-square',
                    'hover:ring-2 hover:ring-primary/70 hover:scale-105',
                    'transition-all active:scale-95 shadow-sm',
                  )}
                  title={gif.title}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={gif.thumbUrl ?? gif.url}
                    alt={gif.title}
                    className="w-full h-full object-contain p-0.5"
                    loading="lazy"
                  />
                </motion.button>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* ── Footer ─────────────────────────────────────────────────────────── */}
      <div className="px-2 py-1.5 border-t border-border shrink-0 flex items-center justify-between">
        <p className="text-[10px] text-muted-foreground/60 select-none">
          Moswords GIF Pack
        </p>
        <p className="text-[10px] text-muted-foreground/40 select-none">
          Powered by Noto Emoji Animated
        </p>
      </div>
    </motion.div>
  );
}
