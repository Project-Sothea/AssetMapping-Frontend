import React from 'react';
import {
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ImageStyle,
  StyleProp,
  ViewStyle,
} from 'react-native';

import { FallbackImage } from './FallbackImage';

type FallbackImageListProps = {
  images: string[];
  pinId: string;
  imageStyle?: StyleProp<ImageStyle>;
  containerStyle?: StyleProp<ViewStyle>;
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
 *   images={pin.images}
 *   pinId={pin.id}
 *   imageStyle={styles.thumbnail}
 *   onImagePress={(index) => openImageModal(index)}
 * />
 */
export const FallbackImageList: React.FC<FallbackImageListProps> = ({
  images,
  pinId,
  imageStyle,
  containerStyle,
  onImagePress,
  horizontal = true,
  maxImages,
}) => {
  // Limit number of images if specified
  const displayFilenames = maxImages ? images.slice(0, maxImages) : images;

  if (displayFilenames.length === 0) {
    return null;
  }

  return (
    <ScrollView
      horizontal={horizontal}
      showsHorizontalScrollIndicator={false}
      showsVerticalScrollIndicator={false}
      style={[horizontal ? styles.horizontalScroll : styles.verticalScroll, containerStyle]}
      contentContainerStyle={horizontal ? styles.horizontalContent : styles.verticalContent}>
      {displayFilenames.map((filename, index) => (
        <TouchableOpacity
          key={`${pinId}-${filename}-${index}`}
          onPress={() => onImagePress?.(index)}
          disabled={!onImagePress}
          activeOpacity={onImagePress ? 0.7 : 1}>
          <FallbackImage
            filename={filename}
            pinId={pinId}
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
