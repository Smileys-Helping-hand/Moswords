'use client';

import { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { motion, AnimatePresence } from 'framer-motion';
import { WifiOff, RefreshCw } from 'lucide-react';
import { Button } from './ui/button';

export default function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(false);
  const [showRetry, setShowRetry] = useState(false);

  useEffect(() => {
    // For both native and web environments
    const handleOnline  = () => setIsOffline(false);
    const handleOffline = () => { setIsOffline(true); setShowRetry(true); };

    window.addEventListener('online',  handleOnline);
    window.addEventListener('offline', handleOffline);

    // Immediately check
    setIsOffline(!navigator.onLine);

    // For native Capacitor — also use Network plugin
    if (Capacitor.isNativePlatform()) {
      (async () => {
        const { Network } = await import('@capacitor/network');
        const status = await Network.getStatus();
        setIsOffline(!status.connected);

        await Network.addListener('networkStatusChange', (s) => {
          setIsOffline(!s.connected);
          if (s.connected) setShowRetry(false);
        });
      })();
    }

    return () => {
      window.removeEventListener('online',  handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <AnimatePresence>
      {isOffline && (
        <motion.div
          initial={{ y: -60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -60, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between gap-3 px-4 py-2.5 bg-destructive text-destructive-foreground text-sm font-medium shadow-lg safe-area-top"
        >
          <div className="flex items-center gap-2">
            <WifiOff className="w-4 h-4 shrink-0" />
            <span>No internet connection — using cached data</span>
          </div>
          {showRetry && (
            <Button
              size="sm"
              variant="secondary"
              className="h-7 px-2 text-xs"
              onClick={() => window.location.reload()}
            >
              <RefreshCw className="w-3 h-3 mr-1" />
              Retry
            </Button>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
