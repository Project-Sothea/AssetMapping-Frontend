// Explicit build choice. Never silently downgrade after a network/server error.
export const isLegacySync = process.env.EXPO_PUBLIC_SYNC_PROTOCOL === 'legacy';
