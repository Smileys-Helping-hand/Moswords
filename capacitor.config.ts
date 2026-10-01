import type { CapacitorConfig } from '@capacitor/cli';

const MOBILE_SERVER_URL =
  process.env.CAPACITOR_SERVER_URL ||
  process.env.NEXT_PUBLIC_SITE_URL ||
  process.env.NEXT_PUBLIC_API_BASE ||
  'https://awehchat.co.za';

const config: CapacitorConfig = {
  appId: 'com.moswords.app',
  appName: 'Moswords',
  // The WebView loads the configured host directly so the APK can share the same
  // authenticated origin as the web app. Set CAPACITOR_SERVER_URL for release builds.
  webDir: 'capacitor-shell',  // fallback assets (used if server.url is removed for local dev)
  server: {
    url: MOBILE_SERVER_URL,
    androidScheme: 'https',
    cleartext: false,
    allowNavigation: [
      'localhost',
      '127.0.0.1',
      '10.0.2.2',
      'awehchat.co.za',
      '*.awehchat.co.za',
      '*.neon.tech',
      '*.r2.dev',
      '*.livekit.cloud',
      'livekit.io',
    ],
  },
  android: {
    backgroundColor: '#030014',
    // Lets the site recognise the installed app (e.g. hide "Get the app").
    appendUserAgent: 'MoswordsApp',
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
    // CapacitorHttp would route every fetch/XHR through the native bridge (no
    // HTTP/2, no browser cache, an extra hop per request) — it made the app
    // sluggish. The WebView loads the live site, so API calls are same-origin
    // and need none of its CORS workarounds.
    CapacitorHttp: {
      enabled: false,
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#030014',
      overlaysWebView: true,
    },
    SplashScreen: {
      // Upper bound only: the web app hides the splash as soon as it renders
      // (components/MobileWrapper.tsx), usually well under a second.
      launchShowDuration: 3000,
      launchAutoHide: true,
      launchFadeOutDuration: 150,
      backgroundColor: '#030014',
      androidSplashResourceName: 'splash',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
      useDialog: false,
    },
    Keyboard: {
      resize: 'body' as any,
      style: 'dark' as any,
      resizeOnFullScreen: true,
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
    LocalNotifications: {
      smallIcon: 'ic_stat_notify',
      iconColor: '#7c3aed',
    },
  },
};

export default config;

