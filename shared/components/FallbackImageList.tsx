import React from 'react';
import { StyleSheet, TouchableOpacity, ScrollView, ImageStyle, StyleProp } from 'react-native';
import { FallbackImage } from './FallbackImage';
import { parseImageUris } from '~/services/images/utils/uriUtils';

type FallbackImageListProps = {
  localImages?: string | null;
  remoteImages?: string | null;
  entityId: string;
  imageStyle?: StyleProp<ImageStyle>;
  containerStyle?: StyleProp<any>;
  onImagePress?: (index: number) => void;
  horizontal?: boolean;
  maxImages?: number;
};

/**
 * FallbackImageList Component
 *
 * Displays a list of images with intelligent fallback logic.
 * Each image tries local first, falls back to remote, and downloads remote images automatically.
 *
 * Usage:
 * <FallbackImageList
 *   localImages={pin.localImages}
 *   remoteImages={pin.images}
 *   entityId={pin.id}
 *   imageStyle={styles.thumbnail}
 *   onImagePress={(index) => openImageModal(index)}
 * />
 */
export const FallbackImageList: React.FC<FallbackImageListProps> = ({
  localImages,
  remoteImages,
  entityId,
  imageStyle,
  containerStyle,
  onImagePress,
  horizontal = true,
  maxImages,
}) => {
  const localUris = parseImageUris(localImages);
  const remoteUris = parseImageUris(remoteImages);

  // Create a combined list ensuring we have a slot for each image
  const maxLength = Math.max(localUris.length, remoteUris.length);
  const images = Array.from({ length: maxLength }, (_, index) => ({
    local: localUris[index] || null,
    remote: remoteUris[index] || null,
  }));

  // Limit number of images if specified
  const displayImages = maxImages ? images.slice(0, maxImages) : images;

  if (displayImages.length === 0) {
    return null;
  }

  return (
    <ScrollView
      horizontal={horizontal}
      showsHorizontalScrollIndicator={false}
      showsVerticalScrollIndicator={false}
      style={[horizontal ? styles.horizontalScroll : styles.verticalScroll, containerStyle]}
      contentContainerStyle={horizontal ? styles.horizontalContent : styles.verticalContent}>
      {displayImages.map((image, index) => (
        <TouchableOpacity
          key={index}
          onPress={() => onImagePress?.(index)}
          disabled={!onImagePress}
          activeOpacity={onImagePress ? 0.7 : 1}>
          <FallbackImage
            localUri={image.local}
            remoteUri={image.remote}
            entityId={entityId}
            style={[styles.defaultImage, imageStyle]}
          />
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  horizontalScroll: {
    marginBottom: 12,
  },
  verticalScroll: {
    marginBottom: 12,
  },
  horizontalContent: {
    paddingRight: 8,
  },
  verticalContent: {
    paddingBottom: 8,
  },
  defaultImage: {
    width: 80,
    height: 80,
    marginRight: 8,
    borderRadius: 8,
    backgroundColor: '#f3f3f3',
  },
});
