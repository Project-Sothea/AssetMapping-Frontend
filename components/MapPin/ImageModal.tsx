import React from 'react';
import {
  Modal,
  View,
  Image,
  StyleSheet,
  TouchableWithoutFeedback,
  ScrollView,
  Dimensions,
} from 'react-native';

type ImageModalProps = {
  visible: boolean;
  images: string[];
  initialIndex?: number;
  onClose: () => void;
};

export const ImageModal: React.FC<ImageModalProps> = ({
  visible,
  images,
  initialIndex = 0,
  onClose,
}) => {
  const { width, height } = Dimensions.get('window');
  console.log('ImageModal images: ');

  if (!images || images.length === 0) return null;

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
            {images.map((uri, i) => (
              <View
                key={i}
                style={{ width, height, justifyContent: 'center', alignItems: 'center' }}>
                <Image
                  source={{ uri }}
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
