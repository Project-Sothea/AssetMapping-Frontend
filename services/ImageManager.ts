import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { callImages } from '~/apis';
import { v4 as uuidv4 } from 'uuid';

export async function getPickedImage() {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

  if (!permission.granted) {
    alert('Permission to access camera roll is required!');
    return { data: null, error: new Error('Permission to access camera roll is required') };
  }

  const pickerObj = await ImagePicker.launchImageLibraryAsync({
    allowsEditing: true,
    quality: 0.7,
  });

  if (!pickerObj.canceled && pickerObj.assets && pickerObj.assets.length > 0) {
    const galleryUriString = pickerObj.assets[0].uri;
    const newImage = { uri: galleryUriString };
    return { data: newImage, error: null };
  }
  return { data: null, error: new Error('No images selected or picker was canceled') };
}

/**
 * Save gallery-picked images to local app storage, organized by pinId.
 *
 * @param pinId - Unique identifier for the pin
 * @param images - Array of images from gallery picker [{ uri: string }]
 * @returns Array of { localUri, galleryUri } for saved images
 */

export async function saveImagesLocally(
  pinId: string,
  images: { uri: string }[]
): Promise<{ success: string[]; fail: string[] }> {
  if (!images || images.length === 0) {
    return { success: [], fail: [] };
  }

  const result: { success: string[]; fail: string[] } = { success: [], fail: [] };

  try {
    // Ensure directory exists
    const directory = `${FileSystem.documentDirectory}pins/${pinId}/`;
    await FileSystem.makeDirectoryAsync(directory, { intermediates: true });
  } catch (dirErr) {
    console.warn('Failed to create directory for images:', dirErr);
    // Proceed anyway - makeDirectoryAsync is idempotent
  }

  for (let i = 0; i < images.length; i++) {
    const { uri } = images[i];
    try {
      const filename = generateNewFileName();
      const localUri = `${FileSystem.documentDirectory}pins/${pinId}/${filename}`;

      // Copy the file from gallery URI to app local storage
      await FileSystem.copyAsync({
        from: uri,
        to: localUri,
      });

      result.success.push(localUri);
    } catch (error) {
      console.warn(`Failed to save image ${uri} locally:`, error);
      result.fail.push(uri);
    }
  }

  return result;
}

export async function saveImagesRemotely(pinId: string, images: string[] | null) {
  if (!images || images.length === 0) {
    return { success: [], fail: [] };
  }

  const results = await Promise.allSettled(
    images.map((image, idx) => {
      const filename = `${pinId}/${extractFilenameFromLocalUri(image)}`;
      return callImages.storeImage(image, filename);
    })
  );

  const success = results
    .filter((result) => result.status === 'fulfilled')
    .map((result) => (result as PromiseFulfilledResult<string>).value);

  const fail = results
    .filter((result) => result.status === 'rejected')
    .map((result, idx) => ({
      image: images[idx],
      error: (result as PromiseRejectedResult).reason,
    }));

  return { success, fail };
}

export async function updateImagesLocally(
  pinId: string,
  newImages: { uri: string }[], // new images from user (could be local or remote uris)
  existingLocalUris: string[] // previously saved local URIs
): Promise<{ success: string[]; fail: string[] }> {
  const result: { success: string[]; fail: string[] } = { success: [], fail: [] };
  const directory = `${FileSystem.documentDirectory}pins/${pinId}/`;

  try {
    await FileSystem.makeDirectoryAsync(directory, { intermediates: true });
  } catch (dirErr) {
    console.warn('Failed to create directory for images:', dirErr);
  }

  // Find which existing local files are no longer needed
  const newUrisSet = new Set(newImages.map((img) => img.uri));
  const toDelete = existingLocalUris.filter((uri) => !newUrisSet.has(uri));

  // Delete removed files
  await Promise.all(
    toDelete.map(async (uri) => {
      try {
        await FileSystem.deleteAsync(uri, { idempotent: true });
      } catch (err) {
        console.warn('Failed to delete old image:', uri, err);
      }
    })
  );

  // Prepare result arrays
  const updatedLocalUris: string[] = [];

  // Now process all newImages: if they already exist locally, keep; else copy them
  for (let i = 0; i < newImages.length; i++) {
    const img = newImages[i];
    if (existingLocalUris.includes(img.uri)) {
      // Already saved locally, keep it
      updatedLocalUris.push(img.uri);
      result.success.push(img.uri);
    } else {
      // New image, copy it locally
      try {
        const filename = generateNewFileName();
        const localUri = `${directory}${filename}`;
        await FileSystem.copyAsync({ from: img.uri, to: localUri });
        updatedLocalUris.push(localUri);
        result.success.push(localUri);
      } catch (err) {
        console.warn('Failed to copy new image locally:', img.uri, err);
        result.fail.push(img.uri);
      }
    }
  }

  return result;
}

export async function updateImagesRemotely(
  pinId: string,
  newImages: string[],
  existingRemoteUris: string[]
): Promise<{
  uploaded: string[];
  failedUpload: { image: string; error: any }[];
  deleted: string[];
  failedDelete: { uri: string; error: any }[];
}> {
  const newFilenames = newImages.map((uri) => extractFilenameFromLocalUri(uri));
  const newFilenamesSet = new Set(newFilenames);

  // Extract filenames from remote URIs and figure out which to delete
  const existingFilenames = existingRemoteUris.map((uri) => extractFilenameFromRemoteUri(uri));
  const toDelete = existingFilenames.filter((filename) => !newFilenamesSet.has(filename));

  // Upload new images
  const uploadResults = await Promise.allSettled(
    newImages.map((image) => {
      const filename = extractFilenameFromLocalUri(image);
      return callImages.storeImage(image, `${pinId}/${filename}`);
    })
  );

  const uploaded = uploadResults
    .filter((res) => res.status === 'fulfilled')
    .map((res) => (res as PromiseFulfilledResult<string>).value);

  const failedUpload = uploadResults
    .map((res, idx) => ({ res, idx }))
    .filter(({ res }) => res.status === 'rejected')
    .map(({ res, idx }) => ({
      image: newImages[idx],
      error: (res as PromiseRejectedResult).reason,
    }));

  // Delete removed images
  const deleteResults = await Promise.allSettled(
    toDelete.map((filename) => callImages.deleteImage(`${pinId}/${filename}`))
  );

  const deleted = deleteResults
    .filter((res) => res.status === 'fulfilled')
    .map((_, idx) => `${pinId}/${toDelete[idx]}`);

  const failedDelete = deleteResults
    .map((res, idx) => ({ res, idx }))
    .filter(({ res }) => res.status === 'rejected')
    .map(({ res, idx }) => ({
      uri: `${pinId}/${toDelete[idx]}`,
      error: (res as PromiseRejectedResult).reason,
    }));

  return { uploaded, failedUpload, deleted, failedDelete };
}

function extractFilenameFromRemoteUri(uri: string): string {
  return uri.split('/').pop()!;
}

function extractFilenameFromLocalUri(localUri: string): string | null {
  // Remove 'file://' prefix if present
  const cleanedUri = localUri.startsWith('file://') ? localUri.slice(7) : localUri;

  // Find the last slash position from the back
  const lastSlashIndex = cleanedUri.lastIndexOf('/');

  if (lastSlashIndex === -1) {
    // No slash found, return null
    return null;
  }

  // Extract filename after the last slash
  const filename = cleanedUri.substring(lastSlashIndex + 1);

  return filename; // e.g., "uuid.jpg"
}

function generateNewFileName(): string {
  return `${uuidv4()}.jpg`;
}
