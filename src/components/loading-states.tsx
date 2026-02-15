'use client';

import { Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

/**
 * Full-page loading spinner with Moswords branding
 */
export function PageLoader() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <motion.div
          className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center text-4xl font-bold text-white shadow-2xl"
          animate={{
            scale: [1, 1.05, 1],
            rotate: [0, 5, -5, 0],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        >
          M
        </motion.div>
        <motion.div
          animate={{ rotate: 360 }}
          transition={{
            duration: 1,
            repeat: Infinity,
            ease: 'linear',
          }}
        >
          <Loader2 className="w-8 h-8 text-primary" />
        </motion.div>
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    </div>
  );
}

/**
 * Inline content loader
 */
export function ContentLoader({ text = 'Loading...' }: { text?: string }) {
  return (
    <div className="flex items-center justify-center p-8">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="w-6 h-6 text-primary animate-spin" />
        <p className="text-sm text-muted-foreground">{text}</p>
      </div>
    </div>
  );
}

/**
 * Skeleton loader for lists
 */
export function SkeletonList({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-3 p-4 rounded-lg bg-muted/50 animate-pulse"
        >
          <div className="w-12 h-12 rounded-full bg-muted" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-muted rounded w-3/4" />
            <div className="h-3 bg-muted rounded w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Skeleton loader for cards
 */
export function SkeletonCard() {
  return (
    <div className="rounded-lg border bg-card p-6 animate-pulse">
      <div className="space-y-3">
        <div className="h-6 bg-muted rounded w-1/3" />
        <div className="h-4 bg-muted rounded w-full" />
        <div className="h-4 bg-muted rounded w-5/6" />
        <div className="flex gap-2 mt-4">
          <div className="h-8 bg-muted rounded w-20" />
          <div className="h-8 bg-muted rounded w-20" />
        </div>
      </div>
    </div>
  );
}

/**
 * Minimal loading dots
 */
export function LoadingDots() {
  return (
    <div className="flex items-center gap-1">
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="w-2 h-2 rounded-full bg-primary"
          animate={{
            scale: [1, 1.5, 1],
            opacity: [1, 0.5, 1],
          }}
          transition={{
            duration: 1,
            repeat: Infinity,
            delay: i * 0.2,
          }}
        />
      ))}
    </div>
  );
}

/**
 * Button loading state
 */
export function ButtonLoader() {
  return (
    <Loader2 className="w-4 h-4 animate-spin" />
  );
}
