/**
 * PinService Unit Tests
 *
 * Tests the service layer for Pin CRUD operations
 * Mocks the LocalRepository and ImageManager dependencies
 */

import { PinService } from '../PinService';
import { LocalRepository } from '../../../../services/sync/repositories/LocalRepository';
import * as ImageManager from '../../../../services/sync/logic/images/ImageManager';

// Mock dependencies
jest.mock('../../../../services/sync/logic/images/ImageManager');
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'test-uuid-123'),
}));

describe('PinService', () => {
  let pinService: PinService;
  let mockLocalRepo: jest.Mocked<Partial<LocalRepository<any, any>>>;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Create mock repository with all needed methods
    mockLocalRepo = {
      create: jest.fn().mockResolvedValue(undefined),
      update: jest.fn().mockResolvedValue(undefined),
      get: jest.fn(),
      fetchAll: jest.fn(),
    };

    // Create service instance with mocked repo
    pinService = new PinService(mockLocalRepo as any);
  });

  describe('createPin', () => {
    it('should create a pin without images', async () => {
      const values = {
        id: '',
        name: 'Test Pin',
        address: '123 Test St',
        description: 'Test description',
        type: 'residential',
        lat: 10.5,
        lng: 20.5,
        cityVillage: 'Test City',
        localImages: [],
      };

      const result = await pinService.createPin(values);

      expect(result.success).toBe(true);
      expect(mockLocalRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'test-uuid-123',
          name: 'Test Pin',
          city_village: 'Test City',
          localImages: '[]',
          status: 'dirty',
        })
      );
    });

    it('should create a pin with images', async () => {
      (ImageManager.saveToFileSystem as jest.Mock).mockResolvedValue({
        success: ['file://saved-image1.jpg', 'file://saved-image2.jpg'],
        fail: [],
      });

      const values = {
        id: '',
        name: 'Test Pin',
        address: '123 Test St',
        description: 'Test description',
        type: 'residential',
        lat: 10.5,
        lng: 20.5,
        cityVillage: 'Test City',
        localImages: ['file://temp-image1.jpg', 'file://temp-image2.jpg'],
      };

      const result = await pinService.createPin(values);

      expect(result.success).toBe(true);
      expect(ImageManager.saveToFileSystem).toHaveBeenCalled();
      expect(mockLocalRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          localImages: '["file://saved-image1.jpg","file://saved-image2.jpg"]',
        })
      );
    });

    it('should handle image save failures', async () => {
      (ImageManager.saveToFileSystem as jest.Mock).mockResolvedValue({
        success: [],
        fail: ['file://failed-image.jpg'],
      });

      const values = {
        id: '',
        name: 'Test Pin',
        address: '123 Test St',
        description: 'Test description',
        type: 'residential',
        lat: 10.5,
        lng: 20.5,
        cityVillage: 'Test City',
        localImages: ['file://failed-image.jpg'],
      };

      const result = await pinService.createPin(values);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('IMAGE_SAVE_ERROR');
      }
    });
  });

  describe('updatePin', () => {
    it('should update a pin successfully', async () => {
      const values = {
        id: 'existing-pin-id',
        name: 'Updated Pin',
        address: '456 Updated St',
        description: 'Updated description',
        type: 'commercial',
        lat: 15.5,
        lng: 25.5,
        cityVillage: 'Updated City',
        localImages: [],
      };

      const result = await pinService.updatePin('existing-pin-id', values);

      expect(result.success).toBe(true);
      expect(mockLocalRepo.update).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'existing-pin-id',
          name: 'Updated Pin',
          city_village: 'Updated City',
          status: 'dirty',
        })
      );
    });

    it('should handle updating images', async () => {
      (ImageManager.updateImagesLocally as jest.Mock).mockResolvedValue({
        success: ['file://new-image.jpg'],
        fail: [],
      });

      const values = {
        id: 'existing-pin-id',
        name: 'Pin with New Images',
        address: '456 Updated St',
        description: 'Updated description',
        type: 'commercial',
        lat: 15.5,
        lng: 25.5,
        cityVillage: 'Updated City',
        localImages: ['file://new-image.jpg'],
      };

      const result = await pinService.updatePin('existing-pin-id', values);

      expect(result.success).toBe(true);
      expect(ImageManager.updateImagesLocally).toHaveBeenCalled();
    });
  });

  describe('deletePin', () => {
    it('should soft delete a pin', async () => {
      const result = await pinService.deletePin('pin-to-delete');

      expect(result.success).toBe(true);
      expect(mockLocalRepo.update).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'pin-to-delete',
          deletedAt: expect.any(String),
          status: 'dirty',
        })
      );
    });

    it('should handle deletion errors', async () => {
      mockLocalRepo.update = jest.fn().mockRejectedValue(new Error('Database error'));

      const result = await pinService.deletePin('non-existent-pin');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('DATABASE_ERROR');
      }
    });
  });

  describe('getPin', () => {
    it('should retrieve a pin by ID', async () => {
      const mockPin = {
        id: 'test-pin-id',
        name: 'Test Pin',
        address: '123 Test St',
        status: 'synced',
      };

      mockLocalRepo.get = jest.fn().mockResolvedValue(mockPin);

      const result = await pinService.getPin('test-pin-id');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.id).toBe('test-pin-id');
        expect(result.data.name).toBe('Test Pin');
      }
      expect(mockLocalRepo.get).toHaveBeenCalledWith('test-pin-id');
    });

    it('should handle pin not found', async () => {
      mockLocalRepo.get = jest.fn().mockResolvedValue(null);

      const result = await pinService.getPin('non-existent-pin');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('NOT_FOUND');
      }
    });
  });

  describe('getAllPins', () => {
    it('should retrieve all non-deleted pins', async () => {
      const mockPins = [
        {
          id: 'pin-1',
          name: 'Pin 1',
          deletedAt: null,
        },
        {
          id: 'pin-2',
          name: 'Pin 2',
          deletedAt: null,
        },
        {
          id: 'pin-3',
          name: 'Deleted Pin',
          deletedAt: '2024-01-03T12:00:00.000Z',
        },
      ];

      mockLocalRepo.fetchAll = jest.fn().mockResolvedValue(mockPins);

      const result = await pinService.getAllPins();

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveLength(2); // Should exclude deleted pin
        expect(result.data.every((pin) => !pin.deletedAt)).toBe(true);
      }
    });

    it('should return empty array when no pins exist', async () => {
      mockLocalRepo.fetchAll = jest.fn().mockResolvedValue([]);

      const result = await pinService.getAllPins();

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual([]);
      }
    });
  });
});
