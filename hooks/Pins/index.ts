import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { callPin } from '~/apis';
import { CreatePin, Pin } from '~/utils/globalTypes';

export const useCreatePin = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (p: CreatePin) => callPin.create(p),
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
