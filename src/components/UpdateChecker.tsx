'use client';

import { useEffect, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';
import { ToastAction } from '@/components/ui/toast';

const CHECK_EVERY_MS = 10 * 60 * 1000;

async function fetchVersion(): Promise<string | null> {
  try {
    const res = await fetch('/version.json', { cache: 'no-store' });
    if (!res.ok) return null;
    const data = await res.json();
    return typeof data.version === 'string' ? data.version : null;
  } catch {
    return null;
  }
}

/**
 * Tells the user when a new version has been deployed — it never reloads the
 * page on its own. (Automatic reloads, combined with the old service worker,
 * caused the app to get stuck in a reload loop, especially on phones.)
 *
 * The only automatic refresh is a quiet one when the app has been in the
 * background for a while: nobody is mid-message then.
 */
export default function UpdateChecker() {
  const { toast } = useToast();
  const loadedVersion = useRef<string | null>(null);
  const pending = useRef(false);
  const lastCheck = useRef(0);
  const hiddenAt = useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    const check = async () => {
      lastCheck.current = Date.now();
      const latest = await fetchVersion();
      if (cancelled || !latest) return;
      if (!loadedVersion.current) {
        loadedVersion.current = latest;
        return;
      }
      if (latest !== loadedVersion.current && !pending.current) {
        pending.current = true;
        toast({
          title: 'A new version of Moswords is ready',
          description: 'Refresh when you are ready — nothing you have sent will be lost.',
          duration: 1000 * 60 * 60,
          action: (
            <ToastAction altText="Refresh now" onClick={() => window.location.reload()}>
              Refresh
            </ToastAction>
          ),
        });
      }
    };

    const onVisibility = () => {
      if (document.hidden) {
        hiddenAt.current = Date.now();
        return;
      }
      const away = hiddenAt.current ? Date.now() - hiddenAt.current : 0;
      hiddenAt.current = null;
      // Back after 10+ minutes away with an update waiting: refresh quietly.
      if (pending.current && away > CHECK_EVERY_MS) {
        window.location.reload();
        return;
      }
      if (Date.now() - lastCheck.current > CHECK_EVERY_MS) check();
    };

    // Register/refresh the service worker on every page (not only after sign-in),
    // so anyone still running an old worker — including on the login screen —
    // switches to the current one on their next visit.
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js', { scope: '/', updateViaCache: 'none' })
        .then((registration) => registration.update())
        .catch(() => {});
    }

    check();
    const timer = setInterval(() => {
      if (!document.hidden) check();
    }, CHECK_EVERY_MS);
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      cancelled = true;
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [toast]);

  return null;
}
