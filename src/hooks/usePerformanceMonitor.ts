import { useEffect } from 'react';

/**
 * Monitor component render performance in development
 * Logs slow renders to help identify performance bottlenecks
 */
export function usePerformanceMonitor(componentName: string, threshold = 16) {
  useEffect(() => {
    if (typeof window === 'undefined' || process.env.NODE_ENV !== 'development') {
      return;
    }

    const startTime = performance.now();

    return () => {
      const renderTime = performance.now() - startTime;
      if (renderTime > threshold) {
        console.warn(
          `⚠️ Slow render: ${componentName} took ${renderTime.toFixed(2)}ms (threshold: ${threshold}ms)`
        );
      }
    };
  }, [componentName, threshold]);
}

/**
 * Monitor network requests for slow responses
 */
export function useNetworkMonitor(url: string) {
  useEffect(() => {
    if (typeof window === 'undefined' || process.env.NODE_ENV !== 'development') {
      return;
    }

    const originalFetch = window.fetch;
    window.fetch = async (...args: Parameters<typeof fetch>) => {
      const startTime = performance.now();
      const response = await originalFetch(...args);
      const duration = performance.now() - startTime;

      if (duration > 1000) {
        console.warn(`⚠️ Slow network request: ${duration.toFixed(2)}ms - ${args[0]}`);
      }

      return response;
    };

    return () => {
      window.fetch = originalFetch;
    };
  }, [url]);
}
