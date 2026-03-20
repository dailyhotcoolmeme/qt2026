import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.myamen.app',
  appName: '마이아멘',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
  ios: {
    contentInset: 'always',
  },
  plugins: {
    StatusBar: {
      style: 'DEFAULT',
      backgroundColor: '#FFFFFF',
      overlaysWebView: true,
    },
    SplashScreen: {
      launchAutoHide: true,
      backgroundColor: '#E8F5E9',
      showSpinner: false,
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
  },
};

export default config;
