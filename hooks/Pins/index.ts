import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { pin } from '~/apis';
import { CreatePin } from '~/utils/globalTypes';

export const useCreatePin = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (p: CreatePin) => pin.create(p),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pins'] });
    },
  });
};

export const useFetchPins = () => {
  return useQuery<CreatePin[] | null>({
    queryKey: ['pins'],
    queryFn: () => pin.fetchAll(),
  });
};
