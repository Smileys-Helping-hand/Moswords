'use client';

import { Wifi, WifiOff } from 'lucide-react';
import { useMobileFeatures } from '@/hooks/use-mobile-features';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * Network status indicator that appears when the device goes offline
 * Automatically shows/hides based on connection state
 */
export default function NetworkStatus() {
  const { networkStatus, isNative } = useMobileFeatures();

  // Only show if offline
  if (networkStatus.connected) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -100, opacity: 0 }}
        className="fixed top-0 left-0 right-0 z-50 safe-area-top"
      >
        <div className="bg-destructive text-destructive-foreground px-4 py-3 shadow-lg">
          <div className="flex items-center justify-center gap-2 text-sm font-medium">
            <WifiOff className="w-4 h-4" />
            <span>No Internet Connection</span>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

/**
 * Simple inline network status badge
 */
export function NetworkBadge() {
  const { networkStatus } = useMobileFeatures();

  if (networkStatus.connected) {
    return (
      <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-success/10 text-success text-xs">
        <Wifi className="w-3 h-3" />
        <span>Online</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-destructive/10 text-destructive text-xs">
      <WifiOff className="w-3 h-3" />
      <span>Offline</span>
    </div>
  );
}
