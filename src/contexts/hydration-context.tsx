'use client';

import { createContext, useContext, useEffect, useState } from 'react';

const HydrationContext = createContext<{ isHydrating: boolean }>({ isHydrating: true });

export function HydrationProvider({ children }: { children: React.ReactNode }) {
  const [isHydrating, setIsHydrating] = useState(true);

  useEffect(() => {
    // Check if we're already hydrated
    if (document.documentElement.classList.contains('hydrated')) {
      setIsHydrating(false);
      return;
    }

    // Listen for hydration completion
    const handleHydrationComplete = () => {
      setIsHydrating(false);
    };

    // Watch for the hydrated class being added
    const observer = new MutationObserver(() => {
      if (document.documentElement.classList.contains('hydrated')) {
        setIsHydrating(false);
        observer.disconnect();
      }
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });

    // Fallback timeout - mark as hydrated after 600ms
    const timeout = setTimeout(() => {
      setIsHydrating(false);
      observer.disconnect();
    }, 600);

    return () => {
      clearTimeout(timeout);
      observer.disconnect();
    };
  }, []);

  return (
    <HydrationContext.Provider value={{ isHydrating }}>
      {children}
    </HydrationContext.Provider>
  );
}

export function useIsHydrating() {
  const context = useContext(HydrationContext);
  if (!context) {
    throw new Error('useIsHydrating must be used within HydrationProvider');
  }
  return context.isHydrating;
}
