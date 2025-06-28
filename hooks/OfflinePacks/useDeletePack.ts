import { useMutation, useQueryClient } from '@tanstack/react-query';
import { deleteOfflinePack } from '~/apis/OfflinePacks/deleteOfflinePack';

//to retrieve offline tile pack stored in the db

export const useDeletePack = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteOfflinePack,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['offlinePacks'] }),
  });
};
