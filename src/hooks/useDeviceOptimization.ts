import { useState, useEffect } from 'react';

interface DeviceInfo {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isLowPowerDevice: boolean;
  screenSize: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  orientation: 'portrait' | 'landscape';
  hasReducedMotion: boolean;
  connectionSpeed: 'slow' | 'fast';
}

/**
 * Hook to optimize app based on device capabilities
 * Disables heavy animations on low-power devices
 * Adjusts layouts for different screen sizes
 */
export function useDeviceOptimization(): DeviceInfo {
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo>({
    isMobile: false,
    isTablet: false,
    isDesktop: true,
    isLowPowerDevice: false,
    screenSize: 'lg',
    orientation: 'portrait',
    hasReducedMotion: false,
    connectionSpeed: 'fast',
  });

  useEffect(() => {
    const updateDeviceInfo = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      const orientation = width > height ? 'landscape' : 'portrait';

      // Detect device capabilities
      const cores = navigator.hardwareConcurrency || 4;
      const memory = (navigator as any).deviceMemory || 8;
      const isLowPowerDevice = cores <= 2 || memory <= 4;

      // Check for reduced motion preference
      const hasReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      // Detect connection speed
      const connection = (navigator as any).connection;
      const connectionSpeed = connection?.effectiveType === '4g' ? 'fast' : 'slow';

      // Determine screen size
      let screenSize: DeviceInfo['screenSize'];
      if (width < 640) screenSize = 'sm';
      else if (width < 768) screenSize = 'md';
      else if (width < 1024) screenSize = 'lg';
      else if (width < 1280) screenSize = 'xl';
      else screenSize = '2xl';

      // Determine device type
      const isMobile = width < 768;
      const isTablet = width >= 768 && width < 1024;
      const isDesktop = width >= 1024;

      setDeviceInfo({
        isMobile,
        isTablet,
        isDesktop,
        isLowPowerDevice,
        screenSize,
        orientation,
        hasReducedMotion,
        connectionSpeed,
      });
    };

    updateDeviceInfo();
    window.addEventListener('resize', updateDeviceInfo);
    window.addEventListener('orientationchange', updateDeviceInfo);

    return () => {
      window.removeEventListener('resize', updateDeviceInfo);
      window.removeEventListener('orientationchange', updateDeviceInfo);
    };
  }, []);

  return deviceInfo;
}

/**
 * Get animation configuration based on device
 * Disables animations on low-power devices
 */
export function getAnimationConfig(device: DeviceInfo) {
  const disabled = device.isLowPowerDevice || device.hasReducedMotion;
  const duration = disabled ? 0 : 0.2;
  const stiffness = device.isLowPowerDevice ? 200 : 400;
  const damping = device.isLowPowerDevice ? 20 : 32;

  return {
    disabled,
    duration,
    stiffness,
    damping,
  };
}

/**
 * Get image optimization settings based on device
 */
export function getImageOptimization(device: DeviceInfo) {
  return {
    quality: device.isLowPowerDevice ? 70 : 90,
    maxWidth: device.screenSize === 'sm' ? 300 : device.screenSize === 'md' ? 500 : 1000,
    loading: device.connectionSpeed === 'slow' ? 'lazy' : 'eager',
  };
}
