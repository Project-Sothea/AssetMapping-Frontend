import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { callImages } from '~/apis';
import { v4 as uuidv4 } from 'uuid';
import { Pin, RePin } from '~/utils/globalTypes';

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
    const newImage = galleryUriString;
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
export async function saveToFileSystem(
  pinId: string,
  images: string[]
): Promise<{ success: string[]; fail: string[] }> {
  const success: string[] = [];
  const fail: string[] = [];

  if (!images?.length) {
    console.log('saveToFileSystem: no images to save');
    return { success, fail };
  }

  const baseDir = `${FileSystem.documentDirectory}pins/${pinId}/`;

  try {
    await FileSystem.makeDirectoryAsync(baseDir, { intermediates: true });
  } catch (dirErr) {
    console.warn('Failed to create directory for images:', dirErr);
    // Proceed anyway - makeDirectoryAsync is idempotent
  }

  for (const [i, img] of images.entries()) {
    console.log(`Saving image ${i}: ${img}`);
    const filename = generateNewFileName();
    const localUri = `${baseDir}${filename}`;

    try {
      await FileSystem.copyAsync({ from: img, to: localUri });
      success.push(localUri);
      console.log(`→ Saved locally as ${localUri}`);
    } catch (err) {
      console.warn(`✖ Failed to save image ${img}:`, err);
      fail.push(img);
    }
  }

  return { success, fail };
}

export async function updateImagesLocally(
  pinId: string,
  newImages: string[] = [], // new images from user (could be from photos or remote images)
  existingLocalUris: string[] = [] // previously saved local Images
): Promise<{ success: string[]; fail: string[] }> {
  if (!newImages) {
    console.warn('newImages is null or undefined');
    return { success: [], fail: [] };
  }

  if (!Array.isArray(existingLocalUris)) {
    console.warn('existingLocalUris is not an array:', existingLocalUris);
    existingLocalUris = [];
  }

  const result: { success: string[]; fail: string[] } = { success: [], fail: [] };
  const directory = `${FileSystem.documentDirectory}pins/${pinId}/`;

  try {
    await FileSystem.makeDirectoryAsync(directory, { intermediates: true });
  } catch (dirErr) {
    console.warn('Failed to create directory for images:', dirErr);
  }

  // Find which existing local files are no longer needed
  const newUrisSet = new Set(newImages);
  const toDelete = existingLocalUris.filter((uri) => !newUrisSet.has(uri));

  console.log('newImages', newImages);
  console.log('toDelete', toDelete);
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
    console.log('ImageManager img', img);
    if (existingLocalUris.includes(img)) {
      // Already saved locally, keep it
      updatedLocalUris.push(img);
      result.success.push(img);
    } else {
      // New image, copy it locally
      try {
        const filename = generateNewFileName();
        const localUri = `${directory}${filename}`;

        if (img.startsWith('file://')) {
          // local file: copy
          await FileSystem.copyAsync({ from: img, to: localUri });
        } else if (img.startsWith('http://') || img.startsWith('https://')) {
          // remote URL: download
          const downloadRes = await FileSystem.downloadAsync(img, localUri);
          if (downloadRes.status !== 200) {
            throw new Error(`Failed to download image: HTTP status ${downloadRes.status}`);
          }
        } else {
          // unknown URI scheme
          throw new Error(`Unsupported URI scheme for image: ${img}`);
        }

        updatedLocalUris.push(localUri);
        result.success.push(localUri);
      } catch (err) {
        console.warn('Failed to copy new image locally:', img, err);
        result.fail.push(img);
      }
    }
  }

  return result;
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

function ensureFileUri(uri: string): string {
  if (!uri) return uri;
  // Already a file:// or content:// or http(s)://
  if (
    uri.startsWith('file://') ||
    uri.startsWith('content://') ||
    uri.startsWith('http://') ||
    uri.startsWith('https://')
  ) {
    return uri;
  }

  // Absolute path without scheme (common on simulator): prefix file://
  if (uri.startsWith('/')) return `file://${uri}`;

  return uri;
}

//REMOTE

async function deleteInRemote(pinId: string, files: string[]) {
  if (!files || files.length === 0) return;
  const deleteResults = await Promise.allSettled(
    files.map((filename) => callImages.deleteImage(`${pinId}/${filename}`))
  );

  const deleted = deleteResults
    .map((res, idx) => ({ res, idx }))
    .filter(({ res }) => res.status === 'fulfilled')
    .map(({ idx }) => `${pinId}/${files[idx]}`);

  const failedDelete = deleteResults
    .map((res, idx) => ({ res, idx }))
    .filter(({ res }) => res.status === 'rejected')
    .map(({ res, idx }) => ({
      uri: `${pinId}/${files[idx]}`,
      error: (res as PromiseRejectedResult).reason,
    }));

  return { deleted, failedDelete };
}

export async function uploadToRemote(
  pinId: string,
  uris: string[]
): Promise<{
  images: string[]; // URLs in remote bucket
  fail: { uri: string; error: unknown }[];
  localImages: string[]; // original local URIs
}> {
  const images: string[] = [];
  const fail: { uri: string; error: unknown }[] = [];
  const localImages: string[] = [];

  if (!uris?.length) {
    return { images, fail, localImages };
  }

  const uploadTasks = uris.map((uri) => {
    const filename = extractFilenameFromLocalUri(uri) ?? generateNewFileName();
    const remotePath = `${pinId}/${filename}`;
    const localUri = ensureFileUri(uri);
    return callImages.uploadToRemote(localUri, remotePath);
  });

  const results = await Promise.allSettled(uploadTasks);

  results.forEach((result, index) => {
    const uri = uris[index];
    if (result.status === 'fulfilled') {
      images.push(result.value); // remote URL
      localImages.push(ensureFileUri(uri)); // keep normalized local path
    } else {
      fail.push({ uri, error: result.reason });
      console.warn(`Failed to upload image: ${uri}`, result.reason);
    }
  });

  return { images, fail, localImages };
}

