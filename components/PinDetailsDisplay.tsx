import { View, Text, StyleSheet, ScrollView, Image } from 'react-native';
import { Button } from './Button';
import { Pin } from '~/db/schema';

type PinDetailsProps = {
  pin: Pin;
};

export default function PinDetailsDisplay({ pin }: PinDetailsProps) {
  const imageURIs: string[] = pin.localImages ? JSON.parse(pin.localImages) : [];

  return (
    <View>
      <Text style={styles.title}>{pin.name}</Text>

      {imageURIs.length > 0 && (
        <ScrollView horizontal style={styles.imageScroll}>
          {imageURIs.map((uri, i) => (
            <Image key={i} source={{ uri }} style={styles.image} />
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
        <Text style={styles.label}>Country: </Text>
        <Text>{pin.country || 'N/A'}</Text>
      </View>

      <View style={styles.infoRow}>
        <Text style={styles.label}>Type: </Text>
        <Text>{pin.type}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  imageScroll: {
    marginBottom: 12,
  },
  image: {
    width: 120,
    height: 120,
    marginRight: 10,
    borderRadius: 8,
  },
  description: {
    fontSize: 16,
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  label: {
    fontWeight: 'bold',
  },
});
