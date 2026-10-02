'use client';

import { Wifi, WifiOff } from 'lucide-react';
import { useMobileFeatures } from '@/hooks/use-mobile-features';
import { motion } from 'framer-motion';

/**
 * Top-level network alert is centralized in OfflineBanner.
 * Default export returns null to prevent duplicate stacked banners.
 */
export default function NetworkStatus() {
  return null;
}

/**
 * Polished inline network status badge with pulse glow animation
 */
export function NetworkBadge() {
  const { networkStatus } = useMobileFeatures();

  if (networkStatus.connected) {
    return (
      <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium backdrop-blur-md">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
        </span>
        <Wifi className="w-3 h-3 text-emerald-400" />
        <span>Connected</span>
      </div>
    );
  }

  return (
    <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-medium backdrop-blur-md">
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
      </span>
      <WifiOff className="w-3 h-3 text-red-400" />
      <span>Offline</span>
    </div>
  );
}

