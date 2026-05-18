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
  webDir: 'public',  // fallback assets (used if server.url is removed for local dev)
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
    // CapacitorHttp: intercepts window.fetch/XHR at the NATIVE layer.
    // This bypasses WebView CORS and SameSite cookie restrictions so the
    // bundled static app can talk to the API server without any CORS setup.
    CapacitorHttp: {
      enabled: true,
    },
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

