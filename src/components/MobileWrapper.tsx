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
    // The native shell injects window.Capacitor; plain browsers skip all of this.
    if (!(window as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor?.isNativePlatform?.()) return;
    (async () => {
      const [{ SplashScreen }, { StatusBar, Style }, { Keyboard }] = await Promise.all([
        import('@capacitor/splash-screen'),
        import('@capacitor/status-bar'),
        import('@capacitor/keyboard'),
      ]);

      try {
        await SplashScreen.hide({ fadeOutDuration: 150 });
      } catch {}

      try {
        await StatusBar.setOverlaysWebView({ overlay: true });
        await StatusBar.setStyle({ style: Style.Dark });
      } catch {}

      try {
        await Keyboard.setAccessoryBarVisible({ isVisible: false });
      } catch {}
    })().catch(() => {});
  }, []);

  return null;
}
