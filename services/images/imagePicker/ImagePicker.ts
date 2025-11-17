/**
 * Image Picker Service - Handles gallery image selection
 */

import * as ImagePicker from 'expo-image-picker';

interface ImagePickResult {
  data: string | null;
  error: Error | null;
}

/**
 * Pick image from gallery
 */
export async function pickImage(): Promise<ImagePickResult> {
  const hasPermission = await requestPermission();
  if (!hasPermission) {
    return createErrorResult('Permission to access camera roll is required');
  }

  return await launchImagePicker();
}

/**
 * Request photo library permission
 */
async function requestPermission(): Promise<boolean> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  return permission.granted;
}

/**
 * Launch image picker
 */
async function launchImagePicker(): Promise<ImagePickResult> {
  try {
    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      quality: 0.7,
    });

    return processPickerResult(result as { canceled?: boolean; assets?: { uri: string }[] });
  } catch (error) {
    return createErrorResult(
      error instanceof Error ? error.message : 'Unknown error during image picking'
    );
  }
}

/**
 * Process picker result
 */
function processPickerResult(result: {
  canceled?: boolean;
  assets?: { uri: string }[];
}): ImagePickResult {
  if (result.canceled || !result.assets || result.assets.length === 0) {
    return createErrorResult('No images selected or picker was canceled');
  }

  return {
    data: result.assets[0].uri,
    error: null,
  };
}

/**
 * Create error result
 */
function createErrorResult(message: string): ImagePickResult {
  return {
    data: null,
    error: new Error(message),
  };
}
