import React, { useState, useEffect, useCallback } from 'react';
import { Image, ImageProps, ImageStyle, StyleProp, View } from 'react-native';

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
    if (!filename || !pinId) {
      setIsLoading(false);
      return;
    }

    // Reset state
    setHasLocalFailed(false);
    setCurrentUri(null);
    setIsLoading(true);

    const { getLocalPath, fileExistsLocally, getRemoteUrl } = await import(
      '~/services/images/ImageManager'
    );

    // Try local file first
    const localPath = getLocalPath(pinId, filename);
    const exists = fileExistsLocally(pinId, filename);

    if (exists && !hasLocalFailed) {
      console.log('📁 Using local file:', filename);
      console.log(localPath);
      setCurrentUri(localPath);
      setIsLoading(false);
      return;
    }

    // File doesn't exist locally or local failed, try remote
    const remoteUrl = await getRemoteUrl(pinId, filename);
    if (remoteUrl) {
      console.log('🌐 Using remote URL:', filename);
      setCurrentUri(remoteUrl);
      setIsLoading(false);
      return;
    }

    // No images available
    console.warn('❌ No image available:', filename);
    setIsLoading(false);
  }, [filename, pinId, hasLocalFailed]);

  useEffect(() => {
    loadImage();
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
