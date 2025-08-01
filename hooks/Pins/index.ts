import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { callPin } from '~/apis';
import { db } from '~/services/drizzleDb';
import { RePin } from '~/utils/globalTypes';
import * as schema from '~/db/schema';
import * as PinManager from '~/services/PinManager';

export const useInsertPin = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (p: PinManager.pinCreationData) => PinManager.createPin(p),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pins'] });
    },
  });
};

export const useFetchRemotePins = () => {
  return useQuery<RePin[]>({
    queryKey: ['pins'],
    queryFn: () => callPin.fetchAll(),
    refetchInterval: 10 * 1000,
  });
};

export const useFetchActivePins = () => {
  return useQuery<RePin[]>({
    queryKey: ['activePins'],
    queryFn: () => callPin.fetchAllActive(),
  });
};

export const useFetchLocalPins = () => {
  const query = db.select().from(schema.pins);
  return useLiveQuery(query) ?? [];
};