//LOCAL

async function listLocalImages(pinId: string): Promise<string[]> {
  const folderPath = `${FileSystem.documentDirectory}pins/${pinId}/`;

  try {
    // Check if folder exists
    const info = await FileSystem.getInfoAsync(folderPath);
    if (!info.exists) return []; // folder does not exist

    // Read all files in the folder
    const files = await FileSystem.readDirectoryAsync(folderPath);

    // Prepend full path to each file and ensure file:// scheme
    return files.map((file) => ensureFileUri(`${folderPath}${file}`));
  } catch (err) {
    console.warn('Failed to list local images for pin', pinId, err);
    return [];
  }
}

async function deleteInLocal(
  pinId: string,
  files: string[]
): Promise<{
  success: string[];
  fail: { uri: string; error: any }[];
}> {
  const result = {
    success: [] as string[],
    fail: [] as { uri: string; error: any }[],
  };
  if (!files || files.length === 0) return result;

  const directory = `${FileSystem.documentDirectory}pins/${pinId}/`;

  try {
    await Promise.all(
      files.map(async (filename) => {
        const uri = `${directory}${filename}`;
        try {
          await FileSystem.deleteAsync(uri, { idempotent: true });
          result.success.push(uri);
        } catch (err) {
          console.warn('Failed to delete old image:', uri, err);
          result.fail.push({ uri, error: err });
        }
      })
    );

    // Attempt to delete the directory itself after cleaning
    try {
      await FileSystem.deleteAsync(directory, { idempotent: true });
    } catch (dirErr) {
      console.warn('Failed to delete directory:', directory, dirErr);
    }
  } catch (err) {
    console.warn('Failed to read directory (may not exist):', directory, err);
    // Not throwing because directory might not exist (which is fine)
  }

  return result;
}

async function downloadToLocal(
  pinId: string,
  images: string[]
): Promise<{ localImages: string[]; images: string[]; fail: string[] }> {
  const localImages: string[] = [];
  const fail: string[] = [];

  if (!images?.length) {
    console.log(`downloadToLocal: No images to download for pin ${pinId}`);
    return { localImages, images, fail };
  }

  console.log(`downloadToLocal: Downloading ${images.length} images for pin ${pinId}`);
  const directory = `${FileSystem.documentDirectory}pins/${pinId}/`;

  try {
    await FileSystem.makeDirectoryAsync(directory, { intermediates: true });
  } catch (err) {
    console.warn('Failed to create directory:', err);
  }

  for (const img of images) {
    const filename = generateNewFileName();
    const localUri = `${directory}${filename}`;

    try {
      if (img.startsWith('file://')) {
        console.log(`Copying local file: ${img}`);
        await FileSystem.copyAsync({ from: img, to: localUri });
      } else if (img.startsWith('http://') || img.startsWith('https://')) {
        console.log(`Downloading remote image: ${img}`);
        const downloadRes = await FileSystem.downloadAsync(img, localUri);
        if (downloadRes.status !== 200) {
          throw new Error(`Failed to download image: HTTP status ${downloadRes.status}`);
        }
        console.log(`Downloaded to: ${localUri}`);
      } else {
        throw new Error('Unsupported image source: ' + img);
      }

      const fileUri = ensureFileUri(localUri);
      localImages.push(fileUri);
      console.log(`Successfully saved image as: ${fileUri}`);
    } catch (err) {
      console.warn(`Failed to save image ${img}:`, err);
      fail.push(img);
    }
  }

  console.log(`downloadToLocal complete: ${localImages.length} success, ${fail.length} failed`);
  return { localImages, images, fail };
}

//Upsert DB Functions
export async function handleUpsertsToLocal(
  localUpserts: Pin[]
): Promise<{ pinId: string; localImages: string[]; images: string[] }[]> {
  if (!localUpserts || localUpserts.length === 0) return [];

  const results: { pinId: string; localImages: string[]; images: string[] }[] = [];

  for (const pin of localUpserts) {
    const oldImages = await listLocalImages(pin.id);

    const newUrisFromBucket: string[] =
      typeof pin.images === 'string' && pin.images.trim() !== ''
        ? JSON.parse(pin.images)
        : Array.isArray(pin.images)
          ? pin.images
          : [];

    await deleteInLocal(pin.id, oldImages);
    const { localImages, images } = await downloadToLocal(pin.id, newUrisFromBucket);

    results.push({ pinId: pin.id, localImages, images });
  }

  return results;
}

export async function handleUpsertsToRemote(remoteUpserts: RePin[]) {
  if (!remoteUpserts || remoteUpserts.length === 0) return;

  const results: { pinId: string; localImages: string[]; images: string[] }[] = [];

  for (const pin of remoteUpserts) {
    //came from the local source
    const oldImages = await callImages.listFilesInBucket(`${pin.id}/`);
    const newUris: string[] =
      typeof pin.local_images === 'string' && pin.local_images.trim() !== ''
        ? JSON.parse(pin.local_images)
        : Array.isArray(pin.local_images)
          ? pin.local_images
          : [];

    await deleteInRemote(pin.id, oldImages);
    const { localImages, images } = await uploadToRemote(pin.id, newUris);
    results.push({ pinId: pin.id, localImages, images });
  }
  return results;
}

export default {
  getPickedImage,
  saveToFileSystem,
  updateImagesLocally,
  uploadToRemote,
  handleUpsertsToLocal,
  handleUpsertsToRemote,
};
