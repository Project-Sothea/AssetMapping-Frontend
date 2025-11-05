import React from 'react';
import {
  Modal,
  View,
  StyleSheet,
  TouchableWithoutFeedback,
  ScrollView,
  Dimensions,
} from 'react-native';
import { FallbackImage } from '~/shared/components/FallbackImage';

type ImageModalProps = {
  visible: boolean;
  localImages?: string | null;
  remoteImages?: string | null;
  entityId: string;
  initialIndex?: number;
  onClose: () => void;
};

export const ImageModal: React.FC<ImageModalProps> = ({
  visible,
  localImages,
  remoteImages,
  entityId,
  initialIndex = 0,
  onClose,
}) => {
  const { width, height } = Dimensions.get('window');

  // Parse image strings into arrays
  const localImageArray =
    localImages
      ?.split(',')
      .map((s) => s.trim())
      .filter(Boolean) || [];
  const remoteImageArray =
    remoteImages
      ?.split(',')
      .map((s) => s.trim())
      .filter(Boolean) || [];

  // Create a combined array pairing local with remote
  const maxLength = Math.max(localImageArray.length, remoteImageArray.length);
  const imagePairs: { local?: string; remote?: string }[] = [];
  for (let i = 0; i < maxLength; i++) {
    imagePairs.push({
      local: localImageArray[i],
      remote: remoteImageArray[i],
    });
  }

  if (imagePairs.length === 0) return null;

  return (
    <Modal visible={visible} transparent onRequestClose={onClose}>
      {/* Entire modal is tappable */}
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.modalBackground}>
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            contentOffset={{ x: initialIndex * width, y: 0 }}
            contentContainerStyle={{ alignItems: 'center', justifyContent: 'center' }}
            decelerationRate="fast"
            style={{ width, height }}>
            {imagePairs.map((pair, i) => (
              <View
                key={i}
                style={{ width, height, justifyContent: 'center', alignItems: 'center' }}>
                <FallbackImage
                  localUri={pair.local}
                  remoteUri={pair.remote}
                  entityId={entityId}
                  style={{ width: width * 0.9, height: height * 0.7, borderRadius: 12 }}
                  resizeMode="contain"
                />
              </View>
            ))}
          </ScrollView>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalBackground: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
