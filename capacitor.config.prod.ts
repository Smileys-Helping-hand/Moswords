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
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#030014',
      showSpinner: false,
      androidSpinnerStyle: 'small',
      splashFullScreen: true,
      splashImmersive: true,
    },
    Keyboard: {
      resize: 'body',
      style: 'dark',
      resizeOnFullScreen: true,
    },
  },
};

export default config;
