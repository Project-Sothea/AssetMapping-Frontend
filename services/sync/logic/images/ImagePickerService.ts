/**
 * Image Picker Service
 *
 * Handles user interaction for selecting images from device gallery.
 * Single Responsibility: Image selection UI
 *
 * Dependencies: expo-image-picker (UI library)
 */

import * as ImagePicker from 'expo-image-picker';

export interface ImagePickResult {
  data: string | null;
  error: Error | null;
}

/**
 * Image Picker Service
 * Encapsulates image selection logic with proper error handling
 */
export class ImagePickerService {
  /**
   * Request permission to access device photo library
   * @returns true if granted, false otherwise
   */
  private async requestPermission(): Promise<boolean> {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    return permission.granted;
  }

  /**
   * Launch image picker and get selected image
   *
   * @returns Result object with either image URI or error
   */
  async pickImage(): Promise<ImagePickResult> {
    // Check permission
    const hasPermission = await this.requestPermission();
    if (!hasPermission) {
      return {
        data: null,
        error: new Error('Permission to access camera roll is required'),
      };
    }

    // Launch picker
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        allowsEditing: true,
        quality: 0.7,
      });

      // Check if user canceled
      if (result.canceled || !result.assets || result.assets.length === 0) {
        return {
          data: null,
          error: new Error('No images selected or picker was canceled'),
        };
      }

      // Return selected image URI
      return {
        data: result.assets[0].uri,
        error: null,
      };
    } catch (error) {
      return {
        data: null,
        error: error instanceof Error ? error : new Error('Unknown error during image picking'),
      };
    }
  }
}

// Singleton instance for convenience
export const imagePickerService = new ImagePickerService();
