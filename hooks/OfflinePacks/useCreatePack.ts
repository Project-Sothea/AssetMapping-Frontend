import { useMutation, useQueryClient } from '@tanstack/react-query';
import { CreateOfflinePack } from '~/apis/OfflinePacks/createOfflinePack';

export default function useCreatePack() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: CreateOfflinePack,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['offlinePacks'] }),
  });
}

/*
Errors:
1.  ERROR  [Error: Offline pack with name Sre O Primary School already exists.]
*/
