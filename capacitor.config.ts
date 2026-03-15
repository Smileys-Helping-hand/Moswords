import type { CapacitorConfig } from '@capacitor/cli';

// --------------------------------------------------------------------------
// AUTO-SELECTS between dev and prod based on NODE_ENV / CAPACITOR_BUILD_MODE
// 
//   Development:  npx cap sync                  → uses CAPACITOR_SERVER_URL or local IP
//   APK Release:  CAPACITOR_BUILD_MODE=prod npx cap sync  → bundles from deployed URL
// --------------------------------------------------------------------------

const isProd = process.env.CAPACITOR_BUILD_MODE === 'prod';

// ⚠️  SET THIS after deploying to Vercel / Render / Railway etc.
//     e.g.  https://moswords.vercel.app
const PRODUCTION_URL = process.env.CAPACITOR_SERVER_URL || 'https://moswords.vercel.app';

// Your local machine IP while developing (the phone must be on same WiFi)
const DEV_URL = 'http://192.168.31.217:3000';

const config: CapacitorConfig = {
  appId: 'com.moswords.app',
  appName: 'Moswords',
  webDir: 'public',
  server: {
    url: isProd ? PRODUCTION_URL : DEV_URL,
    cleartext: !isProd,     // HTTPS only in production
    androidScheme: isProd ? 'https' : 'http',
    hostname: 'moswords.app',
    // Allow credentials / cookies across native bridge
    allowNavigation: [
      'moswords.vercel.app',
      '*.neon.tech',
      '*.r2.dev',
      '*.livekit.cloud',
      'livekit.io',
    ],
  },
  android: {
    backgroundColor: '#030014',
    allowMixedContent: !isProd,
    captureInput: true,
    webContentsDebuggingEnabled: !isProd,
    loggingBehavior: isProd ? 'none' : 'debug',
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

