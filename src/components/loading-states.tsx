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
          className="w-20 h-20 rounded-2xl bg-gradient-to-br from-neon-cyan to-neon-purple flex items-center justify-center text-4xl font-bold text-white shadow-2xl neon-glow"
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
          <Loader2 className="w-8 h-8 text-cyan-400" />
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

/**
 * Sidebar skeleton loader - matches sidebar structure
 */
export function SidebarSkeleton() {
  return (
    <div className="w-64 flex flex-col gap-3 p-4">
      {/* Header skeleton */}
      <div className="h-10 bg-gradient-to-r from-muted to-muted/50 rounded-lg skeleton-shimmer" />

      {/* Search bar skeleton */}
      <div className="h-9 bg-gradient-to-r from-muted to-muted/50 rounded-lg skeleton-shimmer" />

      {/* Channel list skeletons */}
      <div className="space-y-2 mt-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-gradient-to-r from-muted to-muted/50 skeleton-shimmer" />
              <div className="flex-1 h-4 bg-gradient-to-r from-muted to-muted/50 rounded skeleton-shimmer w-3/4" />
            </div>
          </div>
        ))}
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Bottom profile section skeleton */}
      <div className="border-t border-white/5 pt-3 space-y-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-r from-muted to-muted/50 skeleton-shimmer" />
          <div className="flex-1 space-y-1">
            <div className="h-3 bg-gradient-to-r from-muted to-muted/50 rounded skeleton-shimmer w-2/3" />
            <div className="h-2 bg-gradient-to-r from-muted to-muted/50 rounded skeleton-shimmer w-1/2" />
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Chat bubble skeleton loader - matches message bubble shape
 */
export function ChatBubbleSkeleton({ isOwn = false }: { isOwn?: boolean }) {
  return (
    <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} gap-2 mb-4`}>
      {!isOwn && (
        <div className="w-8 h-8 rounded-full bg-gradient-to-r from-muted to-muted/50 skeleton-shimmer flex-shrink-0" />
      )}
      <div
        className={`max-w-xs rounded-lg p-4 space-y-2 ${
          isOwn
            ? 'bg-gradient-to-r from-muted to-muted/50 skeleton-shimmer'
            : 'bg-gradient-to-r from-muted to-muted/50 skeleton-shimmer'
        }`}
      >
        <div className="h-4 bg-muted/50 rounded skeleton-shimmer w-3/4" />
        <div className="h-4 bg-muted/50 rounded skeleton-shimmer w-5/6" />
        <div className="h-3 bg-muted/50 rounded skeleton-shimmer w-1/3" />
      </div>
    </div>
  );
}

/**
 * Profile card skeleton loader
 */
export function ProfileCardSkeleton() {
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="h-32 bg-gradient-to-r from-muted to-muted/50 rounded-t-lg skeleton-shimmer" />

      {/* Avatar */}
      <div className="relative -mt-16 px-4">
        <div className="w-24 h-24 rounded-full bg-gradient-to-r from-muted to-muted/50 skeleton-shimmer border-4 border-background" />
      </div>

      {/* Info section */}
      <div className="px-4 space-y-3">
        <div className="h-5 bg-gradient-to-r from-muted to-muted/50 rounded skeleton-shimmer w-2/3" />
        <div className="h-4 bg-gradient-to-r from-muted to-muted/50 rounded skeleton-shimmer w-1/2" />

        {/* Buttons */}
        <div className="flex gap-2 mt-4">
          <div className="flex-1 h-10 bg-gradient-to-r from-muted to-muted/50 rounded skeleton-shimmer" />
          <div className="flex-1 h-10 bg-gradient-to-r from-muted to-muted/50 rounded skeleton-shimmer" />
        </div>
      </div>
    </div>
  );
}

/**
 * Message list skeleton with multiple bubbles
 */
export function MessageListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-4 p-4">
      {Array.from({ length: count }).map((_, i) => (
        <ChatBubbleSkeleton key={i} isOwn={i % 2 === 0} />
      ))}
    </div>
  );
}
