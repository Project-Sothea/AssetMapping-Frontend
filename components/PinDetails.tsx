import { View, Text, StyleSheet, ScrollView, Image } from 'react-native';
import { Pin } from '~/utils/globalTypes';
import { Button } from './Button';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { EditableForm } from './Pin/EditableForm';
type PinDetailsProps = {
  pin: Pin;
};

export default function PinDetails({ pin }: PinDetailsProps) {
  const router = useRouter();

  const [isEditing, setIsEditing] = useState(false);
  const [pinDetails, setPinDetails] = useState({ ...pin });

  const handleChange = (key: keyof Pin, value: string) => {
    setPinDetails((prev) => ({ ...prev, [key]: value }));
  };

  const handleViewForms = () => {
    router.push({ pathname: '/map/form/[pinId]', params: { pinId: pin.id, pinName: pin.name } });
  };

  return (
    <View>
      <Text style={styles.title}>{pin.name}</Text>

      {pin.images && pin.images.length > 0 && (
        <ScrollView horizontal style={styles.imageScroll}>
          {pin.images.map((uri, i) => (
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
        <Text>{pin.state_province || 'N/A'}</Text>
      </View>

      <View style={styles.infoRow}>
        <Text style={styles.label}>Postal Code: </Text>
        <Text>{pin.postal_code || 'N/A'}</Text>
      </View>

      <View style={styles.infoRow}>
        <Text style={styles.label}>Country: </Text>
        <Text>{pin.country || 'N/A'}</Text>
      </View>

      <View style={styles.infoRow}>
        <Text style={styles.label}>Type: </Text>
        <Text>{pin.type}</Text>
      </View>

      <Button title="View Forms" onPress={handleViewForms}></Button>
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
