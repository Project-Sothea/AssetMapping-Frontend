/**
 * Focused tests for PinSyncHandler
 * 
 * Tests the core Pin-specific sync logic including image handling
 */

import { PinSyncHandler } from '../PinSyncHandler';
import { SyncStrategy } from '../../syncing/SyncStrategy';
import { Pin, RePin } from '~/utils/globalTypes';
import { LocalRepository } from '../../../repositories/LocalRepository';
import { RemoteRepository } from '../../../repositories/RemoteRepository';
import { ImageManagerInterface } from '../../images/types';
import { pins } from '~/db/schema';

// Mock implementations
class MockLocalRepo implements Partial<LocalRepository<Pin, typeof pins>> {
  fetchAll = jest.fn().mockResolvedValue([]);
  upsertAll = jest.fn().mockResolvedValue(undefined);
  markAsSynced = jest.fn().mockResolvedValue(undefined);
  updateFieldsBatch = jest.fn().mockResolvedValue(undefined);
}

class MockRemoteRepo implements Partial<RemoteRepository<RePin>> {
  fetchAll = jest.fn().mockResolvedValue([]);
  upsertAll = jest.fn().mockResolvedValue(undefined);
  updateFieldsBatch = jest.fn().mockResolvedValue(undefined);
}

class MockImageManager implements ImageManagerInterface {
  handleUpsertsToLocal = jest.fn().mockResolvedValue([]);
  handleUpsertsToRemote = jest.fn().mockResolvedValue([]);
  saveToFileSystem = jest.fn().mockResolvedValue({ success: [], failure: [] });
  downloadFromSupabase = jest.fn().mockResolvedValue({ success: [], failure: [] });
  deleteFromFileSystem = jest.fn().mockResolvedValue(undefined);
  uploadToSupabase = jest.fn().mockResolvedValue({ success: [], failure: [] });
  downloadAllFromSupabase = jest.fn().mockResolvedValue({ success: [], failure: [] });
}

