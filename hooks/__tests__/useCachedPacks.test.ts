import MapboxGL, { OfflineCreatePackOptions, offlineManager } from '@rnmapbox/maps';
import { OfflineCreatePackOptionsArgs } from '@rnmapbox/maps/lib/typescript/src/modules/offline/OfflineCreatePackOptions';
import { act, render, renderHook, waitFor } from '@testing-library/react-native';
import { useFetchPacks } from '../useFetchPacks';

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
  const mockGetPacks = offlineManager.getPacks as jest.Mock;
  beforeAll(() => {
    jest.clearAllMocks();
  });

  describe('given cached packs exist', () => {
    test('when hook is mounted', async () => {
      const mockPacks = [mockPack1, mockPack2];
      mockGetPacks.mockResolvedValue(mockPacks);

      const { result } = renderHook(() => useFetchPacks());

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
      mockGetPacks
        .mockResolvedValueOnce(mockRes1) //initial call
        .mockResolvedValueOnce(mockRes2); //refetch

      const { result } = renderHook(() => useFetchPacks());
      await waitFor(() => {
        expect(result.current.dataState.loading).toEqual(false);
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

  describe('given no cached packs exist', () => {
    test('when hook is mounted', async () => {
      //arrange
      mockGetPacks.mockResolvedValue([]);

      //act
      const { result } = renderHook(() => useFetchPacks());

      //assert
      await waitFor(() => {
        const dataState = result.current.dataState;
        expect(dataState.data).toEqual([]);
        expect(dataState.error).toEqual(null);
        expect(dataState.loading).toEqual(false);
      });
    });
    test('when refetch func is called', async () => {
      //arrange
      const mockPacks = [mockPack1];
      mockGetPacks.mockResolvedValueOnce(mockPacks).mockResolvedValueOnce([]);

      //act
      const { result } = renderHook(() => useFetchPacks());
      await waitFor(() => {
        expect(result.current.dataState.loading).toEqual(false);
      });
      await act(async () => {
        await result.current.refetch();
      });

      //assert
      await waitFor(() => {
        const dataState = result.current.dataState;
        expect(dataState.data).toEqual([]);
        expect(dataState.loading).toBe(false);
        expect(dataState.error).toBeNull();
      });
    });
  });

  describe('given offlineManager throws', () => {
    const errMsg = 'fetch failed, clear cache';
    const FetchError = new Error(errMsg);

    test('when hook is mounted', async () => {
      mockGetPacks.mockRejectedValue(FetchError);

      const { result } = renderHook(() => useFetchPacks());

      await waitFor(() => {
        const dataState = result.current.dataState;
        expect(dataState.data).toEqual(null);
        expect(dataState.loading).toBe(false);
        expect(dataState.error).toBe(FetchError);
      });
    });

    test('when refetch func is called', async () => {
      const mockPacks = [mockPack1];
      mockGetPacks.mockResolvedValueOnce(mockPacks).mockRejectedValueOnce(FetchError);

      //act
      const { result } = renderHook(() => useFetchPacks());
      await waitFor(() => {
        expect(result.current.dataState.loading).toEqual(false);
      });
      await act(async () => {
        await result.current.refetch();
      });

      await waitFor(() => {
        const dataState = result.current.dataState;
        expect(dataState.data).toEqual(null);
        expect(dataState.loading).toBe(false);
        expect(dataState.error).toBe(FetchError);
      });
    });
  });

  describe('given consecutive requests', () => {
    test('when repeated refetch', async () => {
      mockGetPacks.mockResolvedValue([mockPack1, mockPack2]);

      const { result } = renderHook(() => useFetchPacks());

      await act(async () => {
        await Promise.all([
          result.current.refetch(),
          result.current.refetch(),
          result.current.refetch(),
        ]);
      });

      expect(mockGetPacks).toHaveBeenCalledTimes(1);
      expect(result.current.dataState.loading).toBe(false);
    });
  });
});
