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
 * Get image URIs with intelligent fallback
 * Priority: Local files (if recent) > Remote URLs (if synced)
 */
export function getImageUrisWithFallback(
  remoteImages: string | string[] | null | undefined,
  localImages: string | string[] | null | undefined
): string[] {
  const local = parseImages(localImages);
  const remote = parseImages(remoteImages);

  // Priority 1: Use local files if available (faster for own pins)
  // These are files from camera/gallery before upload
  if (local.length > 0) {
    const normalized = local.map(normalizeFileUri);
    console.log('🖼️ Using local images:', normalized);
    return normalized;
  }

  // Priority 2: Use remote URLs (for synced pins from backend)
  // React Native automatically caches these
  if (remote.length > 0) {
    console.log('🌐 Using remote images:', remote);
    return remote;
  }

  return [];
}

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

// Helper functions
function parseImages(images: string | string[] | null | undefined): string[] {
  if (!images) return [];
  if (Array.isArray(images)) return images.filter(Boolean);
  if (typeof images === 'string') {
    try {
      const parsed = JSON.parse(images);
      return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
    } catch {
      return images ? [images] : [];
    }
  }
  return [];
}
