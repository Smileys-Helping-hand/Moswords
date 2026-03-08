"use client";

/**
 * SponsoredChatRow
 * Renders a native ad that is visually indistinguishable from a real
 * conversation row — except for a subtle "Sponsored" badge.
 *
 * Design intent: Telegram Sponsored Message model.
 * - Same padding, avatar size, font weights as a real DM row.
 * - "Sponsored" replaces the timestamp. Small, muted — clearly marked
 *   but not intrusive.
 */

import { motion } from 'framer-motion';
import type { SponsoredAd } from '@/lib/mock-ads';

interface Props {
  ad: SponsoredAd;
  animationDelay?: number;
}

export default function SponsoredChatRow({ ad, animationDelay = 0 }: Props) {
  const initials = ad.brandName.substring(0, 2).toUpperCase();

  return (
    <motion.a
      href={ad.targetUrl}
      target="_blank"
      rel="noopener noreferrer sponsored"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: animationDelay }}
      // Slightly distinct background so savvy users can recognise it,
      // but still blends naturally into the list.
      className="w-full text-left glass-panel hover:bg-primary/5 active:bg-primary/10 transition-colors rounded-xl p-3 group border border-primary/10 hover:border-primary/30 flex items-center gap-3 no-underline"
    >
      {/* ── Brand Logo Avatar ─────────────────────────────────────────────── */}
      <div className="shrink-0 relative">
        <div
          className="w-11 h-11 rounded-full overflow-hidden"
          style={{
            boxShadow: `0 0 0 2px ${ad.accentColor ?? 'transparent'}`,
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={ad.imageUrl}
            alt={ad.brandName}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        </div>
        {/* tiny "Ad" dot badge on the avatar */}
        <div
          className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-background flex items-center justify-center ring-1 ring-border"
          aria-hidden
        >
          <span className="text-[8px] font-black leading-none text-primary">ad</span>
        </div>
      </div>

      {/* ── Text content ─────────────────────────────────────────────────── */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-0.5">
          {/* Brand name — same weight/style as a contact name */}
          <p className="truncate font-medium text-foreground/80">{ad.brandName}</p>

          {/* "Sponsored" badge — replaces the timestamp */}
          <span className="text-[10px] font-semibold uppercase tracking-wide text-primary/70 bg-primary/10 px-1.5 py-0.5 rounded-full shrink-0 select-none">
            Sponsored
          </span>
        </div>

        {/* Ad copy — same style as a last-message preview */}
        <p className="text-sm truncate text-muted-foreground leading-snug">{ad.copy}</p>
      </div>
    </motion.a>
  );
}
