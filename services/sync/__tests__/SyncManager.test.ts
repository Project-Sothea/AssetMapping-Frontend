import SyncManager from '../SyncManager';
import RemoteRepository from '../implementations/RemoteRepository';
import LocalRepository from '../implementations/LocalRepository';
import SyncStrategy from '../implementations/SyncStrategy';
import { LocalType, RemoteType } from '~/utils/testUtils';

describe('SyncManager', () => {
  let syncStrategy: jest.Mocked<SyncStrategy<LocalType, RemoteType>>;
  let localRepo: jest.Mocked<LocalRepository<LocalType>>;
  let remoteRepo: jest.Mocked<RemoteRepository<RemoteType>>;
  let syncManager: SyncManager<LocalType, RemoteType>;

  beforeEach(() => {
    // Mock methods
    syncStrategy = {
      resolve: jest.fn(),
      convertToRemote: jest.fn(),
      convertToLocal: jest.fn(),
    };

    localRepo = {
      fetchAll: jest.fn(),
      upsertAll: jest.fn(),
      getDirty: jest.fn(),
      markAsSynced: jest.fn(),
      get: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      upsert: jest.fn(),
      delete: jest.fn(),
      updateFieldsBatch: jest.fn(),
    };

    remoteRepo = {
      fetchAll: jest.fn(),
      upsertAll: jest.fn(),
    };

    syncManager = SyncManager.getInstance('pin', syncStrategy, localRepo, remoteRepo);
  });

  afterEach(() => {
    (SyncManager as any).instances = new Map();
  });

  const remoteData1: RemoteType = {
    id: '1',
    body: 'existingRemoteData',
    updated_at: new Date('2023-02-01T00:00:00Z'),
    deleted_at: null,
    images: null,
  };
  const remoteDataNew: RemoteType = {
    id: '2',
    body: 'newRemoteData',
    updated_at: new Date('2023-01-01T00:00:00Z'),
    deleted_at: null,
    images: null,
  };

  const localData1: LocalType = {
    id: '1',
    body: 'existingLocalData',
    updatedAt: '2023-02-01T00:00:00Z',
    deletedAt: null,
    images: null,
    lastFailedSyncAt: null,
    lastSyncedAt: '2023-02-01T00:00:00Z',
    localImages: null,
    status: 'synced',
    failureReason: null,
  };

  const localDataNew: LocalType = {
    id: '2',
    body: 'newRemoteData',
    updatedAt: '2023-01-01T00:00:00Z',
    deletedAt: null,
    images: null,
    lastFailedSyncAt: null,
    lastSyncedAt: null,
    localImages: null,
    status: null,
    failureReason: null,
  };

  it('should not start sync if already syncing', async () => {
    // HACK: forcibly set syncing state to simulate concurrent sync
    (syncManager as any).isSyncing = true;

    await syncManager.syncNow();

    //mock dependencies
    expect(remoteRepo.fetchAll).not.toHaveBeenCalled();
    expect(localRepo.fetchAll).not.toHaveBeenCalled();
  });

  it('should pull new data from remote to local as "synced"', async () => {
    const remote: RemoteType[] = [remoteData1, remoteDataNew];

    const local: LocalType[] = [localData1];

    const resolvedData: { toLocal: RemoteType[]; toRemote: LocalType[] } = {
      toLocal: [remote[1]],
      toRemote: [],
    };

    remoteRepo.fetchAll.mockResolvedValue(remote);
    localRepo.fetchAll.mockResolvedValue(local);
    syncStrategy.resolve.mockReturnValue(resolvedData);
    syncStrategy.convertToRemote.mockReturnValue([]);
    syncStrategy.convertToLocal.mockReturnValue([localDataNew]);

    await syncManager.syncNow();

    expect(remoteRepo.fetchAll).toHaveBeenCalledTimes(1);
    expect(localRepo.fetchAll).toHaveBeenCalledTimes(1);

    expect(syncStrategy.resolve).toHaveBeenCalledWith(local, remote);
    expect(syncStrategy.convertToRemote).toHaveBeenCalledWith(resolvedData.toRemote);

    expect(localRepo.upsertAll).toHaveBeenCalledWith([localDataNew]);
    expect(remoteRepo.upsertAll).toHaveBeenCalledWith([]);
  });

  it('should push new data from local to remote as "synced"', async () => {
    const localOnlyData: LocalType = {
      ...localDataNew,
      status: 'dirty',
    };

    const remote: RemoteType[] = [remoteData1];
    const local: LocalType[] = [localData1, localOnlyData];

    const resolvedData = {
      toLocal: [],
      toRemote: [localOnlyData],
    };

    remoteRepo.fetchAll.mockResolvedValue(remote);
    localRepo.fetchAll.mockResolvedValue(local);
    syncStrategy.resolve.mockReturnValue(resolvedData);
    syncStrategy.convertToRemote.mockReturnValue([remoteDataNew]);
    syncStrategy.convertToLocal.mockReturnValue([]);

    await syncManager.syncNow();

    expect(remoteRepo.upsertAll).toHaveBeenCalledWith([remoteDataNew]);
    expect(localRepo.upsertAll).toHaveBeenCalledWith([]);
    expect(localRepo.markAsSynced).toHaveBeenCalledWith(resolvedData.toRemote);
  });
  it('should pull more updated data from remote to local as "synced"', async () => {
    const remoteNewer: RemoteType = {
      ...remoteData1,
      body: 'updatedRemoteData',
      updated_at: new Date('2023-03-01T00:00:00Z'),
    };

    const localOutdated: LocalType = {
      ...localData1,
      updatedAt: '2023-02-01T00:00:00Z',
      status: 'synced',
    };

    const resolvedData = {
      toLocal: [remoteNewer],
      toRemote: [],
    };

    remoteRepo.fetchAll.mockResolvedValue([remoteNewer]);
    localRepo.fetchAll.mockResolvedValue([localOutdated]);
    syncStrategy.resolve.mockReturnValue(resolvedData);
    syncStrategy.convertToRemote.mockReturnValue([]);
    syncStrategy.convertToLocal.mockReturnValue([localData1]);

    await syncManager.syncNow();

    expect(localRepo.upsertAll).toHaveBeenCalledWith([localData1]);
  });
  it('should push more updated data from local to remote as "synced"', async () => {
    const localNewer: LocalType = {
      ...localData1,
      body: 'updatedLocalData',
      updatedAt: '2023-03-01T00:00:00Z',
      status: 'dirty',
    };

    const remoteOutdated: RemoteType = {
      ...remoteData1,
      updated_at: new Date('2023-02-01T00:00:00Z'),
    };

    const resolvedData = {
      toLocal: [],
      toRemote: [localNewer],
    };

    remoteRepo.fetchAll.mockResolvedValue([remoteOutdated]);
    localRepo.fetchAll.mockResolvedValue([localNewer]);
    syncStrategy.resolve.mockReturnValue(resolvedData);
    syncStrategy.convertToRemote.mockReturnValue([remoteData1]);
    syncStrategy.convertToLocal.mockReturnValue([]);

    await syncManager.syncNow();

    expect(remoteRepo.upsertAll).toHaveBeenCalledWith([remoteData1]);
    expect(localRepo.markAsSynced).toHaveBeenCalledWith([localNewer]);
  });

  it('should choose deleted data in local over remote as "synced"', async () => {
    const localDeleted: LocalType = {
      ...localData1,
      deletedAt: '2023-03-01T00:00:00Z',
      status: 'dirty',
    };

    const remoteStillExists: RemoteType = {
      ...remoteData1,
      deleted_at: null,
    };

    const resolvedData = {
      toLocal: [],
      toRemote: [localDeleted],
    };

    remoteRepo.fetchAll.mockResolvedValue([remoteStillExists]);
    localRepo.fetchAll.mockResolvedValue([localDeleted]);
    syncStrategy.resolve.mockReturnValue(resolvedData);
    syncStrategy.convertToRemote.mockReturnValue([remoteData1]);

    await syncManager.syncNow();

    expect(remoteRepo.upsertAll).toHaveBeenCalledWith([remoteData1]);
    expect(localRepo.markAsSynced).toHaveBeenCalledWith([localDeleted]);
  });

  it('should choose deleted data from remote over local as "synced"', async () => {
    const remoteDeleted: RemoteType = {
      ...remoteData1,
      deleted_at: new Date('2023-03-01T00:00:00Z'),
    };

    const localExists: LocalType = {
      ...localData1,
      deletedAt: null,
      status: 'synced',
    };

    const resolvedData = {
      toLocal: [remoteDeleted],
      toRemote: [],
    };

    remoteRepo.fetchAll.mockResolvedValue([remoteDeleted]);
    localRepo.fetchAll.mockResolvedValue([localExists]);
    syncStrategy.resolve.mockReturnValue(resolvedData);
    syncStrategy.convertToLocal.mockReturnValue([
      {
        ...localExists,
        deletedAt: '2023-03-01T00:00:00Z',
      },
    ]);

    await syncManager.syncNow();

    expect(localRepo.upsertAll).toHaveBeenCalledWith([
      expect.objectContaining({ deletedAt: '2023-03-01T00:00:00Z' }),
    ]);
  });

  it('should handle errors and reset isSyncing', async () => {
    remoteRepo.fetchAll.mockRejectedValue(new Error('fail fetch'));

    await syncManager.syncNow();

    expect((syncManager as any).isSyncing).toBe(false);
    expect((syncManager as any).lastSyncFailure?.reason).toBe('fail fetch');
    expect((syncManager as any).lastSyncFailedAt).toBeInstanceOf(Date);
  });
});
