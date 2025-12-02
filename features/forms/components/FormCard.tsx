import { Text, StyleSheet, Pressable } from 'react-native';
import type { FormDB } from '~/db/schema';
import { useFormQueueStatus } from '~/hooks/RealTimeSync/useFormQueueStatus';
import { SwipeableCard } from '~/shared/components/ui/SwipeableCard';

type FormCardProps = {
  form: FormDB;
  onPress: (form: FormDB) => void;
  onDelete: (formId: string) => void;
};

export const FormCard = ({ form, onPress, onDelete }: FormCardProps) => {
  // Determine border color based on sync status from operations table
  const isSynced = useFormQueueStatus(form.id);
  const borderColor = isSynced ? '#2ecc71' : '#e74c3c'; // green for synced, red for unsynced

  const renderRightActions = () => (
    <Pressable style={styles.deleteAction} onPress={() => onDelete(form.id)}>
      <Text style={styles.deleteText}>Delete</Text>
    </Pressable>
  );

  return (
    <SwipeableCard renderRightActions={renderRightActions}>
      <Pressable
        style={({ pressed }) => [
          styles.card,
          { borderLeftColor: borderColor },
          pressed && styles.cardPressed,
        ]}
        onPress={() => onPress(form)}>
        {form.name ? (
          <Text style={styles.nameText}>{form.name}</Text>
        ) : (
          <Text style={styles.villageText}>{form.village}</Text>
        )}
        <Text style={styles.dateText}>Submitted: {new Date(form.createdAt).toLocaleString()}</Text>
        {form.updatedAt && (
          <Text style={styles.dateText}>Updated: {new Date(form.updatedAt).toLocaleString()}</Text>
        )}
      </Pressable>
    </SwipeableCard>
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
  cardPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.98 }],
  },
  villageText: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
    color: '#2c3e50',
  },
  nameText: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 6,
    color: '#111827',
  },
  dateText: {
    fontSize: 14,
    color: '#7f8c8d',
    marginBottom: 4,
  },
  deleteAction: {
    backgroundColor: '#e74c3c',
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingHorizontal: 20,
    marginBottom: 12,
    borderTopRightRadius: 12,
    borderBottomRightRadius: 12,
  },
  deleteText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
});
