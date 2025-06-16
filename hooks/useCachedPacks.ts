import { useState, useCallback, useEffect } from 'react';
import MapboxGL from '@rnmapbox/maps';
import { DataState } from './types';
import OfflinePack from '@rnmapbox/maps/lib/typescript/src/modules/offline/OfflinePack';

//to retrieve offline tile pack stored in the db
//to be called as a function to retrieve tile pack

export const useCachedPacks = (): DataState<OfflinePack[]> => {
  //states

  return { data: null, error: null, loading: false };
};
