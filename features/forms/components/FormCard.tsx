import { memo } from 'react';
import { Text, StyleSheet, Pressable } from 'react-native';

import { displayOptionalText } from '~/shared/utils/displayOptionalText';

import type { FormSummary } from '../types';

type FormCardProps = {
  form: FormSummary;
  isSynced: boolean;
  onPress: (form: FormSummary) => void;
};

export const FormCard = memo(function FormCard({ form, isSynced, onPress }: FormCardProps) {
  const borderColor = isSynced ? '#2ecc71' : '#b45309';

  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        { borderLeftColor: borderColor },
        pressed && styles.cardPressed,
      ]}
      onPress={() => onPress(form)}>
      <Text style={styles.nameText}>{displayOptionalText(form.name)}</Text>
      <Text
        accessibilityLiveRegion="polite"
        style={[styles.dateText, { color: isSynced ? '#166534' : '#92400e' }]}>
        {isSynced ? 'Synced' : 'Saved on this device · waiting to sync'}
      </Text>
      <Text style={styles.dateText}>Submitted: {new Date(form.createdAt).toLocaleString()}</Text>
      {form.updatedAt && (
        <Text style={styles.dateText}>Updated: {new Date(form.updatedAt).toLocaleString()}</Text>
      )}
    </Pressable>
  );
});

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
});
