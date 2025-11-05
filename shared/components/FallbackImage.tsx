import React, { useState, useEffect, useCallback } from 'react';
import { Image, ImageProps, ImageStyle, StyleProp, View } from 'react-native';
import * as FileSystem from 'expo-file-system';
import { ImageManager } from '~/services/images/ImageManager';

type FallbackImageProps = Omit<ImageProps, 'source'> & {
  localUri?: string | null;
  remoteUri?: string | null;
  style?: StyleProp<ImageStyle>;
  entityId?: string; // Optional: for downloading remote images to local storage
};

/**
 * FallbackImage Component
 *
 * Intelligent image loading with automatic fallback:
 * 1. Try local file first (fastest, offline-friendly)
 * 2. If local fails or doesn't exist, try remote URL
 * 3. If using remote, automatically download to local storage for next time
 *
 * Usage:
 * <FallbackImage
 *   localUri={pin.localImages?.[0]}
 *   remoteUri={pin.images?.[0]}
 *   entityId={pin.id}
 *   style={styles.image}
 * />
 */
export const FallbackImage: React.FC<FallbackImageProps> = ({
  localUri,
  remoteUri,
  entityId,
  style,
  onError,
  ...imageProps
}) => {
  const [currentUri, setCurrentUri] = useState<string | null>(null);
  const [hasLocalFailed, setHasLocalFailed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const normalizeFileUri = useCallback((uri: string): string => {
    if (!uri) return uri;
    if (uri.startsWith('file://') || uri.startsWith('http')) return uri;
    if (uri.startsWith('/')) return `file://${uri}`;
    return uri;
  }, []);

  const checkLocalFileExists = useCallback(
    async (uri: string): Promise<boolean> => {
      try {
        const normalizedUri = normalizeFileUri(uri);
        const path = normalizedUri.replace('file://', '');
        const info = await FileSystem.getInfoAsync(path);
        return info.exists;
      } catch (error) {
        console.warn('⚠️ FallbackImage: Failed to check local file:', error);
        return false;
      }
    },
    [normalizeFileUri]
  );

  const downloadRemoteImageInBackground = useCallback(async (remoteUrl: string, eId: string) => {
    try {
      console.log('📥 FallbackImage: Downloading remote image to local storage...');
      // Use ImageManager.saveImages which handles downloading remote URLs
      const result = await ImageManager.saveImages(eId, [remoteUrl]);

      if (result.success.length > 0) {
        console.log('✅ FallbackImage: Downloaded successfully:', result.success[0]);
      } else if (result.fail.length > 0) {
        console.warn('⚠️ FallbackImage: Download failed:', result.fail);
      }
    } catch (error) {
      console.error('❌ FallbackImage: Download error:', error);
    }
  }, []);

  const loadImage = useCallback(async () => {
    // Reset state
    setHasLocalFailed(false);
    setCurrentUri(null);
    setIsLoading(true);

    // Step 1: Try local file first
    if (localUri && !hasLocalFailed) {
      const localExists = await checkLocalFileExists(localUri);
      if (localExists) {
        const normalizedUri = normalizeFileUri(localUri);
        console.log('📁 FallbackImage: Using local file:', normalizedUri);
        setCurrentUri(normalizedUri);
        setIsLoading(false);
        return;
      } else {
        console.log(
          '⚠️ FallbackImage: Local file not found (will use remote, no re-download):',
          localUri
        );
      }
    }

    // Step 2: Fall back to remote URL
    if (remoteUri) {
      console.log('🌐 FallbackImage: Using remote URL:', remoteUri);
      setCurrentUri(remoteUri);
      setIsLoading(false);

      // Step 3: ONLY download if localUri was never set (null/undefined)
      // If localUri exists but file is missing, it means the file was deleted/corrupted
      // In that case, just use remote without re-downloading to avoid filename conflicts
      if (entityId && !localUri) {
        console.log('📥 FallbackImage: No local copy exists, will download remote image');
        downloadRemoteImageInBackground(remoteUri, entityId);
      }
      return;
    }

    // No images available
    setIsLoading(false);
  }, [
    localUri,
    remoteUri,
    entityId,
    hasLocalFailed,
    checkLocalFileExists,
    normalizeFileUri,
    downloadRemoteImageInBackground,
  ]);

  useEffect(() => {
    loadImage();
  }, [loadImage]);

  const handleError = useCallback(
    (error: any) => {
      console.error(
        '❌ FallbackImage: Image failed to load:',
        currentUri,
        error.nativeEvent?.error
      );

      // If local image failed, try remote (but don't re-download)
      if (currentUri === normalizeFileUri(localUri || '') && remoteUri) {
        console.log('🔄 FallbackImage: Local failed, falling back to remote (no re-download)');
        setHasLocalFailed(true);
        setCurrentUri(remoteUri);
        // Don't auto-download here - the localUri exists in DB but file is corrupt/missing
        // Re-downloading would create a new filename and cause sync issues
      }

      // Call the original onError handler if provided
      if (onError) {
        onError(error);
      }
    },
    [currentUri, localUri, remoteUri, normalizeFileUri, onError]
  );

  if (!currentUri && isLoading) {
    // Return placeholder while loading
    return <View style={[style, { backgroundColor: '#f3f3f3' }]} />;
  }

  if (!currentUri) {
    // No image available at all
    return <View style={[style, { backgroundColor: '#e0e0e0' }]} />;
  }

  return (
    <Image
      {...imageProps}
      source={{ uri: currentUri, cache: 'force-cache' }}
      style={style}
      onError={handleError}
    />
  );
};
