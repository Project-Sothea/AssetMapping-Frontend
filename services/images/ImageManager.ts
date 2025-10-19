/**
 * ImageManager.ts
 * Facade that provides a simple, high-level API for all image operations.
 */

import { pickImage } from './imagePicker/ImagePicker';
import * as ImageStorage from './imageStorage/ImageStorage';
import { imageUpload } from './imageUpload/ImageUpload';

export const ImageManager = {
  pick: pickImage,
  saveImages: ImageStorage.saveNewImages,
  deleteImages: ImageStorage.deleteImages,
  uploadImages: imageUpload,
};

export default ImageManager;
