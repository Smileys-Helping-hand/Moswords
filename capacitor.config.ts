import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.moswords.app',
  appName: 'Moswords',
  // The app shell (HTML/CSS/JS) is served from the APK's bundled assets (public/).
  // This makes the app open instantly with no network dependency.
  // The public/index.html loading page then navigates to awehchat.co.za.
  // API calls (/api/...) from JavaScript automatically resolve to awehchat.co.za
  // because hostname below remaps the WebView origin to that domain.
  webDir: 'public',
  server: {
    // NO server.url — app shell loads from APK assets, not the network.
    // Remove this comment block if you want the old behavior of loading directly
    // from the remote server (which requires the server to be reachable to start).
    androidScheme: 'https',
    hostname: 'awehchat.co.za',  // all relative fetch('/api/...') go to https://awehchat.co.za/api/...
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

