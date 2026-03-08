'use client';
import { useEffect } from 'react';

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
