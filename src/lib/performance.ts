/**
 * Performance optimizations for the mobile app
 */

// Lazy load heavy components
export const lazyLoadComponent = (importFunc: () => Promise<any>) => {
  return importFunc;
};

// Image optimization helper
export const optimizeImageUrl = (url: string, width?: number, quality?: number): string => {
  if (!url) return '';
  
  // For external images, return as-is
  if (url.startsWith('http')) {
    return url;
  }
  
  // For local images, add optimization parameters if supported
  return url;
};

// Debounce function for performance
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  
  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Throttle function for scroll events
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  
  return function executedFunction(...args: Parameters<T>) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

// Intersection Observer for lazy loading
export const createIntersectionObserver = (
  callback: IntersectionObserverCallback,
  options?: IntersectionObserverInit
): IntersectionObserver => {
  return new IntersectionObserver(callback, {
    root: null,
    rootMargin: '50px',
    threshold: 0.1,
    ...options,
  });
};

// Check if device has low memory
export const isLowEndDevice = (): boolean => {
  if (typeof navigator === 'undefined') return false;
  
  // @ts-ignore - deviceMemory is not in TypeScript types yet
  const memory = navigator.deviceMemory;
  
  // If device has less than 4GB RAM, consider it low-end
  if (memory && memory < 4) {
    return true;
  }
  
  // Check hardware concurrency (CPU cores)
  const cores = navigator.hardwareConcurrency;
  if (cores && cores < 4) {
    return true;
  }
  
  return false;
};

// Preload critical resources
export const preloadImage = (src: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = reject;
    img.src = src;
  });
};

// Batch updates for better performance
export class BatchUpdater {
  private updates: Map<string, () => void> = new Map();
  private rafId: number | null = null;

  add(key: string, update: () => void) {
    this.updates.set(key, update);
    this.scheduleFlush();
  }

  private scheduleFlush() {
    if (this.rafId !== null) return;
    
    this.rafId = requestAnimationFrame(() => {
      this.flush();
    });
  }

  private flush() {
    this.updates.forEach((update) => update());
    this.updates.clear();
    this.rafId = null;
  }
}

// Local storage with quota management
export const storage = {
  set: (key: string, value: any): boolean => {
    try {
      const serialized = JSON.stringify(value);
      localStorage.setItem(key, serialized);
      return true;
    } catch (error) {
      console.error('Storage quota exceeded:', error);
      // Try to free up space
      storage.cleanup();
      return false;
    }
  },
  
  get: <T = any>(key: string): T | null => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : null;
    } catch (error) {
      console.error('Storage retrieval failed:', error);
      return null;
    }
  },
  
  remove: (key: string): void => {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error('Storage removal failed:', error);
    }
  },
  
  cleanup: (): void => {
    // Remove old cached data
    const keysToRemove: string[] = [];
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('cache_')) {
        keysToRemove.push(key);
      }
    }
    
    keysToRemove.forEach((key) => localStorage.removeItem(key));
  },
};

// Network speed detection
export const getConnectionSpeed = (): 'slow' | 'medium' | 'fast' => {
  if (typeof navigator === 'undefined') return 'medium';
  
  // @ts-ignore - connection is not in TypeScript types
  const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  
  if (!connection) return 'medium';
  
  const effectiveType = connection.effectiveType;
  
  if (effectiveType === 'slow-2g' || effectiveType === '2g') {
    return 'slow';
  } else if (effectiveType === '3g') {
    return 'medium';
  } else {
    return 'fast';
  }
};

// Reduce animations on low-end devices
export const shouldReduceAnimations = (): boolean => {
  if (typeof window === 'undefined') return false;
  
  // Check user preference
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  
  if (prefersReducedMotion) return true;
  
  // Check device capabilities
  return isLowEndDevice();
};
