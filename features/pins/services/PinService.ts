import { Pin } from '~/db/schema';
import { Result, AppError, ErrorCode } from '~/shared/types/result.types';
import { ErrorHandler } from '~/shared/utils/errorHandling';
import { PinFormValues, PinTransformers } from '~/shared/utils/pinTransformers';
import { LocalRepository } from '../../../services/sync/repositories/LocalRepository';
import * as ImageManager from '../../../services/sync/logic/images/ImageManager';

/**
 * Service layer for Pin operations
 * Encapsulates business logic for creating, reading, updating, and deleting pins
 */
export class PinService {
  constructor(private localRepo: LocalRepository<Pin, any>) {}

  /**
   * Create a new pin
   */
  async createPin(values: PinFormValues): Promise<Result<Pin>> {
    try {
      // Transform form data to database schema
      const dbValues = PinTransformers.formToDb(values);

      // Prepare complete pin object with sync metadata
      const pinData: Partial<Pin> = {
        ...dbValues,
        ...PinTransformers.getCreationFields(),
      };

      // Handle images if provided
      if (values.localImages && values.localImages.length > 0) {
        const { success: localURIs } = await ImageManager.saveToFileSystem(
          values.id,
          values.localImages
        );

        await this.localRepo.create({
          ...pinData,
          localImages: JSON.stringify(localURIs),
          images: null,
        } as Pin);
      } else {
        // No images - set localImages to empty array
        await this.localRepo.create({
          ...pinData,
          localImages: '[]',
          images: null,
        } as Pin);
      }

      // Fetch the created pin to return
      const createdPin = await this.localRepo.get(values.id);
      if (!createdPin) {
        return {
          success: false,
          error: new AppError('Pin creation failed', ErrorCode.DATABASE_ERROR),
        };
      }
      return { success: true, data: createdPin };
    } catch (error) {
      const appError = ErrorHandler.handle(error, 'Failed to create pin');
      ErrorHandler.log(appError, 'PinService.createPin');
      return { success: false, error: appError };
    }
  }

  /**
   * Update an existing pin
   */
  async updatePin(id: string, values: PinFormValues): Promise<Result<Pin>> {
    try {
      // Transform form data to database schema
      const dbValues = PinTransformers.formToDb(values);

      // Prepare update object with sync metadata
      const updateData: Partial<Pin> = {
        ...dbValues,
        id,
        ...PinTransformers.getSyncFields('dirty'),
      };

      // Handle images
      const currPin = await this.localRepo.get(id);
      let currLocalImages: string[] = [];

      try {
        currLocalImages =
          currPin?.localImages && currPin.localImages !== '' ? JSON.parse(currPin.localImages) : [];
      } catch (error) {
        console.error('Error parsing currPin.localImages:', error);
        currLocalImages = [];
      }

      if (values.localImages && values.localImages.length > 0) {
        const { success: localURIs } = await ImageManager.updateImagesLocally(
          id,
          values.localImages,
          currLocalImages
        );

        await this.localRepo.update({
          ...updateData,
          localImages: JSON.stringify(localURIs),
          images: null,
        } as Pin);
      } else {
        // No images - delete all existing images and set to empty array
        if (currLocalImages.length > 0) {
          await ImageManager.updateImagesLocally(id, [], currLocalImages);
        }

        await this.localRepo.update({
          ...updateData,
          localImages: '[]',
          images: null,
        } as Pin);
      }

      // Fetch the updated pin to return
      const updatedPin = await this.localRepo.get(id);
      if (!updatedPin) {
        return {
          success: false,
          error: new AppError('Pin update failed', ErrorCode.DATABASE_ERROR),
        };
      }
      return { success: true, data: updatedPin };
    } catch (error) {
      const appError = ErrorHandler.handle(error, 'Failed to update pin');
      ErrorHandler.log(appError, 'PinService.updatePin');
      return { success: false, error: appError };
    }
  }

  /**
   * Delete a pin (soft delete)
   */
  async deletePin(id: string): Promise<Result<void>> {
    try {
      // Soft delete: set deletedAt and mark as dirty for sync
      await this.localRepo.update({
        id,
        deletedAt: new Date().toISOString(),
        status: 'dirty',
        updatedAt: new Date().toISOString(),
      } as any);

      return { success: true, data: undefined };
    } catch (error) {
      const appError = ErrorHandler.handle(error, 'Failed to delete pin');
      ErrorHandler.log(appError, 'PinService.deletePin');
      return { success: false, error: appError };
    }
  }

  /**
   * Get a single pin by ID
   * Returns fresh data from database
   */
  async getPin(id: string): Promise<Result<Pin>> {
    try {
      const pin = await this.localRepo.get(id);
      if (!pin) {
        return {
          success: false,
          error: new AppError('Pin not found', ErrorCode.NOT_FOUND),
        };
      }
      return { success: true, data: pin };
    } catch (error) {
      const appError = ErrorHandler.handle(error, 'Failed to fetch pin');
      ErrorHandler.log(appError, 'PinService.getPin');
      return { success: false, error: appError };
    }
  }

  /**
   * Get all pins (excludes soft-deleted)
   */
  async getAllPins(): Promise<Result<Pin[]>> {
    try {
      const allPins = await this.localRepo.fetchAll();
      // Filter out soft-deleted pins
      const activePins = allPins.filter((pin) => !pin.deletedAt);
      return { success: true, data: activePins };
    } catch (error) {
      const appError = ErrorHandler.handle(error, 'Failed to fetch pins');
      ErrorHandler.log(appError, 'PinService.getAllPins');
      return { success: false, error: appError };
    }
  }
}
