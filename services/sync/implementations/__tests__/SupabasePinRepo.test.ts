import { SupabasePinRepo } from '../SupabasePinRepo';
import { callPin } from '~/apis';
import { RePin } from '~/utils/globalTypes';

jest.mock('~/apis', () => ({
  callPin: {
    fetchAll: jest.fn(),
    upsertAll: jest.fn(),
  },
}));

describe('SupabasePinRepo', () => {
  const repo = new SupabasePinRepo();

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('fetchAll calls callPin.fetchAll and returns pins', async () => {
    const mockPins: RePin[] = [
      {
        id: '1',
        name: 'Pin 1',
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z',
        deleted_at: null,
        address: null,
        description: null,
        images: null,
        lat: null,
        lng: null,
        postal_code: null,
        state_province: null,
        type: null,
      },
    ];

    (callPin.fetchAll as jest.Mock).mockResolvedValue(mockPins);

    const pins = await repo.fetchAll();

    expect(callPin.fetchAll).toHaveBeenCalledTimes(1);
    expect(pins).toEqual(mockPins);
  });

  test('upsertAll calls callPin.upsertAll with given pins', async () => {
    const mockPins: RePin[] = [
      {
        id: '2',
        name: 'Pin 2',
        created_at: '2023-02-01T00:00:00Z',
        updated_at: '2023-02-01T00:00:00Z',
        deleted_at: null,
        address: '123 Street',
        description: 'Test pin',
        images: ['img1.png'],
        lat: 1.23,
        lng: 4.56,
        postal_code: '12345',
        state_province: 'StateX',
        type: 'typeA',
      },
    ];

    (callPin.upsertAll as jest.Mock).mockResolvedValue(undefined);

    await repo.upsertAll(mockPins);

    expect(callPin.upsertAll).toHaveBeenCalledWith(mockPins);
  });

  test('upsertAll does nothing and does not throw when passed null or empty array', async () => {
    // mock the actual call to make sure it's not invoked
    (callPin.upsertAll as jest.Mock).mockResolvedValue(undefined);

    await expect(repo.upsertAll(null as any)).resolves.not.toThrow();
    await expect(repo.upsertAll(undefined as any)).resolves.not.toThrow();
    await expect(repo.upsertAll([])).resolves.not.toThrow();

    expect(callPin.upsertAll).not.toHaveBeenCalled();
  });
});
