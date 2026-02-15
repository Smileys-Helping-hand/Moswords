'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMobileFeatures } from '@/hooks/use-mobile-features';

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: React.ReactNode;
  threshold?: number;
  refreshingText?: string;
  pullText?: string;
  releaseText?: string;
}

/**
 * Pull-to-refresh component for mobile
 * Adds native-feeling pull gesture to refresh content
 */
export default function PullToRefresh({
  onRefresh,
  children,
  threshold = 80,
  refreshingText = 'Refreshing...',
  pullText = 'Pull to refresh',
  releaseText = 'Release to refresh',
}: PullToRefreshProps) {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [canPull, setCanPull] = useState(false);
  const startY = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const { haptic, isNative } = useMobileFeatures();

  const handleTouchStart = useCallback((e: TouchEvent) => {
    // Only allow pull if scrolled to top
    if (containerRef.current && containerRef.current.scrollTop === 0) {
      startY.current = e.touches[0].clientY;
      setCanPull(true);
    }
  }, []);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!canPull || isRefreshing) return;

    const currentY = e.touches[0].clientY;
    const distance = currentY - startY.current;

    if (distance > 0) {
      setPullDistance(Math.min(distance, threshold * 1.5));
      
      // Haptic feedback when reaching threshold
      if (distance >= threshold && pullDistance < threshold) {
        haptic.light();
      }
    }
  }, [canPull, isRefreshing, threshold, haptic, pullDistance]);

  const handleTouchEnd = useCallback(async () => {
    if (!canPull || isRefreshing) return;

    if (pullDistance >= threshold) {
      setIsRefreshing(true);
      haptic.medium();
      
      try {
        await onRefresh();
      } catch (error) {
        console.error('Refresh failed:', error);
        haptic.error();
      } finally {
        setIsRefreshing(false);
        haptic.success();
      }
    }

    setPullDistance(0);
    setCanPull(false);
  }, [canPull, isRefreshing, pullDistance, threshold, onRefresh, haptic]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !isNative) return;

    container.addEventListener('touchstart', handleTouchStart, { passive: true });
    container.addEventListener('touchmove', handleTouchMove, { passive: true });
    container.addEventListener('touchend', handleTouchEnd);

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd, isNative]);

  const progress = Math.min(pullDistance / threshold, 1);
  const rotation = progress * 360;

  return (
    <div ref={containerRef} className="relative h-full overflow-auto">
      {/* Refresh Indicator */}
      <AnimatePresence>
        {(pullDistance > 0 || isRefreshing) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute top-0 left-0 right-0 flex flex-col items-center justify-center z-50"
            style={{ height: Math.max(pullDistance, isRefreshing ? threshold : 0) }}
          >
            <div className="flex flex-col items-center gap-2 py-4">
              <motion.div
                animate={{
                  rotate: isRefreshing ? 360 : rotation,
                }}
                transition={{
                  duration: isRefreshing ? 1 : 0,
                  repeat: isRefreshing ? Infinity : 0,
                  ease: 'linear',
                }}
              >
                <RefreshCw
                  className={`w-6 h-6 ${
                    isRefreshing ? 'text-primary' : 'text-muted-foreground'
                  }`}
                />
              </motion.div>
              <span className="text-xs text-muted-foreground font-medium">
                {isRefreshing
                  ? refreshingText
                  : pullDistance >= threshold
                  ? releaseText
                  : pullText}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Content */}
      <div
        style={{
          transform: `translateY(${isRefreshing ? threshold : Math.min(pullDistance, threshold)}px)`,
          transition: isRefreshing || pullDistance === 0 ? 'transform 0.3s ease-out' : 'none',
        }}
      >
        {children}
      </div>
    </div>
  );
}
