import { ExpoConfig, ConfigContext } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'SPYCE',
  slug: 'spyce',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',         // ⚠️  UPDATE: Add your 1024x1024 icon PNG
  splash: {
    image: './assets/splash.png',    // ⚠️  UPDATE: Add your splash screen PNG
    resizeMode: 'cover',
    backgroundColor: '#0A0A0A',
  },
  scheme: 'spyce',
  userInterfaceStyle: 'dark',
  ios: {
    bundleIdentifier: 'io.spyce.app',  // ⚠️  UPDATE: Your Apple bundle ID
    buildNumber: '1',
    supportsTablet: false,
    infoPlist: {
      NSCameraUsageDescription: 'SPYCE needs camera access to record challenge videos and profile photos.',
      NSMicrophoneUsageDescription: 'SPYCE needs microphone access to record videos with audio.',
      NSLocationWhenInUseUsageDescription: 'SPYCE uses location to show nearby content and challenges.',
      NSMotionUsageDescription: 'SPYCE uses motion sensors to track challenge activity like steps.',
      NSHealthShareUsageDescription: 'SPYCE reads health data to verify wellness challenges.',
    },
  },
  android: {
    package: 'io.spyce.app',  // ⚠️  UPDATE: Your Android package name
    versionCode: 1,
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',  // ⚠️  UPDATE
      backgroundColor: '#0A0A0A',
    },
    permissions: [
      'CAMERA',
      'RECORD_AUDIO',
      'READ_MEDIA_VIDEO',
      'READ_MEDIA_IMAGES',
      'ACCESS_FINE_LOCATION',
      'ACTIVITY_RECOGNITION',
      'VIBRATE',
    ],
  },
  plugins: [
    'expo-router',
    'expo-camera',
    'expo-av',
    'expo-secure-store',
    'expo-sensors',
    'expo-location',
    [
      'expo-notifications',
      {
        icon: './assets/notification-icon.png',  // ⚠️  UPDATE
        color: '#FF6B2B',
      },
    ],
  ],
  extra: {
    // ⚠️  UPDATE: Set in Expo Dashboard → Project → Environment Variables
    apiUrl: process.env.EXPO_PUBLIC_API_URL,
    piApiKey: process.env.EXPO_PUBLIC_PI_API_KEY,
    cdnUrl: process.env.EXPO_PUBLIC_CDN_URL,
    eas: {
      projectId: 'YOUR_EAS_PROJECT_ID',  // ⚠️  UPDATE: From `eas init`
    },
  },
});
