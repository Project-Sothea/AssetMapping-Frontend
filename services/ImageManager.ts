import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { uploadImageAsync } from '~/utils/Map/uploadImageAsync';

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

export async function saveGalleryImagesLocally(
  pinId: string,
  images: { uri: string }[]
): Promise<{ localUri: string; galleryUri: string }[]> {
  const savedImages: { localUri: string; galleryUri: string }[] = [];

  try {
    // Ensure directory exists
    const directory = `${FileSystem.documentDirectory}pins/${pinId}/`;
    await FileSystem.makeDirectoryAsync(directory, { intermediates: true });
  } catch (dirErr) {
    console.warn('Failed to create directory for images:', dirErr);
    // Proceed anyway - makeDirectoryAsync is idempotent
  }

  for (let i = 0; i < images.length; i++) {
    const { uri: galleryUri } = images[i];
    try {
      const filename = `${Date.now()}-${i}.jpg`; // Unique filename
      const localUri = `${FileSystem.documentDirectory}pins/${pinId}/${filename}`;

      // Copy the file from gallery URI to app local storage
      await FileSystem.copyAsync({
        from: galleryUri,
        to: localUri,
      });

      savedImages.push({ localUri, galleryUri });
    } catch (error) {
      console.warn(`Failed to save image ${galleryUri} locally:`, error);
      // skip this one but continue saving others
    }
  }

  return savedImages;
}

export async function uploadAndGetRemoteImageURIs(pinId: string, localUris: string[] | null) {
  if (!localUris || localUris.length === 0) {
    return { success: null, failed: null }; // or handle appropriately
  }

  const results = await Promise.allSettled(
    localUris.map((image, idx) => {
      const filename = `${pinId}/${Date.now()}-${idx}.jpg`;
      return uploadImageAsync(image, filename);
    })
  );

  const successfulUploads = results
    .filter((result) => result.status === 'fulfilled')
    .map((result) => (result as PromiseFulfilledResult<string>).value);

  const failedUploads = results
    .filter((result) => result.status === 'rejected')
    .map((result, idx) => ({
      image: localUris[idx],
      error: (result as PromiseRejectedResult).reason,
    }));

  if (failedUploads.length > 0) {
    console.warn('Some images failed to upload');
  }

  return {
    success: successfulUploads.length > 0 ? successfulUploads : null,
    failed: failedUploads.length > 0 ? failedUploads : null,
  };
}
