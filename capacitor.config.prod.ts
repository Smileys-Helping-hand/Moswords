import type { CapacitorConfig } from '@capacitor/cli';

// Production configuration - points to deployed app
const config: CapacitorConfig = {
  appId: 'com.moswords.app',
  appName: 'Moswords',
  webDir: 'public',
  server: {
    url: 'https://your-app-url.vercel.app', // UPDATE THIS with your production URL
    androidScheme: 'https',
  },
  android: {
    backgroundColor: '#030014',
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: false,
  },
  ios: {
    contentInset: 'automatic',
    backgroundColor: '#030014',
    preferredContentMode: 'mobile',
  },
  plugins: {
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#030014',
      overlaysWebView: true,
    },
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#030014',
      showSpinner: false,
      androidSpinnerStyle: 'small',
      splashFullScreen: true,
      splashImmersive: true,
    },
    Keyboard: {
      resize: 'body' as any,
      style: 'dark' as any,
      resizeOnFullScreen: true,
    },
  },
};

export default config;
