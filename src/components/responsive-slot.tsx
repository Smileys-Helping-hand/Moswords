'use client';

import { useEffect, useState, type ReactNode } from 'react';

const DESKTOP_QUERY = '(min-width: 768px)';

/** true / false once known on the client; null during server render and hydration. */
export function useIsDesktop(): boolean | null {
  const [isDesktop, setIsDesktop] = useState<boolean | null>(null);
  useEffect(() => {
    const mql = window.matchMedia(DESKTOP_QUERY);
    const update = () => setIsDesktop(mql.matches);
    update();
    mql.addEventListener('change', update);
    return () => mql.removeEventListener('change', update);
  }, []);
  return isDesktop;
}

/**
 * Mount children only on desktop / only on mobile. Hiding with CSS alone still
 * mounted both copies, so screens like /dm fetched and synced everything twice.
 */
export function DesktopOnly({ children }: { children: ReactNode }) {
  return useIsDesktop() === true ? <>{children}</> : null;
}

export function MobileOnly({ children }: { children: ReactNode }) {
  return useIsDesktop() === false ? <>{children}</> : null;
}
