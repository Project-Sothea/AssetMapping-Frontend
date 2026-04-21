import { ExpoConfig, ConfigContext } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: "SO'FORM",
  slug: 'AssetMapApp',
  version: '1.0.0',
  scheme: 'sotheaassets',
  web: {
    bundler: 'metro',
    output: 'static',
    favicon: './assets/favicon.png',
  },
  plugins: [
    'expo-router',
    [
      '@rnmapbox/maps',
      {
        RNMapBoxMapsVersion: '11.*',
      },
    ],
    [
      'expo-location',
      {
        locationWhenInUsePermission: 'Show current location on map.',
        isAndroidForegroundServiceEnabled: true,
      },
    ],
    'expo-sqlite',
    [
      'expo-image-picker',
      {
        photosPermission: 'Allow $(PRODUCT_NAME) to access your photos',
        cameraPermission: 'Allow $(PRODUCT_NAME) to use the camera',
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
    tsconfigPaths: true,
  },
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'light',
  splash: {
    image: './assets/splash.png',
    resizeMode: 'contain',
    backgroundColor: '#ffffff',
  },
  assetBundlePatterns: ['**/*'],
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.anonymous.AssetMapApp',
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false,
      NSCameraUsageDescription: 'This app needs access to your camera',
      NSPhotoLibraryUsageDescription: 'This app needs access to your photo library',
      NSLocationWhenInUseUsageDescription:
        "Allow SO'FORM to access your location to show your position on the map",
    },
  },
  android: {
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#ffffff',
    },
    package: 'com.anonymous.AssetMapApp',
    permissions: [
      'android.permission.ACCESS_COARSE_LOCATION',
      'android.permission.ACCESS_FINE_LOCATION',
      'android.permission.RECORD_AUDIO',
    ],
  },
  extra: {
    router: {},
    eas: {
      projectId: process.env.EAS_PROJECT_ID,
    },
  },
});
