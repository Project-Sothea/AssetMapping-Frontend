import MapboxGL, { OfflineCreatePackOptions, offlineManager } from '@rnmapbox/maps';
import { OfflineCreatePackOptionsArgs } from '@rnmapbox/maps/lib/typescript/src/modules/offline/OfflineCreatePackOptions';
import { renderHook, waitFor } from '@testing-library/react-native';
import { useCachedPacks } from '../useCachedPacks';
import { DataState } from '../types';

jest.mock('@rnmapbox/maps', () => ({
  offlineManager: {
    getPacks: jest.fn(),
    // optionally: createPack, deletePack, etc.
  },
}));

describe('useCachedPacks', () => {
  describe('given cached packs exist', () => {
    const mockPack = {
      name: 'myPack',
      bounds: [
        [0, 0],
        [1, 1],
      ],
      metadata: { someKey: 'someValue' },
      status: jest.fn().mockResolvedValue({
        name: 'myPack',
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

    // const optionsArgs: OfflineCreatePackOptionsArgs = {
    //   name: 'Sre O Primary School',
    //   styleURL: 'mapbox://styles/mapbox/satellite-v9',
    //   bounds: [
    //     [103.390906, 12.829011], //neLg, neLat
    //     [103.389445, 12.827979], //swLg, swLat
    //   ],
    //   minZoom: 16,
    //   maxZoom: 18,
    // };
    // const mockPacks: OfflinePack[] = [new OfflinePack(new OfflineCreatePackOptions(optionsArgs))];

    test('when hook is mounted', async () => {
      (offlineManager.getPacks as jest.Mock).mockResolvedValue([mockPack]);

      const { result } = renderHook(() => useCachedPacks());

      await waitFor(() => {
        // expect(result.current.data).toEqual(mockOfflinePack);
        expect(result.current.data).toEqual(mockPack);
        expect(result.current.loading).toBeNull();
        expect(result.current.error).toBeNull();
      });
    });
    // test('when refetch func is called', () => {
    //   expect(error).toBe(errorMsg);
    // });
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
