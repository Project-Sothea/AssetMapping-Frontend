export function resolveSyncProtocol(
  appEnvironment?: string,
  configured?: string
): 'legacy' | 'durable' {
  if (configured !== undefined && configured !== 'legacy' && configured !== 'durable')
    throw new Error('Unsupported sync protocol configuration.');
  return configured ?? (appEnvironment === 'qa' ? 'durable' : 'legacy');
}
// Normal builds stay compatible with production; durable mode is an explicit rollout choice.
export const isLegacySync =
  resolveSyncProtocol(process.env.EXPO_PUBLIC_APP_ENV, process.env.EXPO_PUBLIC_SYNC_PROTOCOL) ===
  'legacy';