describe('PinSyncHandler', () => {
  let handler: PinSyncHandler;
  let mockLocalRepo: MockLocalRepo;
  let mockRemoteRepo: MockRemoteRepo;
  let mockImageManager: MockImageManager;
  let mockStrategy: SyncStrategy<Pin, RePin>;

  beforeEach(() => {
    mockLocalRepo = new MockLocalRepo();
    mockRemoteRepo = new MockRemoteRepo();
    mockImageManager = new MockImageManager();
    mockStrategy = new SyncStrategy<Pin, RePin>();

    handler = new PinSyncHandler(
      mockStrategy,
      mockLocalRepo as any,
      mockRemoteRepo as any,
      mockImageManager
    );
  });

  describe('execute - Basic sync flow', () => {
    it('should fetch from both local and remote repositories', async () => {
      await handler.execute();

      expect(mockLocalRepo.fetchAll).toHaveBeenCalledTimes(1);
      expect(mockRemoteRepo.fetchAll).toHaveBeenCalledTimes(1);
    });

    it('should call upsertAll on both repositories', async () => {
      await handler.execute();

      expect(mockLocalRepo.upsertAll).toHaveBeenCalled();
      expect(mockRemoteRepo.upsertAll).toHaveBeenCalled();
    });

    it('should mark items as synced after upsert', async () => {
      await handler.execute();

      expect(mockLocalRepo.markAsSynced).toHaveBeenCalled();
    });
  });

  describe('postSync - Image handling', () => {
    it('should call handleUpsertsToLocal with downloaded pins', async () => {
      await handler.execute();

      expect(mockImageManager.handleUpsertsToLocal).toHaveBeenCalled();
    });

    it('should call handleUpsertsToRemote with uploaded pins', async () => {
      await handler.execute();

      expect(mockImageManager.handleUpsertsToRemote).toHaveBeenCalled();
    });

    it('should update local DB when images are downloaded', async () => {
      mockImageManager.handleUpsertsToLocal = jest.fn().mockResolvedValue([
        {
          pinId: '1',
          localImages: ['file:///local/image1.jpg'],
          images: ['http://example.com/image1.jpg'],
        },
      ]);

      await handler.execute();

      expect(mockLocalRepo.updateFieldsBatch).toHaveBeenCalled();
      const updates = (mockLocalRepo.updateFieldsBatch as jest.Mock).mock.calls[0][0];
      expect(updates).toHaveLength(1);
      expect(updates[0]).toEqual({
        id: '1',
        fields: {
          localImages: '["file:///local/image1.jpg"]',
          images: '["http://example.com/image1.jpg"]',
        },
      });
    });

    it('should handle null localImages by setting empty array', async () => {
      mockImageManager.handleUpsertsToLocal = jest.fn().mockResolvedValue([
        {
          pinId: '1',
          localImages: null,
          images: null,
        },
      ]);

      await handler.execute();

      const updates = (mockLocalRepo.updateFieldsBatch as jest.Mock).mock.calls[0][0];
      expect(updates[0].fields).toEqual({
        localImages: '[]',
        images: '[]',
      });
    });

    it('should not update DB when no images processed', async () => {
      mockImageManager.handleUpsertsToLocal = jest.fn().mockResolvedValue([]);
      mockImageManager.handleUpsertsToRemote = jest.fn().mockResolvedValue([]);

      await handler.execute();

      // Should not be called since no images to update
      expect(mockLocalRepo.updateFieldsBatch).not.toHaveBeenCalled();
    });

    it('should update both local and remote when images are uploaded', async () => {
      mockImageManager.handleUpsertsToRemote = jest.fn().mockResolvedValue([
        {
          pinId: '1',
          localImages: ['file:///local/image1.jpg'],
          images: ['http://example.com/uploaded1.jpg'],
        },
      ]);

      await handler.execute();

      expect(mockLocalRepo.updateFieldsBatch).toHaveBeenCalled();
      expect(mockRemoteRepo.updateFieldsBatch).toHaveBeenCalled();

      const localUpdates = (mockLocalRepo.updateFieldsBatch as jest.Mock).mock.calls[0][0];
      expect(localUpdates[0]).toEqual({
        id: '1',
        fields: {
          localImages: '["file:///local/image1.jpg"]',
          images: '["http://example.com/uploaded1.jpg"]',
        },
      });

      const remoteUpdates = (mockRemoteRepo.updateFieldsBatch as jest.Mock).mock.calls[0][0];
      expect(remoteUpdates[0]).toEqual({
        id: '1',
        images: ['http://example.com/uploaded1.jpg'],
      });
    });

    it('should handle multiple pins with images', async () => {
      mockImageManager.handleUpsertsToLocal = jest.fn().mockResolvedValue([
        {
          pinId: '1',
          localImages: ['file:///local/image1.jpg'],
          images: ['http://example.com/image1.jpg'],
        },
        {
          pinId: '2',
          localImages: ['file:///local/image2.jpg'],
          images: ['http://example.com/image2.jpg'],
        },
      ]);

      await handler.execute();

      const updates = (mockLocalRepo.updateFieldsBatch as jest.Mock).mock.calls[0][0];
      expect(updates).toHaveLength(2);
      expect(updates[0].id).toBe('1');
      expect(updates[1].id).toBe('2');
    });
  });

  describe('Error handling', () => {
    it('should propagate errors from repository fetchAll', async () => {
      mockLocalRepo.fetchAll = jest.fn().mockRejectedValue(new Error('Fetch failed'));

      await expect(handler.execute()).rejects.toThrow('Fetch failed');
    });

    it('should propagate errors from image manager', async () => {
      mockImageManager.handleUpsertsToLocal = jest
        .fn()
        .mockRejectedValue(new Error('Image download failed'));

      await expect(handler.execute()).rejects.toThrow('Image download failed');
    });

    it('should propagate errors from updateFieldsBatch', async () => {
      mockImageManager.handleUpsertsToLocal = jest.fn().mockResolvedValue([
        {
          pinId: '1',
          localImages: ['file:///local/image1.jpg'],
          images: ['http://example.com/image1.jpg'],
        },
      ]);

      mockLocalRepo.updateFieldsBatch = jest
        .fn()
        .mockRejectedValue(new Error('Update failed'));

      await expect(handler.execute()).rejects.toThrow('Update failed');
    });
  });
});
