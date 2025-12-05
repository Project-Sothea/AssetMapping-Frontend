import React, { useState, useEffect, useCallback } from 'react';
import { Image, ImageProps, ImageStyle, StyleProp, View } from 'react-native';
import {
  cacheRemoteImage,
  fileExistsLocally,
  getLocalPath,
  getRemoteUrl,
} from '~/services/images/ImageManager';

type FallbackImageProps = Omit<ImageProps, 'source'> & {
  filename: string; // Just the filename (UUID.jpg)
  pinId: string; // Pin ID to construct paths
  style?: StyleProp<ImageStyle>;
};

/**
 * FallbackImage Component
 *
 * Intelligent image loading with automatic fallback:
 * 1. Try local file first (fastest, offline-friendly)
 * 2. If local fails or doesn't exist, fetch from remote URL
 * 3. Automatically download remote images to local storage for next time
 *
 * Usage:
 * <FallbackImage
 *   filename="abc-123.jpg"
 *   pinId={pin.id}
 *   style={styles.image}
 * />
 */
export const FallbackImage: React.FC<FallbackImageProps> = ({
  filename,
  pinId,
  style,
  onError,
  ...imageProps
}) => {
  const [currentUri, setCurrentUri] = useState<string | null>(null);
  const [hasLocalFailed, setHasLocalFailed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const loadImage = useCallback(async () => {
    let isActive = true;

    const setSafeState = (uri: string | null, loading: boolean, localFailed?: boolean) => {
      if (!isActive) return;
      if (uri !== undefined) setCurrentUri(uri);
      if (loading !== undefined) setIsLoading(loading);
      if (localFailed !== undefined) setHasLocalFailed(localFailed);
    };

    const cleanup = () => {
      isActive = false;
    };

    if (!filename || !pinId) {
      setSafeState(null, false);
      return cleanup;
    }

    // Reset state
    setSafeState(null, true);

    // Try local file first
    const localPath = getLocalPath(pinId, filename);
    const exists = fileExistsLocally(pinId, filename);

    if (exists && !hasLocalFailed) {
      console.log('📁 Using local file:', filename);
      console.log(localPath);
      setSafeState(localPath, false);
      return cleanup;
    }

    // File doesn't exist locally or local failed, try remote
    const remoteUrl = await getRemoteUrl(pinId, filename);
    if (remoteUrl) {
      console.log('🌐 Using remote URL:', filename);
      setSafeState(remoteUrl, false, true); // mark local failed so retries prefer cached/remote

      // Cache remote image for offline use (fire and forget)
      cacheRemoteImage(pinId, filename, remoteUrl)
        .then((cachedPath) => {
          if (cachedPath && isActive) {
            setCurrentUri(cachedPath);
          }
        })
        .catch(() => {
          // Already logged inside cacheRemoteImage
        });

      return cleanup;
    }

    // No images available
    console.warn('❌ No image available:', filename);
    setSafeState(null, false);
    return cleanup;
  }, [filename, pinId, hasLocalFailed]);

  useEffect(() => {
    let cleanup: (() => void) | undefined;

    loadImage()
      .then((fn) => {
        cleanup = fn;
      })
      .catch((error) => {
        console.warn('⚠️ Failed to load image', error);
      });

    return () => {
      if (cleanup) cleanup();
    };
  }, [loadImage]);

  const handleError = useCallback(
    (error: { nativeEvent?: { error?: string } }) => {
      console.error('❌ Image failed to load:', filename, error.nativeEvent?.error);

      // If local file failed, mark it and retry (will use remote)
      if (!hasLocalFailed) {
        console.log('🔄 Local failed, falling back to remote:', filename);
        setHasLocalFailed(true);
        loadImage(); // Retry, will use remote URL this time
      }

      // Call the original onError handler if provided
      if (onError) {
        onError(error as any);
      }
    },
    [filename, hasLocalFailed, loadImage, onError]
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
