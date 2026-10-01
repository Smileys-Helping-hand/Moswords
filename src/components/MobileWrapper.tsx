'use client';
import { useEffect } from 'react';

/**
 * Status bar + keyboard setup inside the Android/iOS app. Renders nothing.
 *
 * (A global fetch() patch that rewrote /api calls to an absolute URL used to
 * live here, for an old static-export APK. The app now loads the live site,
 * so API calls are same-origin and the patch only added risk.)
 */
export default function MobileWrapper() {
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
    })().catch(() => {});
  }, []);

  return null;
}
