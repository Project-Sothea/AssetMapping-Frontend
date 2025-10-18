/**
 * Tests for FormSyncHandler
 *
 * Tests the Form-specific sync logic
 */

import { FormSyncHandler } from '../FormSyncHandler';
import { SyncStrategy } from '../../syncing/SyncStrategy';
import { Form, ReForm } from '~/utils/globalTypes';
import { LocalRepository } from '../../../repositories/LocalRepository';
import { RemoteRepository } from '../../../repositories/RemoteRepository';
import { forms } from '~/db/schema';

// Mock implementations
class MockLocalRepo implements Partial<LocalRepository<Form, typeof forms>> {
  fetchAll = jest.fn().mockResolvedValue([]);
  upsertAll = jest.fn().mockResolvedValue(undefined);
  markAsSynced = jest.fn().mockResolvedValue(undefined);
}

class MockRemoteRepo implements Partial<RemoteRepository<ReForm>> {
  fetchAll = jest.fn().mockResolvedValue([]);
  upsertAll = jest.fn().mockResolvedValue(undefined);
}

describe('FormSyncHandler', () => {
  let handler: FormSyncHandler;
  let mockLocalRepo: MockLocalRepo;
  let mockRemoteRepo: MockRemoteRepo;
  let mockStrategy: SyncStrategy<Form, ReForm>;

  beforeEach(() => {
    mockLocalRepo = new MockLocalRepo();
    mockRemoteRepo = new MockRemoteRepo();
    mockStrategy = new SyncStrategy<Form, ReForm>();

    handler = new FormSyncHandler(mockStrategy, mockLocalRepo as any, mockRemoteRepo as any);
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

  describe('postSync', () => {
    it('should complete without errors', async () => {
      await expect(handler.execute()).resolves.not.toThrow();
    });

    it('should run postSync after upserts', async () => {
      const postSyncSpy = jest.spyOn(handler as any, 'postSync');

      await handler.execute();

      expect(postSyncSpy).toHaveBeenCalled();
    });
  });

  describe('Error handling', () => {
    it('should propagate errors from repository fetchAll', async () => {
      mockLocalRepo.fetchAll = jest.fn().mockRejectedValue(new Error('Fetch failed'));

      await expect(handler.execute()).rejects.toThrow('Fetch failed');
    });

    it('should propagate errors from upsertAll', async () => {
      mockLocalRepo.upsertAll = jest.fn().mockRejectedValue(new Error('Upsert failed'));

      await expect(handler.execute()).rejects.toThrow('Upsert failed');
    });

    it('should propagate errors from markAsSynced', async () => {
      mockLocalRepo.markAsSynced = jest.fn().mockRejectedValue(new Error('Mark failed'));

      await expect(handler.execute()).rejects.toThrow('Mark failed');
    });
  });
});
