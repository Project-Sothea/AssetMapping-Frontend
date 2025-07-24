import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { callImages } from '~/apis';

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
      const filename = `${Date.now()}-${i}.jpg`; // Unique filename
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
      const filename = `${pinId}/${Date.now()}-${idx}.jpg`;
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
