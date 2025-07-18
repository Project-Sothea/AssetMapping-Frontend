import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

type Props = {
  pin: any;
  onClose: () => void;
  onEdit: () => void; // can still edit existing form
};

export default function PinDetails({ pin, onClose, onEdit }: Props) {
  return (
    <View style={styles.overlay}>
      <View style={styles.card}>
        <Text style={styles.title}>Pin Details</Text>
        <Text>ID: {pin.id}</Text>
        <Text>Latitude: {pin.lat}</Text>
        <Text>Longitude: {pin.lng}</Text>
        <Text>Type: {pin.type}</Text>

        <TouchableOpacity onPress={onEdit} style={styles.editButton}>
          <Text style={{ color: 'white' }}>View/Edit Form</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <Text style={{ color: 'white' }}>Close</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  card: {
    backgroundColor: 'white',
    width: '90%',
    marginBottom: 40,
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 2 },
    elevation: 5,
  },
  title: {
    fontWeight: 'bold',
    fontSize: 16,
    marginBottom: 10,
  },
  editButton: {
    marginTop: 10,
    padding: 10,
    backgroundColor: '#333',
    borderRadius: 8,
    alignItems: 'center',
  },
  closeButton: {
    marginTop: 10,
    padding: 10,
    backgroundColor: '#888',
    borderRadius: 8,
    alignItems: 'center',
  },
});

