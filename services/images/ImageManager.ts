/**
 * ImageManager.ts
 * Facade that provides a simple, high-level API for all image operations.
 */

import { pickImage } from './imagePicker/ImagePicker';
import * as ImageStorage from './imageStorage/ImageStorage';

export const ImageManager = {
  pick: pickImage,
  saveImages: ImageStorage.saveNewImages,
  deleteImages: ImageStorage.deleteImages,
};

export default ImageManager;
