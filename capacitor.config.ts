import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.moswords.app',
  appName: 'Moswords',
  // The app shell loads from APK assets instantly (no network needed to start).
  // public/index.html immediately navigates (window.location) to https://awehchat.co.za
  // which the WebView opens as a real external URL since hostname is 'localhost'.
  webDir: 'public',
  server: {
    androidScheme: 'https',
    hostname: 'localhost',  // local assets served at https://localhost — awehchat.co.za is external navigation
    cleartext: false,
    allowNavigation: [
      'awehchat.co.za',
      '*.awehchat.co.za',
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
      smallIcon: 'ic_stat_icon_config_sample',
      iconColor: '#7c3aed',
    },
  },
};

export default config;

