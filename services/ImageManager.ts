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

export async function saveToRemote(
  pinId: string,
  images: string[] | null
): Promise<{
  success: string[];
  fail: { image: string; error: unknown }[];
}> {
  const success: string[] = [];
  const fail: { image: string; error: unknown }[] = [];

  if (!images?.length) {
    return { success, fail };
  }

  const uploadTasks = images.map((image) => {
    const filename = `${pinId}/${extractFilenameFromLocalUri(image)}`;
    console.log(filename);
    return callImages.uploadToRemote(image, filename);
  });

  const results = await Promise.allSettled(uploadTasks);

  results.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      success.push(result.value);
    } else {
      fail.push({ image: images[index], error: result.reason });
      console.log(result.status);
      console.warn(`Failed to upload image: ${images[index]}`, result.reason);
    }
  });

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
  console.log('newImages', newImages);
  console.log('existingRemoteUris', existingRemoteUris);

  const newFilenames = newImages.map((uri) => extractFilenameFromLocalUri(uri));
  const newFilenamesSet = new Set(newFilenames);

  // Extract filenames from remote URIs and figure out which to delete
  const existingFilenames = existingRemoteUris.map((uri) => extractFilenameFromRemoteUri(uri));
  const toDelete = existingFilenames.filter((filename) => !newFilenamesSet.has(filename));
  console.log('updateImagesRemotely: toDelete', toDelete);
  // Upload new images
  const uploadResults = await Promise.allSettled(
    newImages.map((image) => {
      const filename = extractFilenameFromLocalUri(image);
      return callImages.uploadToRemote(image, `${pinId}/${filename}`);
    })
  );

  console.log('uploadResults', uploadResults);
  const uploaded = uploadResults
    .filter((res) => res.status === 'fulfilled')
    .map((res) => (res as PromiseFulfilledResult<string>).value);
  console.log('uploaded', uploaded);

  const failedUpload = uploadResults
    .map((res, idx) => ({ res, idx }))
    .filter(({ res }) => res.status === 'rejected')
    .map(({ res, idx }) => ({
      image: newImages[idx],
      error: (res as PromiseRejectedResult).reason,
    }));
  console.log('failedUpload', failedUpload);

  // Delete removed images
  const deleteResults = await Promise.allSettled(
    toDelete.map((filename) => callImages.deleteImage(`${pinId}/${filename}`))
  );
  console.log('updateImagesRemotely: deleteResults', deleteResults);

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

export async function deleteAllImagesLocally(pinId: string): Promise<{
  success: string[];
  fail: { uri: string; error: any }[];
}> {
  const result = {
    success: [] as string[],
    fail: [] as { uri: string; error: any }[],
  };

  const directory = `${FileSystem.documentDirectory}pins/${pinId}/`;

  try {
    const files = await FileSystem.readDirectoryAsync(directory);

    await Promise.all(
      files.map(async (filename) => {
        const uri = `${directory}${filename}`;
        try {
          await FileSystem.deleteAsync(uri, { idempotent: true });
          result.success.push(uri);
        } catch (err) {
          console.warn('Failed to delete file:', uri, err);
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

export async function deleteAllImagesRemotely(
  pinId: string,
  existingRemoteUris: string[]
): Promise<{
  deleted: string[];
  failedDelete: { uri: string; error: any }[];
}> {
  // Extract filenames from all existing remote URIs
  const filenames = existingRemoteUris.map(extractFilenameFromRemoteUri);

  const deleteResults = await Promise.allSettled(
    filenames.map((filename) => callImages.deleteImage(`${pinId}/${filename}`))
  );

  const deleted = deleteResults
    .map((res, idx) => ({ res, idx }))
    .filter(({ res }) => res.status === 'fulfilled')
    .map(({ idx }) => `${pinId}/${filenames[idx]}`);

  const failedDelete = deleteResults
    .map((res, idx) => ({ res, idx }))
    .filter(({ res }) => res.status === 'rejected')
    .map(({ res, idx }) => ({
      uri: `${pinId}/${filenames[idx]}`,
      error: (res as PromiseRejectedResult).reason,
    }));

  return { deleted, failedDelete };
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
