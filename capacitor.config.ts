import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.moswords.app',
  appName: 'Moswords',
  // Serve content from the deployed server URL.
  // Production default is the Vercel deployment.
  // For local dev on the same WiFi, set CAPACITOR_SERVER_URL=http://192.168.31.217:3000
  webDir: 'public',  // only used as a fallback while WebView loads
  server: {
    url: process.env.CAPACITOR_SERVER_URL || 'https://awehchat.co.za',
    cleartext: process.env.CAPACITOR_SERVER_URL?.startsWith('http://') ?? false,
    androidScheme: 'https',
    hostname: 'awehchat.co.za',
    allowNavigation: [
      'awehchat.co.za',
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
    allowMixedContent: process.env.CAPACITOR_SERVER_URL?.startsWith('http://') ?? false,
    captureInput: true,
    webContentsDebuggingEnabled: process.env.NODE_ENV === 'development',
    loggingBehavior: process.env.NODE_ENV === 'development' ? 'debug' : 'none',
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

