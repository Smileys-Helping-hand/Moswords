'use client';
import { useEffect } from 'react';

// --- Native API-base fetch interceptor -----------------------------------
// Route all relative /api/* calls to the configured server when running
// inside Capacitor so the static-exported APK can reach the backend.
// CapacitorHttp (enabled in capacitor.config.ts) then makes the request at
// the native layer, bypassing CORS and SameSite cookie restrictions entirely.
// -------------------------------------------------------------------------
if (typeof window !== 'undefined') {
  const API_BASE =
    (process.env.NEXT_PUBLIC_API_BASE as string | undefined) ?? '';

  if (API_BASE) {
    const _origFetch = window.fetch.bind(window);
    (window as any).fetch = function (
      input: RequestInfo | URL,
      init?: RequestInit
    ) {
      if (typeof input === 'string' && input.startsWith('/api/')) {
        input = `${API_BASE}${input}`;
      } else if (input instanceof URL && input.pathname.startsWith('/api/')) {
        input = new URL(`${API_BASE}${input.pathname}${input.search}`);
      } else if (input instanceof Request && input.url.startsWith('/api/')) {
        input = new Request(`${API_BASE}${input.url}`, input);
      }
      return _origFetch(input, init);
    };
  }
}

export default function MobileWrapper({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    (async () => {
      const { Capacitor } = await import('@capacitor/core');
      if (!Capacitor.isNativePlatform()) return;

      const [{ StatusBar, Style }, { Keyboard }] = await Promise.all([
        import('@capacitor/status-bar'),
        import('@capacitor/keyboard'),
      ]);

      await StatusBar.setOverlaysWebView({ overlay: true });
      await StatusBar.setStyle({ style: Style.Dark });
      Keyboard.setAccessoryBarVisible({ isVisible: false });
    })();
  }, []);

  return <>{children}</>;
}
