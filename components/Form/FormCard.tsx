import { View, Text, StyleSheet, Button } from 'react-native';
import { Form as FormType } from '~/utils/globalTypes';

type FormCardProps = {
  form: FormType;
  onEdit: (form: FormType) => void;
  onDelete: (formId: string) => void;
};

export const FormCard = ({ form, onEdit, onDelete }: FormCardProps) => {
  // Determine border color based on status
  const borderColor =
    form.status === 'dirty'
      ? '#e74c3c' // red for unsynced
      : '#2ecc71'; // green for synced

  return (
    <View style={[styles.card, { borderLeftColor: borderColor }]}>
      <Text style={styles.villageText}>{form.village}</Text>
      <Text style={styles.dateText}>Submitted: {new Date(form.createdAt).toLocaleString()}</Text>
      {form.updatedAt && (
        <Text style={styles.dateText}>Updated: {new Date(form.updatedAt).toLocaleString()}</Text>
      )}
      <View style={styles.buttonsRow}>
        <Button title="View" color="#3498db" onPress={() => onEdit(form)} />
        <View style={{ width: 10 }} />
        <Button title="Delete" color="#e74c3c" onPress={() => onDelete(form.id)} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderLeftWidth: 5, // accent for status
  },
  villageText: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
    color: '#2c3e50',
  },
  dateText: {
    fontSize: 14,
    color: '#7f8c8d',
    marginBottom: 4,
  },
  buttonsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    marginTop: 8,
  },
});
