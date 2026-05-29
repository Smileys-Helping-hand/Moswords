'use client';

import Image from 'next/image';
import { useState } from 'react';
import { useDeviceOptimization, getImageOptimization } from '@/hooks/useDeviceOptimization';

interface OptimizedImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  priority?: boolean;
  className?: string;
}

/**
 * Optimized image component with device-based quality adjustment
 */
export default function OptimizedImage({
  src,
  alt,
  width = 400,
  height = 400,
  priority = false,
  className = '',
}: OptimizedImageProps) {
  const device = useDeviceOptimization();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);

  const optimization = getImageOptimization(device);

  if (error || !src) {
    return (
      <div
        className={`bg-muted flex items-center justify-center ${className}`}
        style={{ aspectRatio: `${width}/${height}` }}
      >
        <span className="text-muted-foreground text-sm">Image failed to load</span>
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden ${className}`}>
      <Image
        src={src}
        alt={alt}
        width={Math.min(width, optimization.maxWidth)}
        height={Math.min(height, optimization.maxWidth)}
        priority={priority}
        quality={optimization.quality}
        loading={optimization.loading as 'lazy' | 'eager'}
        onLoadingComplete={() => setIsLoading(false)}
        onError={() => setError(true)}
        className={`w-full h-full object-cover transition-opacity duration-300 ${
          isLoading ? 'opacity-0' : 'opacity-100'
        }`}
      />
      {isLoading && (
        <div className="absolute inset-0 bg-muted animate-pulse" />
      )}
    </div>
  );
}
