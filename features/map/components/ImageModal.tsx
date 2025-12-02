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
import { parseImageFilenames } from '~/services/images/ImageManager';

type ImageModalProps = {
  visible: boolean;
  images?: string | string[] | null;
  pinId: string;
  initialIndex?: number;
  onClose: () => void;
};

export const ImageModal: React.FC<ImageModalProps> = ({
  visible,
  images,
  pinId,
  initialIndex = 0,
  onClose,
}) => {
  const { width, height } = Dimensions.get('window');

  const filenames = parseImageFilenames(images);

  if (filenames.length === 0) return null;

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
            {filenames.map((filename, i) => (
              <View
                key={filename}
                style={{ width, height, justifyContent: 'center', alignItems: 'center' }}>
                <FallbackImage
                  filename={filename}
                  pinId={pinId}
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
