"use client";

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ExternalLink } from 'lucide-react';
import { Button } from './ui/button';
import Image from 'next/image';

export interface NativeAdProps {
  /** Advertiser / brand name shown as chat row title */
  advertiserName: string;
  /** Short preview text shown below the name – like a last-message snippet */
  headline: string;
  /** Optional brand logo URL — falls back to a colored initial avatar */
  logoUrl?: string;
  /** Where, tapping the ad opens */
  ctaUrl: string;
  /** Optional accent color for the logo placeholder (hex) */
  accentColor?: string;
  /** Called when the user explicitly closes the ad */
  onDismiss?: () => void;
}

/**
 * NativeAdCard
 * Renders exactly like a WhatsApp/Telegram chat-list row so it blends
 * naturally into the DM inbox. A subtle "Sponsored" pill distinguishes it
 * from real conversations without breaking the premium feel.
 */
export function NativeAdCard({
  advertiserName,
  headline,
  logoUrl,
  ctaUrl,
  accentColor = '#2AABEE',
  onDismiss,
}: NativeAdProps) {
  const [dismissed, setDismissed] = useState(false);

  const handleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setDismissed(true);
    onDismiss?.();
  };

  // We only open the URL when the user explicitly clicks — avoids accidental taps.
  const handleClick = () => {
    window.open(ctaUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <AnimatePresence>
      {!dismissed && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96 }}
          transition={{ duration: 0.2 }}
          className="relative group"
        >
          <button
            onClick={handleClick}
            className="w-full text-left glass-panel hover:bg-primary/5 active:bg-primary/10 transition-colors rounded-xl p-3 border border-transparent hover:border-primary/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label={`Sponsored: ${advertiserName} – ${headline}`}
          >
            <div className="flex items-center gap-3">
              {/* Logo / initial avatar */}
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 overflow-hidden"
                style={{ background: accentColor }}
              >
                {logoUrl ? (
                  <Image
                    src={logoUrl}
                    alt={advertiserName}
                    width={40}
                    height={40}
                    className="object-cover w-full h-full"
                  />
                ) : (
                  <span className="text-white font-bold text-sm select-none">
                    {advertiserName.substring(0, 2).toUpperCase()}
                  </span>
                )}
              </div>

              {/* Text content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-0.5">
                  <p className="font-medium text-foreground/80 truncate">{advertiserName}</p>
                  {/* Sponsored pill — small, unobtrusive */}
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground border border-muted-foreground/30 rounded px-1.5 py-0.5 shrink-0 leading-none">
                    Sponsored
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <p className="text-sm text-muted-foreground truncate">{headline}</p>
                  <ExternalLink className="w-3 h-3 text-muted-foreground/50 shrink-0" />
                </div>
              </div>
            </div>
          </button>

          {/* Dismiss button – visible on hover */}
          <Button
            variant="ghost"
            size="icon"
            onClick={handleDismiss}
            aria-label="Dismiss ad"
            className="absolute top-1.5 right-1.5 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground hover:bg-muted/60"
          >
            <X className="w-3.5 h-3.5" />
          </Button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** Convenience: renders an ad between two items in a list every N index */
export function InjectAd({
  index,
  frequency = 8,
  ad,
}: {
  index: number;
  frequency?: number;
  ad: Omit<NativeAdProps, 'onDismiss'>;
}) {
  if ((index + 1) % frequency !== 0) return null;
  return (
    <div className="my-1">
      <NativeAdCard {...ad} />
    </div>
  );
}
