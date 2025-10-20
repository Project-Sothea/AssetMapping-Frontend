/**
 * Get or generate a stable device ID for the app.
 * Used for WebSocket connections and sync operations.
 */

// Cache the device ID to avoid regenerating on each call
let cachedDeviceId: string | null = null;

export function getDeviceId(): string {
  if (cachedDeviceId) {
    return cachedDeviceId;
  }

  // Try to get from storage
  const stored = typeof localStorage !== 'undefined' ? localStorage.getItem('deviceId') : null;
  if (stored) {
    cachedDeviceId = stored;
    return stored;
  }

  // Generate new ID
  const newId = `device-${Date.now()}-${Math.random().toString(36).substring(7)}`;
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem('deviceId', newId);
  }
  cachedDeviceId = newId;
  return newId;
}
