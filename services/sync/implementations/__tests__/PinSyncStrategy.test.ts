import { Pin, RePin } from '~/utils/globalTypes';
import { PinSyncStrategy } from '../PinSyncStrategy';
import { makePin, makeRePin } from '~/utils/testUtils';

describe('PinSyncStrategy', () => {
  const strategy = new PinSyncStrategy();

  test('resolves a new remote pin properly', () => {
    const remote: RePin[] = [
      makeRePin({ id: '1', name: 'new Remote', updated_at: '2024-01-01T00:00:00Z' }),
    ];
    const local: Pin[] = [];

    const result = strategy.resolve(local, remote);

    expect(result.toLocal).toEqual(remote);
    expect(result.toRemote).toEqual([]);
  });

  test('resolves a new local pin properly', () => {
    const remote: RePin[] = [];
    const local: Pin[] = [
      makePin({ id: '1', name: 'new Local', updatedAt: '2024-01-01T00:00:00Z', status: 'dirty' }),
    ];

    const result = strategy.resolve(local, remote);

    expect(result.toLocal).toEqual([]);
    expect(result.toRemote).toEqual(local);
  });

  test('last-write-wins: remote is newer', () => {
    const id = '1';
    const local = [
      makePin({ id, name: 'Old local', updatedAt: '2023-01-01T00:00:00Z', status: 'synced' }),
    ];
    const remote = [makeRePin({ id, name: 'New remote', updated_at: '2024-01-01T00:00:00Z' })];

    const result = strategy.resolve(local, remote);

    expect(result.toLocal).toEqual([remote[0]]);
    expect(result.toRemote).toEqual([]);
  });

  test('last-write-wins: local is newer', () => {
    const id = '1';
    const local = [
      makePin({ id, name: 'New local', updatedAt: '2024-01-01T00:00:00Z', status: 'synced' }),
    ];
    const remote = [makeRePin({ id, name: 'Old remote', updated_at: '2023-01-01T00:00:00Z' })];

    const result = strategy.resolve(local, remote);

    expect(result.toLocal).toEqual([]);
    expect(result.toRemote).toEqual([local[0]]);
  });

  test('deletion wins over update: remote deleted, local updated', () => {
    const id = '1';
    const local = [
      makePin({
        id,
        name: 'Still here',
        updatedAt: '2024-06-01T00:00:00Z',
        deletedAt: null,
        status: 'dirty',
      }),
    ];
    const remote = [makeRePin({ id, deleted_at: '2024-07-01T00:00:00Z' })];

    const result = strategy.resolve(local, remote);

    expect(result.toLocal).toEqual([remote[0]]);
    expect(result.toRemote).toEqual([]);
  });

  test('deletion wins over update: local deleted, remote updated', () => {
    const id = '1';
    const local = [makePin({ id, deletedAt: '2024-07-01T00:00:00Z', status: 'dirty' })];
    const remote = [makeRePin({ id, updated_at: '2024-06-01T00:00:00Z', deleted_at: null })];

    const result = strategy.resolve(local, remote);

    expect(result.toLocal).toEqual([]);
    expect(result.toRemote).toEqual([local[0]]);
  });

  test('equal timestamps & local is "synced" = no sync', () => {
    const id = '1';
    const local = [
      makePin({ id, name: 'Same', updatedAt: '2024-01-01T00:00:00Z', status: 'synced' }),
    ];
    const remote = [makeRePin({ id, name: 'Same', updated_at: '2024-01-01T00:00:00Z' })];

    const result = strategy.resolve(local, remote);

    expect(result.toLocal).toEqual([]);
    expect(result.toRemote).toEqual([]);
  });

  test('equal timestamps & local is "dirty" = sync', () => {
    const id = '1';
    const local = [
      makePin({ id, name: 'Same', updatedAt: '2024-01-01T00:00:00Z', status: 'dirty' }),
    ];
    const remote = [makeRePin({ id, name: 'Same', updated_at: '2024-01-01T00:00:00Z' })];

    const result = strategy.resolve(local, remote);

    expect(result.toLocal).toEqual([]);
    expect(result.toRemote).toEqual([local[0]]);
  });

  describe('fromRePin', () => {
    it('maps all fields correctly from RePin to Pin', () => {
      const remote = makeRePin({
        id: 'pin1',
        name: 'Water Source',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-02T00:00:00Z',
        deleted_at: null,
        lat: 1.3521,
        lng: 103.8198,
        type: 'well',
        address: '123 Village Rd',
        state_province: 'Kampong',
        postal_code: '123456',
        country: 'SG',
        description: 'A well',
        images: ['img1.jpg', 'img2.jpg'],
      });

      const expected = makePin({
        id: 'pin1',
        name: 'Water Source',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-02T00:00:00Z',
        deletedAt: null,
        lat: 1.3521,
        lng: 103.8198,
        type: 'well',
        address: '123 Village Rd',
        stateProvince: 'Kampong',
        postalCode: '123456',
        country: 'SG',
        description: 'A well',
        images: JSON.stringify(['img1.jpg', 'img2.jpg']),
      });

      const result = PinSyncStrategy.fromRePin(remote);
      expect(result).toEqual(expected);
    });

    it('uses created_at as fallback when updated_at is null', () => {
      const remote = makeRePin({
        created_at: '2024-01-01T00:00:00Z',
        updated_at: null,
      });

      const result = PinSyncStrategy.fromRePin(remote);
      expect(result.updatedAt).toBe(remote.created_at);
    });

    it('handles null images', () => {
      const remote = makeRePin({ images: null });
      const result = PinSyncStrategy.fromRePin(remote);
      expect(result.images).toBeNull();
    });
  });

  describe('toRePin', () => {
    it('maps all fields correctly from Pin to RePin', () => {
      const local = makePin({
        id: 'pin1',
        name: 'Water Source',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-02T00:00:00Z',
        deletedAt: null,
        lat: 1.3521,
        lng: 103.8198,
        type: 'well',
        address: '123 Village Rd',
        stateProvince: 'Kampong',
        postalCode: '123456',
        country: 'SG',
        description: 'A well',
        images: JSON.stringify(['img1.jpg', 'img2.jpg']),
      });

      const expected = makeRePin({
        id: 'pin1',
        name: 'Water Source',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-02T00:00:00Z',
        deleted_at: null,
        lat: 1.3521,
        lng: 103.8198,
        type: 'well',
        address: '123 Village Rd',
        state_province: 'Kampong',
        postal_code: '123456',
        country: 'SG',
        description: 'A well',
        images: ['img1.jpg', 'img2.jpg'],
      });

      const result = PinSyncStrategy.toRePin(local);
      expect(result).toEqual(expected);
    });

    it('returns null for images if images (local) is null', () => {
      const local = makePin({ images: null });
      const result = PinSyncStrategy.toRePin(local);
      expect(result.images).toBeNull();
    });

    it('parses valid JSON string in images', () => {
      const local = makePin({ images: JSON.stringify(['a.jpg']) });
      const result = PinSyncStrategy.toRePin(local);
      expect(result.images).toEqual(['a.jpg']);
    });
  });
});
