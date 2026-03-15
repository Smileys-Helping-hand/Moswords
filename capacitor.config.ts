import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.moswords.app',
  appName: 'Moswords',
  // Serve content from the deployed server URL.
  // In dev this is the laptop's local Next.js dev server (same WiFi).
  // In production, set CAPACITOR_SERVER_URL=https://your-domain.vercel.app
  // and rebuild before distributing.
  webDir: 'public',  // only used as a fallback while WebView loads
  server: {
    url: process.env.CAPACITOR_SERVER_URL || 'http://192.168.31.217:3000',
    cleartext: true,           // allow HTTP to local dev server
    androidScheme: 'https',
    hostname: 'moswords.app',
    allowNavigation: [
      'moswords.vercel.app',
      '192.168.31.217',
      'localhost',
      '*.neon.tech',
      '*.r2.dev',
      '*.livekit.cloud',
      'livekit.io',
    ],
  },
  android: {
    backgroundColor: '#030014',
    allowMixedContent: true,
    captureInput: true,
    webContentsDebuggingEnabled: true,
    loggingBehavior: 'debug',
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
      smallIcon: 'ic_stat_icon_config_sample',
      iconColor: '#7c3aed',
    },
  },
};

export default config;

