import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.moswords.app',
  appName: 'Moswords',
  webDir: 'public',
  server: {
    // DEVELOPMENT: Connected to local dev server
    url: 'http://192.168.31.217:3000',
    cleartext: true,
    
    // PRODUCTION: Set your deployed app URL
    // url: 'https://your-app-url.vercel.app',
    
    androidScheme: 'https',
    hostname: 'moswords.app',
  },
  android: {
    backgroundColor: '#030014',
    allowMixedContent: true,
    captureInput: true,
    webContentsDebuggingEnabled: true,
    loggingBehavior: 'debug',
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



