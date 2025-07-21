import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { callPin } from '~/apis';
import { db } from '~/services/drizzleDb';
import { InsertPin, Pin } from '~/utils/globalTypes';
import * as schema from '~/db/schema';

export const useInsertPin = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (p: InsertPin) => callPin.create(p),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pins'] });
    },
  });
};

export const useFetchPins = () => {
  return useQuery<Pin[]>({
    queryKey: ['pins'],
    queryFn: () => callPin.fetchAll(),
  });
};

export const useFetchLivePins = () => {
  const query = db.select().from(schema.pins);
  return useLiveQuery(query) ?? [];
};
