import { DrizzlePinRepo } from '../DrizzlePinRepo';
import { db } from '~/services/drizzleDb';
import { Pin, pins } from '~/db/schema';

jest.mock('~/services/drizzleDb', () => {
  const mockSelect = jest.fn();
  const mockInsert = jest.fn();
  const mockUpdate = jest.fn();

  return {
    db: {
      select: mockSelect,
      insert: mockInsert,
      update: mockUpdate,
    },
    buildConflictUpdateColumns: jest.fn(() => ({
      name: 'excluded.name',
      lat: 'excluded.lat',
      // ...
    })),
  };
});

describe('DrizzlePinRepo', () => {
  const repo = new DrizzlePinRepo();

  const samplePin: Pin = {
    id: '1',
    name: 'Test Pin',
    lat: 1.23,
    lng: 4.56,
    type: 'hospital',
    images: JSON.stringify(['img1.png']),
    localImages: '[]',
    country: 'SG',
    postalCode: '123456',
    address: '1 Test Road',
    stateProvince: 'Central',
    description: 'desc',
    failureReason: null,
    lastSyncedAt: null,
    lastFailedSyncAt: null,
    updatedAt: new Date().toISOString(),
    deletedAt: null,
    createdAt: new Date().toISOString(),
    status: 'dirty',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('gets dirty pins in "Pin" (local) format', async () => {
    (db.select as jest.Mock).mockReturnValue({
      from: () => ({
        where: () => Promise.resolve([samplePin]),
      }),
    });

    const result = await repo.getDirty();
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('1');
    expect(result[0].images).toEqual(['img1.png']); // ensures it parses string
  });

  it('upserts pins from remote', async () => {
    const mockOnConflict = jest.fn().mockResolvedValue(undefined);
    (db.insert as jest.Mock).mockReturnValue({
      values: () => ({
        onConflictDoUpdate: mockOnConflict,
      }),
    });

    await repo.upsertAll([samplePin]);
    expect(db.insert).toHaveBeenCalledWith(pins);
    expect(mockOnConflict).toHaveBeenCalled();
  });

  it('calls upsertAll with correct structure', async () => {
    const mockOnConflict = jest.fn().mockResolvedValue(undefined);
    (db.insert as jest.Mock).mockReturnValue({
      values: () => ({
        onConflictDoUpdate: mockOnConflict,
      }),
    });

    await repo.upsertAll([samplePin]);
    expect(db.insert).toHaveBeenCalledWith(pins);
    expect(mockOnConflict).toHaveBeenCalled();
  });

  it('upsertAll does nothing and does not throw when passed null or empty array', async () => {
    const spy = jest.spyOn(db.insert(pins), 'values');

    // null
    await expect(repo.upsertAll(null as any)).resolves.not.toThrow();
    // undefined
    await expect(repo.upsertAll(undefined as any)).resolves.not.toThrow();
    // empty array
    await expect(repo.upsertAll([])).resolves.not.toThrow();

    expect(spy).not.toHaveBeenCalled();
  });

  it('marks pins as synced', async () => {
    const mockWhere = jest.fn().mockResolvedValue(undefined);
    (db.update as jest.Mock).mockReturnValue({
      set: () => ({
        where: mockWhere,
      }),
    });

    await repo.markAsSynced([samplePin]);
    expect(db.update).toHaveBeenCalledWith(pins);
    expect(mockWhere).toHaveBeenCalled();
  });

  it('does nothing when markAsSynced is passed empty array', async () => {
    await repo.markAsSynced([]);
    await expect(repo.markAsSynced([])).resolves.not.toThrow();

    expect(db.update).not.toHaveBeenCalled();
  });
});
