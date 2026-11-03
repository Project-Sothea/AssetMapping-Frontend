import { File } from 'expo-file-system/next';
import type { ImageRef } from 'expo-image-manipulator';

export const MAX_PHOTO_BYTES = 2 * 1024 * 1024;
export const MAX_PHOTO_EDGE = 1600;

function removeTemporary(uri: string) {
  try {
    const file = new File(uri);
    if (file.exists) file.delete();
  } catch {
    // Cache housekeeping must not turn a successful upload into a failed one.
    console.warn('A temporary upload photo could not be removed.');
  }
}

/** Keep the saved original and object key intact; resize only the upload copy. */
export async function prepareImageUpload(uri: string, contentType: string) {
  const original = new File(uri);
  if (!original.exists || original.size <= 0) throw new Error('Photo is missing or empty.');

  // Preserve animation/unknown formats rather than silently converting them to stills.
  if (
    !['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'].includes(contentType)
  ) {
    if (original.size > MAX_PHOTO_BYTES)
      throw new Error('This photo format exceeds the 2 MiB limit. Choose a JPEG or PNG photo.');
    return { uri, contentType, dispose: () => {} };
  }

  // Load the native codec only when required. Never read photo bytes/base64 into JS.
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- lazy native codec loading
  const codec = require('expo-image-manipulator') as typeof import('expo-image-manipulator');
  const context = codec.ImageManipulator.manipulate(uri);
  let rendered: ImageRef | undefined;
  const temporary = new Set<string>();
  let retained: string | undefined;
  try {
    // Android's display image pipeline can report downsampled dimensions. Make
    // both the pass-through and resize decisions from the actual codec bitmap.
    rendered = await context.renderAsync();
    const { width, height } = rendered;
    if (!(width > 0 && height > 0 && Number.isFinite(width) && Number.isFinite(height)))
      throw new Error('Could not read photo dimensions.');
    if (
      contentType === 'image/jpeg' &&
      original.size <= MAX_PHOTO_BYTES &&
      Math.max(width, height) <= MAX_PHOTO_EDGE
    )
      return { uri, contentType, dispose: () => {} };

    if (Math.max(width, height) > MAX_PHOTO_EDGE) {
      context.resize(width >= height ? { width: MAX_PHOTO_EDGE } : { height: MAX_PHOTO_EDGE });
      const resized = await context.renderAsync();
      rendered.release();
      rendered = resized;
    }
    // Normalize non-JPEG keys too: a cached JPEG may retain a PNG/HEIC suffix.
    for (const compress of [0.8, 0.6, 0.4]) {
      const result = await rendered.saveAsync({
        format: codec.SaveFormat.JPEG,
        compress,
        base64: false,
      });
      // The encoder must return a distinct cache file, never the saved original.
      if (result.uri === uri) throw new Error('Could not create a separate upload photo.');
      temporary.add(result.uri);
      const file = new File(result.uri);
      if (
        file.exists &&
        file.size > 0 &&
        file.size <= MAX_PHOTO_BYTES &&
        result.width > 0 &&
        result.height > 0 &&
        Math.max(result.width, result.height) <= MAX_PHOTO_EDGE
      ) {
        retained = result.uri;
        return {
          uri: retained,
          contentType: 'image/jpeg',
          dispose: () => removeTemporary(result.uri),
        };
      }
    }
    throw new Error('Photo still exceeds the upload limit. Choose a smaller photo and retry.');
  } finally {
    rendered?.release();
    context.release();
    temporary.forEach((path) => {
      if (path !== retained) removeTemporary(path);
    });
  }
}
