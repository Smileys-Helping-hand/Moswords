'use client';

import { useEffect, useState, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import { motion, AnimatePresence } from 'framer-motion';
import { WifiOff, Wifi, RefreshCw, Radio } from 'lucide-react';
import { Button } from './ui/button';

export default function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(false);
  const [justReconnected, setJustReconnected] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const reconnectedTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      setJustReconnected(true);
      if (reconnectedTimeoutRef.current) clearTimeout(reconnectedTimeoutRef.current);
      reconnectedTimeoutRef.current = setTimeout(() => {
        setJustReconnected(false);
      }, 3500);
    };

    const handleOffline = () => {
      setIsOffline(true);
      setJustReconnected(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial check
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setIsOffline(true);
    }

    // For native Capacitor — also use Network plugin
    if (Capacitor.isNativePlatform()) {
      (async () => {
        const { Network } = await import('@capacitor/network');
        const status = await Network.getStatus();
        setIsOffline(!status.connected);

        await Network.addListener('networkStatusChange', (s) => {
          if (s.connected) {
            handleOnline();
          } else {
            handleOffline();
          }
        });
      })();
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (reconnectedTimeoutRef.current) clearTimeout(reconnectedTimeoutRef.current);
    };
  }, []);

  const handleManualRetry = async () => {
    setIsChecking(true);
    try {
      const res = await fetch('/api/health', { method: 'HEAD', cache: 'no-store' }).catch(() => null);
      if (res && res.ok) {
        setIsOffline(false);
        setJustReconnected(true);
        setTimeout(() => setJustReconnected(false), 3000);
      } else {
        // Still offline, trigger quick shake or haptic
        window.location.reload();
      }
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <div className="fixed top-0 left-0 right-0 z-50 pointer-events-none flex justify-center px-4 pt-2.5 safe-area-top">
      <AnimatePresence>
        {isOffline && (
          <motion.div
            key="offline-island"
            initial={{ y: -50, scale: 0.9, opacity: 0 }}
            animate={{ y: 0, scale: 1, opacity: 1 }}
            exit={{ y: -50, scale: 0.9, opacity: 0 }}
            transition={{ type: 'spring', damping: 22, stiffness: 320 }}
            className="pointer-events-auto flex items-center justify-between gap-3 max-w-lg w-full px-4 py-2 rounded-2xl bg-neutral-950/90 border border-red-500/40 text-neutral-100 shadow-[0_10px_35px_rgba(239,68,68,0.25)] backdrop-blur-xl"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="relative flex items-center justify-center w-7 h-7 rounded-xl bg-red-500/20 text-red-400 shrink-0">
                <WifiOff className="w-4 h-4" />
                <span className="absolute -top-0.5 -right-0.5 flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
                </span>
              </div>
              <div className="flex flex-col truncate">
                <span className="text-xs font-semibold text-white tracking-wide">
                  Offline Mode Active
                </span>
                <span className="text-[11px] text-neutral-400 truncate">
                  Local cache ready • messages will sync once reconnected
                </span>
              </div>
            </div>

            <Button
              size="sm"
              variant="outline"
              disabled={isChecking}
              className="h-7 px-2.5 text-xs rounded-xl bg-white/5 border-white/15 hover:bg-white/10 text-white shrink-0 transition-all hover:scale-105 active:scale-95"
              onClick={handleManualRetry}
            >
              <RefreshCw className={`w-3 h-3 mr-1.5 ${isChecking ? 'animate-spin text-cyan-400' : ''}`} />
              {isChecking ? 'Checking...' : 'Retry'}
            </Button>
          </motion.div>
        )}

        {!isOffline && justReconnected && (
          <motion.div
            key="reconnected-island"
            initial={{ y: -50, scale: 0.9, opacity: 0 }}
            animate={{ y: 0, scale: 1, opacity: 1 }}
            exit={{ y: -50, scale: 0.9, opacity: 0 }}
            transition={{ type: 'spring', damping: 22, stiffness: 320 }}
            className="pointer-events-auto flex items-center gap-2.5 px-4 py-2 rounded-2xl bg-neutral-950/90 border border-emerald-500/40 text-emerald-400 shadow-[0_10px_35px_rgba(16,185,129,0.25)] backdrop-blur-xl"
          >
            <div className="relative flex items-center justify-center w-7 h-7 rounded-xl bg-emerald-500/20 shrink-0">
              <Wifi className="w-4 h-4 text-emerald-400" />
              <span className="absolute -top-0.5 -right-0.5 flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-semibold text-white tracking-wide">
                Back Online
              </span>
              <span className="text-[11px] text-emerald-300/80">
                Connected to Moswords Network
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

