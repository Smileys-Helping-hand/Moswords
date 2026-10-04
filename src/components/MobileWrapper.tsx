'use client';
import { useEffect } from 'react';
import { toast } from '@/hooks/use-toast';
import { ToastAction } from '@/components/ui/toast';

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

      // The web part updates itself on every launch, but native changes ship in
      // a new APK: tell people on an older build (once a day at most).
      try {
        const last = Number(localStorage.getItem('apk-update-prompted') || 0);
        if (Date.now() - last < 24 * 60 * 60 * 1000) return;
        const [{ App }, info] = await Promise.all([
          import('@capacitor/app'),
          fetch('/api/download/android?info=1').then((r) => (r.ok ? r.json() : null)),
        ]);
        const latest = info?.release;
        const installed = Number((await App.getInfo()).build);
        if (latest && installed && latest.versionCode > installed) {
          localStorage.setItem('apk-update-prompted', String(Date.now()));
          toast({
            title: `Moswords ${latest.versionName} is available`,
            description: 'Get the latest app for the newest features and fixes.',
            duration: 15000,
            action: (
              <ToastAction altText="Update the app" onClick={() => { window.location.href = '/download'; }}>
                Update
              </ToastAction>
            ),
          });
        }
      } catch {}
    })().catch(() => {});
  }, []);

  return null;
}
