import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { callPin } from '~/apis';
import { InsertPin, Pin } from '~/utils/globalTypes';

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
