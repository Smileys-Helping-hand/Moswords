import type { CapacitorConfig } from '@capacitor/cli';

const PRODUCTION_URL =
  process.env.CAPACITOR_SERVER_URL ||
  process.env.NEXT_PUBLIC_SITE_URL ||
  process.env.NEXT_PUBLIC_API_BASE ||
  'https://awehchat.co.za';

const config: CapacitorConfig = {
  appId: 'com.moswords.app',
  appName: 'Moswords',
  webDir: 'capacitor-shell',
  server: {
    url: PRODUCTION_URL,
    cleartext: false,
    androidScheme: 'https',
    allowNavigation: [
      'localhost',
      '127.0.0.1',
      '10.0.2.2',
      'awehchat.co.za',
      '*.awehchat.co.za',
      '*.vercel.app',
      'neon.tech',
      '*.neon.tech',
      'r2.dev',
      '*.r2.dev',
      'livekit.cloud',
      '*.livekit.cloud',
      'livekit.io',
    ],
  },
  android: {
    backgroundColor: '#030014',
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
    CapacitorHttp: {
      enabled: false,
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#030014',
      overlaysWebView: true,
    },
    SplashScreen: {
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
      iconColor: '#00F0FF',
    },
  },
};

export default config;
