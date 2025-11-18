/**
 * Image Display Strategy for Offline-First Apps
 *
 * OFFLINE-FIRST HYBRID APPROACH:
 *
 * DATABASE STRATEGY:
 * - `localImages`: Local file paths in documentDirectory (persistent, survives app restarts)
 * - `images`: Remote URLs from backend (backup/reference)
 *
 * IMAGE PERSISTENCE:
 * - Local files stored in FileSystem.documentDirectory (never cleared by OS)
 * - Remote images automatically downloaded to local storage during sync
 * - React Native's image cache is memory-only (cleared when app exits)
 *
 * DISPLAY PRIORITY:
 * 1. Local files (if available) - fastest, guaranteed offline access
 * 2. Remote URLs (if available) - fallback if local files missing
 * 3. Empty array (no images)
 *
 * WHY THIS IS OPTIMAL FOR OFFLINE-FIRST:
 * ✅ All images downloaded to persistent storage during sync
 * ✅ Works completely offline (no dependency on React Native cache)
 * ✅ Local files survive app restarts and device reboots
 * ✅ documentDirectory is backed up to iCloud/iTunes
 * ✅ Remote URLs kept as backup reference
 */

/**
 * Normalize file URI to include proper file:// scheme
 * Exported for use in forms and other components
 */
export function normalizeFileUri(uri: string): string {
  if (!uri) return uri;

  // Already has proper scheme
  if (uri.startsWith('file://') || uri.startsWith('http')) return uri;

  // Absolute path - add file:// scheme (required for iOS)
  if (uri.startsWith('/')) {
    const normalized = `file://${uri}`;
    console.log(`  📁 Normalized: ${uri.slice(0, 50)}... → ${normalized.slice(0, 50)}...`);
    return normalized;
  }

  return uri;
}
