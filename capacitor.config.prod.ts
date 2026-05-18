import type { CapacitorConfig } from '@capacitor/cli';

// ── PRODUCTION CONFIG ────────────────────────────────────────────────────────
// Used when building a release APK / IPA for distribution.
//
// Before building:
//   1. Deploy your Next.js app (e.g.  npx vercel --prod)
//   2. Set CAPACITOR_SERVER_URL in your environment, OR
//      update the url field directly below.
//   3. Run:  npm run build:apk:release
// ─────────────────────────────────────────────────────────────────────────────

const PRODUCTION_URL =
  process.env.CAPACITOR_SERVER_URL ||
  process.env.NEXT_PUBLIC_SITE_URL ||
  process.env.NEXT_PUBLIC_API_BASE ||
  'https://awehchat.co.za';

const config: CapacitorConfig = {
  appId: 'com.moswords.app',
  appName: 'Moswords',
  webDir: 'public',
  server: {
    url: PRODUCTION_URL,
    cleartext: false,
    androidScheme: 'https',
    hostname: 'moswords.app',
    allowNavigation: [
      'localhost',
      '127.0.0.1',
      '10.0.2.2',
      '*.vercel.app',
      '*.neon.tech',
      '*.r2.dev',
      '*.livekit.cloud',
    ],
  },
  android: {
    backgroundColor: '#030014',
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: false,
    loggingBehavior: 'none',
  },
  ios: {
    contentInset: 'automatic',
    backgroundColor: '#030014',
    preferredContentMode: 'mobile',
    scrollEnabled: false,
  },
  plugins: {
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#030014',
      overlaysWebView: true,
    },
    SplashScreen: {
      launchShowDuration: 2500,
      launchAutoHide: true,
      backgroundColor: '#030014',
      androidSplashResourceName: 'splash',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
    Keyboard: {
      resize: 'body' as any,
      style: 'dark' as any,
      resizeOnFullScreen: true,
    },
    LocalNotifications: {
      smallIcon: 'ic_stat_icon_config_sample',
      iconColor: '#7c3aed',
    },
  },
};

export default config;

