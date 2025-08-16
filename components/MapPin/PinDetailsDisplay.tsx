import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity } from 'react-native';
import { useState } from 'react';
import { Pin } from '~/db/schema';
import { ImageModal } from './ImageModal';

type PinDetailsProps = { pin: Pin };

export default function PinDetailsDisplay({ pin }: PinDetailsProps) {
  const [modalVisible, setModalVisible] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const imageURIs: string[] = pin.localImages ? JSON.parse(pin.localImages) : [];

  const openImage = (index: number) => {
    setActiveIndex(index);
    setModalVisible(true);
  };

  return (
    <View>
      <Text style={styles.title}>{pin.name}</Text>

      {imageURIs.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          snapToInterval={130} // image width 120 + marginRight 10
          decelerationRate="fast"
          contentContainerStyle={{ paddingHorizontal: 8 }}
          style={styles.imageScroll}>
          {imageURIs.map((uri, i) => (
            <TouchableOpacity
              key={i}
              onPress={() => openImage(i)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Image source={{ uri }} style={styles.image} />
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      <Text style={styles.description}>{pin.description || 'No description provided.'}</Text>

      <View style={styles.infoRow}>
        <Text style={styles.label}>Address: </Text>
        <Text>{pin.address || 'N/A'}</Text>
      </View>

      <View style={styles.infoRow}>
        <Text style={styles.label}>State/Province: </Text>
        <Text>{pin.stateProvince || 'N/A'}</Text>
      </View>

      <View style={styles.infoRow}>
        <Text style={styles.label}>Postal Code: </Text>
        <Text>{pin.postalCode || 'N/A'}</Text>
      </View>

      <View style={styles.infoRow}>
        <Text style={styles.label}>Type: </Text>
        <Text>{pin.type}</Text>
      </View>

      {/* Swipeable fullscreen image modal */}
      {modalVisible && (
        <ImageModal
          visible={modalVisible}
          images={imageURIs}
          initialIndex={activeIndex}
          onClose={() => {
            setModalVisible(false);
            console.log('closing modal');
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 12 },
  imageScroll: { marginBottom: 12 },
  image: { width: 120, height: 120, marginRight: 10, borderRadius: 8 },
  description: { fontSize: 16, marginBottom: 12 },
  infoRow: { flexDirection: 'row', marginBottom: 8 },
  label: { fontWeight: 'bold' },
});
