import type { CapacitorConfig } from '@capacitor/cli';

// Development configuration - points to local dev server
const config: CapacitorConfig = {
  appId: 'com.moswords.app',
  appName: 'Moswords Dev',
  webDir: 'public', // Use public folder with capacitor-index.html
  server: {
    url: 'http://10.0.2.2:3000', // Android emulator localhost
    // For real device, use: 'http://YOUR_LOCAL_IP:3000'
    cleartext: true,
    androidScheme: 'http',
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
      showSpinner: true,
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
