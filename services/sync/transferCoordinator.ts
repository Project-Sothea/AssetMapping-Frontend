type TransferKind = 'setup' | 'upload' | 'download' | 'clear';
let state: { kind: TransferKind | null; setupReady: boolean } = { kind: null, setupReady: false };
const listeners = new Set<() => void>();
function publish() {
  for (const listener of listeners) listener();
}
export const getTransferState = () => state;
export function subscribeTransferState(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
export function finishSetup() {
  state = { ...state, setupReady: true };
  publish();
}
export function assertLocalWritesAllowed(): void {
  if (!state.setupReady || state.kind)
    throw new Error(
      'Please wait until data setup or transfer has finished. Your changes have not been saved.'
    );
}
export async function runTransfer<T>(kind: TransferKind, action: () => Promise<T>): Promise<T> {
  if (state.kind || (!state.setupReady && kind !== 'setup'))
    throw new Error('Another transfer or initial setup is in progress. Please wait.');
  state = { ...state, kind };
  publish();
  try {
    return await action();
  } finally {
    state = { ...state, kind: null };
    publish();
  }
}
