export function resolveSyncProtocol(configured?: string): 'legacy' | 'durable' {
  if (configured !== undefined && configured !== 'legacy' && configured !== 'durable')
    throw new Error('Unsupported sync protocol configuration.');
  return configured ?? 'legacy';
}
// Future server support is explicit; regular builds retain the current contract.
export const isLegacySync = resolveSyncProtocol(process.env.EXPO_PUBLIC_SYNC_PROTOCOL) === 'legacy';
