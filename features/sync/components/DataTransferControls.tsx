import { MaterialIcons } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { useTransferState } from '~/hooks/RealTimeSync/useTransferState';
import {
  clearLocalData,
  downloadLatest,
  getLocalDataSummary,
} from '~/services/sync/localDataTransfer';
import { uploadPendingChanges } from '~/services/sync/queue/syncQueue';
import type { UploadResult } from '~/services/sync/queue/types';

export function DataTransferControls() {
  const client = useQueryClient();
  const { busy } = useTransferState();
  const active = useRef(false);
  const [working, setWorking] = useState(false);
  const [progress, setProgress] = useState<[number, number] | null>(null);
  const [message, setMessage] = useState('');
  const [result, setResult] = useState<UploadResult | null>(null);
  const { data: summary } = useQuery({
    queryKey: ['localDataSummary'],
    queryFn: getLocalDataSummary,
    refetchInterval: 2000,
  });
  const disabled = busy || working || !summary;
  const outstanding = (summary?.pending ?? 0) + (summary?.failed ?? 0);
  const canClear =
    !!summary && !outstanding && summary.unsynced === 0 && summary.pins + summary.forms > 0;
  const canDownload = !!summary && !outstanding && summary.pins === 0 && summary.forms === 0;

  const execute = async (action: () => Promise<void>) => {
    if (active.current || busy) return;
    active.current = true;
    setWorking(true);
    setMessage('');
    setProgress(null);
    setResult(null);
    try {
      await action();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : 'Transfer failed. Local records were retained.'
      );
    } finally {
      await Promise.all(
        ['pins', 'forms', 'queueMetrics', 'localDataSummary'].map((key) =>
          client.invalidateQueries({ queryKey: [key] })
        )
      );
      active.current = false;
      setWorking(false);
      setProgress(null);
    }
  };
  const upload = () =>
    execute(async () => {
      const uploaded = await uploadPendingChanges((done, total) => setProgress([done, total]));
      setResult(uploaded);
    });
  const download = () =>
    execute(async () => {
      const loaded = await downloadLatest();
      setMessage(`Downloaded ${loaded.pins} pins and ${loaded.forms} forms.`);
    });
  const confirmClear = () => {
    if (disabled || !canClear) return;
    Alert.alert(
      'Clear local data?',
      'Remove pins and forms from this device only? Backend records and offline map packs will remain.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear Local Data',
          style: 'destructive',
          onPress: () =>
            execute(async () => {
              const cleared = await clearLocalData();
              setMessage(
                ['Local data cleared. Backend records unchanged.', ...cleared.cleanupWarnings].join(
                  '\n'
                )
              );
            }),
        },
      ]
    );
  };

  return (
    <View style={styles.section}>
      <Text style={styles.heading}>Data Transfer</Text>
      <Text>
        {summary
          ? `${summary.pins} pins / ${summary.forms} forms on this device`
          : 'Checking local data...'}
      </Text>
      <Text>{summary ? `${summary.pending} pending / ${summary.failed} failed changes` : ''}</Text>
      <View style={styles.commands}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Upload changes"
          disabled={disabled || !outstanding}
          onPress={upload}
          style={[styles.command, (disabled || !outstanding) && styles.disabled]}>
          <MaterialIcons name="cloud-upload" size={22} color="#fff" />
          <Text style={styles.commandText}>Upload</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Download latest data"
          disabled={disabled || !canDownload}
          onPress={download}
          style={[styles.command, (disabled || !canDownload) && styles.disabled]}>
          <MaterialIcons name="cloud-download" size={22} color="#fff" />
          <Text style={styles.commandText}>Download Latest</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Clear local data"
          disabled={disabled || !canClear}
          onPress={confirmClear}
          style={[styles.command, styles.destructive, (disabled || !canClear) && styles.disabled]}>
          <MaterialIcons name="delete-outline" size={22} color="#fff" />
          <Text style={styles.commandText}>Clear Local Data</Text>
        </Pressable>
      </View>
      {progress && (
        <Text accessibilityLiveRegion="polite">
          Uploading {progress[0]} / {progress[1]} changes
        </Text>
      )}
      {result && (
        <View accessibilityLiveRegion="polite" style={styles.results}>
          <Text>{`${result.uploaded} uploaded / ${result.failed} failed / ${result.blocked} blocked / ${result.remaining} remaining`}</Text>
          {result.errors.map((error, index) => (
            <Text key={`${error.entityId}-${index}`} style={styles.error}>
              {`${error.entityType}: ${error.name}: ${error.message}`}
            </Text>
          ))}
        </View>
      )}
      {!!message && <Text accessibilityLiveRegion="polite">{message}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { paddingVertical: 16, gap: 10, borderBottomWidth: 1, borderBottomColor: '#cbd5e1' },
  heading: { fontSize: 20, fontWeight: '700', color: '#111827' },
  commands: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  command: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#235d73',
    padding: 12,
    borderRadius: 6,
    flexGrow: 1,
    flexShrink: 1,
  },
  commandText: { color: '#fff', fontWeight: '600', flexShrink: 1 },
  destructive: { backgroundColor: '#a52c39' },
  disabled: { opacity: 0.4 },
  results: { gap: 8 },
  error: { color: '#9f1239' },
});
