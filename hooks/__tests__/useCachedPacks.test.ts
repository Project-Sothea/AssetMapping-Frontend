import MapboxGL, { OfflineCreatePackOptions, offlineManager } from '@rnmapbox/maps';
import { OfflineCreatePackOptionsArgs } from '@rnmapbox/maps/lib/typescript/src/modules/offline/OfflineCreatePackOptions';
import { act, render, renderHook, waitFor } from '@testing-library/react-native';
import { useCachedPacks } from '../useCachedPacks';

jest.mock('@rnmapbox/maps', () => ({
  offlineManager: {
    getPacks: jest.fn(),
    // optionally: createPack, deletePack, etc.
  },
}));

const mockPack1 = {
  name: 'myPack1',
  bounds: [
    [0, 0],
    [1, 1],
  ],
  metadata: { someKey: 'someValue' },
  status: jest.fn().mockResolvedValue({
    name: 'myPack1',
    state: 1,
    percentage: 100,
    completedResourceCount: 10,
    completedResourceSize: 1024,
    completedTileSize: 2048,
    completedTileCount: 50,
    requiredResourceCount: 50,
  }),
  resume: jest.fn().mockResolvedValue(undefined),
  pause: jest.fn().mockResolvedValue(undefined),
};

const mockPack2 = {
  name: 'myPack2',
  bounds: [
    [0, 0],
    [1, 1],
  ],
  metadata: { someKey: 'someValue' },
  status: jest.fn().mockResolvedValue({
    name: 'myPack2',
    state: 1,
    percentage: 100,
    completedResourceCount: 10,
    completedResourceSize: 1024,
    completedTileSize: 2048,
    completedTileCount: 50,
    requiredResourceCount: 50,
  }),
  resume: jest.fn().mockResolvedValue(undefined),
  pause: jest.fn().mockResolvedValue(undefined),
};

describe('useCachedPacks', () => {
  describe('given cached packs exist', () => {
    test('when hook is mounted', async () => {
      const mockPacks = [mockPack1, mockPack2];

      (offlineManager.getPacks as jest.Mock).mockResolvedValue(mockPacks);

      const { result } = renderHook(() => useCachedPacks());

      await waitFor(() => {
        const dataState = result.current.dataState;
        expect(dataState.data).toEqual(mockPacks);
        expect(dataState.loading).toBe(false);
        expect(dataState.error).toBeNull();
      });
    });

    test('when refetch func is called', async () => {
      const mockRes1 = [mockPack1];
      const mockRes2 = [mockPack1, mockPack2];

      (offlineManager.getPacks as jest.Mock)
        .mockResolvedValueOnce(mockRes1) //initial call
        .mockResolvedValueOnce(mockRes2); //refetch

      const { result } = renderHook(() => useCachedPacks());

      await waitFor(() => {
        const dataState = result.current.dataState;
        expect(dataState.data).toEqual(mockRes1);
        expect(dataState.loading).toBe(false);
        expect(dataState.error).toBeNull();
      });

      await act(async () => {
        await result.current.refetch();
      });

      await waitFor(() => {
        const dataState = result.current.dataState;
        expect(dataState.data).toEqual(mockRes2);
        expect(dataState.loading).toBe(false);
        expect(dataState.error).toBeNull();
      });
    });
  });
  //   describe('given no cached packs exist', () => {
  //     test('when hook is mounted', () => {
  //       expect(cache).toEqual(packs);
  //     });
  //     test('when refetch func is called', () => {
  //       expect(error).toBe(errorMsg);
  //     });
  //   });

  //   describe('given offlineManager throws', () => {
  //     test('when hook is mounted', () => {
  //       expect(cache).toEqual(packs);
  //     });
  //     test('when refetch func is called', () => {
  //       expect(error).toBe(errorMsg);
  //     });
  //   });
});
