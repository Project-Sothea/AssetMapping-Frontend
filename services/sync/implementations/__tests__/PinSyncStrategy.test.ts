import { Pin, RePin } from '~/utils/globalTypes';
import { PinSyncStrategy } from '../PinSyncStrategy';

const makePin = (overrides: Partial<Pin>): Pin => ({
  id: 'default',
  name: null,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
  deletedAt: null,
  failureReason: null,
  status: null,
  lastSyncedAt: null,
  lastFailedSyncAt: null,
  lat: null,
  lng: null,
  type: null,
  address: null,
  stateProvince: null,
  postalCode: null,
  country: null,
  description: null,
  images: null,
  localImages: null,
  ...overrides,
});

const makeRePin = (overrides: Partial<RePin>): RePin => ({
  id: 'default',
  name: null,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  deleted_at: null,
  description: null,
  images: null,
  lat: null,
  lng: null,
  type: null,
  address: null,
  state_province: null,
  postal_code: null,
  country: null,
  ...overrides,
});

describe('PinSyncStrategy', () => {
  const strategy = new PinSyncStrategy();

  test('pulls remote-only pins', () => {
    const remote: RePin[] = [makeRePin({ id: '1', name: 'Remote only' })];
    const local: Pin[] = [];

    const result = strategy.resolve(local, remote);

    expect(result.toPullToLocal).toEqual(remote);
    expect(result.toPushToRemote).toEqual([]);
  });

  test('pushes local-only pins', () => {
    const local = [makePin({ id: '1', name: 'Local only' })];
    const remote: RePin[] = [];

    const result = strategy.resolve(local, remote);

    expect(result.toPushToRemote).toEqual(local);
    expect(result.toPullToLocal).toEqual([]);
  });

  test('last-write-wins: remote is newer', () => {
    const id = '1';
    const local = [makePin({ id, name: 'Old local', updatedAt: '2023-01-01T00:00:00Z' })];
    const remote = [makeRePin({ id, name: 'New remote', updated_at: '2024-01-01T00:00:00Z' })];

    const result = strategy.resolve(local, remote);

    expect(result.toPullToLocal).toEqual([remote[0]]);
    expect(result.toPushToRemote).toEqual([]);
  });

  test('last-write-wins: local is newer', () => {
    const id = '1';
    const local = [makePin({ id, name: 'New local', updatedAt: '2024-01-01T00:00:00Z' })];
    const remote = [makeRePin({ id, name: 'Old remote', updated_at: '2023-01-01T00:00:00Z' })];

    const result = strategy.resolve(local, remote);

    expect(result.toPullToLocal).toEqual([]);
    expect(result.toPushToRemote).toEqual([local[0]]);
  });

  test('deletion wins over update: remote deleted, local updated', () => {
    const id = '1';
    const local = [
      makePin({ id, name: 'Still here', updatedAt: '2024-06-01T00:00:00Z', deletedAt: null }),
    ];
    const remote = [makeRePin({ id, deleted_at: '2024-07-01T00:00:00Z' })];

    const result = strategy.resolve(local, remote);

    expect(result.toPullToLocal).toEqual([remote[0]]);
    expect(result.toPushToRemote).toEqual([]);
  });

  test('deletion wins over update: local deleted, remote updated', () => {
    const id = '1';
    const local = [makePin({ id, deletedAt: '2024-07-01T00:00:00Z' })];
    const remote = [makeRePin({ id, updated_at: '2024-06-01T00:00:00Z', deleted_at: null })];

    const result = strategy.resolve(local, remote);

    expect(result.toPushToRemote).toEqual([local[0]]);
    expect(result.toPullToLocal).toEqual([]);
  });

  test('equal timestamps = no sync', () => {
    const id = '1';
    const local = [makePin({ id, name: 'Same', updatedAt: '2024-01-01T00:00:00Z' })];
    const remote = [makeRePin({ id, name: 'Same', updated_at: '2024-01-01T00:00:00Z' })];

    const result = strategy.resolve(local, remote);

    expect(result.toPushToRemote).toEqual([]);
    expect(result.toPullToLocal).toEqual([]);
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

    it('returns null for images if local.images is null', () => {
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
