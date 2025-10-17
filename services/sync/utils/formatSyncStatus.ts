export type SyncRawState = {
  isSyncing: boolean;
  lastSyncedAt: Date | null;
  lastSyncFailedAt: Date | null;
  lastSyncFailure: { at: Date; reason: string } | null;
};

export type DisplayStatus = { text: string; color: string };

export function formatSyncDisplay(state: SyncRawState): DisplayStatus {
  if (state.isSyncing) {
    return { text: 'Syncing...', color: '#3498db' };
  }

  if (
    state.lastSyncFailedAt &&
    (!state.lastSyncedAt || state.lastSyncFailedAt >= state.lastSyncedAt)
  ) {
    return {
      text: ` Sync (failed ${state.lastSyncFailedAt.toLocaleTimeString()})`,
      color: '#f39c12',
    };
  }

  if (state.lastSyncedAt) {
    return { text: `Synced (last ${state.lastSyncedAt.toLocaleTimeString()})`, color: '#2ecc71' };
  }

  return { text: 'Unsynced', color: '#e74c3c' };
}

export default formatSyncDisplay;
