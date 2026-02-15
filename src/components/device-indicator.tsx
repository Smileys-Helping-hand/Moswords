'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Smartphone, Tablet, Monitor } from 'lucide-react';

/**
 * Device type indicator for testing responsive design
 * Only visible in development mode
 */
export default function DeviceIndicator() {
  const isDev = process.env.NODE_ENV === 'development';
  const [mounted, setMounted] = useState(false);
  const [deviceType, setDeviceType] = useState<'mobile' | 'tablet' | 'desktop'>('mobile');
  const [screenSize, setScreenSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isDev || !mounted) return;

    const updateDeviceType = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      
      setScreenSize({ width, height });
      
      if (width < 768) {
        setDeviceType('mobile');
      } else if (width < 1024) {
        setDeviceType('tablet');
      } else {
        setDeviceType('desktop');
      }
    };

    updateDeviceType();
    window.addEventListener('resize', updateDeviceType);
    
    return () => window.removeEventListener('resize', updateDeviceType);
  }, [isDev, mounted]);

  if (!isDev || !mounted) return null;

  const Icon = deviceType === 'mobile' ? Smartphone : deviceType === 'tablet' ? Tablet : Monitor;

  return (
    <motion.div
      initial={{ opacity: 0, x: 100 }}
      animate={{ opacity: 1, x: 0 }}
      className="fixed bottom-24 right-4 z-50 md:bottom-4"
    >
      <div className="glass-panel px-3 py-2 rounded-lg border border-primary/50 shadow-lg">
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4 text-primary" />
          <div className="text-xs">
            <div className="font-semibold text-primary capitalize">{deviceType}</div>
            <div className="text-muted-foreground">
              {screenSize.width} × {screenSize.height}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
