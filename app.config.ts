import { ExpoConfig, ConfigContext } from 'expo/config';

const isAllowedQaApiUrl = (value: string): boolean => {
  try {
    const url = new URL(value.trim());
    return (
      url.protocol === 'http:' &&
      ['10.0.2.2', '127.0.0.1', 'localhost'].includes(url.hostname) &&
      url.port === '3300' &&
      (url.pathname === '' || url.pathname === '/') &&
      !url.search &&
      !url.hash &&
      !url.username &&
      !url.password
    );
  } catch {
    return false;
  }
};

const isQaBuild = process.env.EXPO_PUBLIC_APP_ENV === 'qa';
const configuredApiUrl = process.env.EXPO_PUBLIC_API_URL ?? '';
if (isQaBuild && !isAllowedQaApiUrl(configuredApiUrl)) {
  throw new Error('QA builds require a local QA API URL; production API URLs are blocked.');
}
const baseBundleIdentifier = 'com.anonymous.AssetMapApp';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: isQaBuild ? "SO'FORM QA" : "SO'FORM",
  slug: 'AssetMapApp',
  version: '1.0.2',
  scheme: 'sotheaassets',
  web: {
    bundler: 'metro',
    output: 'static',
    favicon: './assets/favicon.png',
  },
  plugins: [
    'expo-router',
    ['./plugins/withLocalQaAndroid', { enabled: isQaBuild }],
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
    bundleIdentifier: isQaBuild ? baseBundleIdentifier + '.qa' : baseBundleIdentifier,
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
    package: isQaBuild ? baseBundleIdentifier + '.qa' : baseBundleIdentifier,
    permissions: [
      'android.permission.ACCESS_COARSE_LOCATION',
      'android.permission.ACCESS_FINE_LOCATION',
      'android.permission.RECORD_AUDIO',
    ],
  },
  extra: {
    router: {},
    appEnvironment: isQaBuild ? 'qa' : 'standard',
    syncProtocol: process.env.EXPO_PUBLIC_SYNC_PROTOCOL === 'legacy' ? 'legacy' : 'durable',
    eas: {
      projectId: process.env.EAS_PROJECT_ID ?? 'd019d9ea-2c0f-4eec-a19b-9208d487048f',
    },
  },
});
