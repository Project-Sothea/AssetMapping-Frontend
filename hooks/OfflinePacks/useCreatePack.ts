import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { CreateOfflinePack } from '~/apis/OfflinePacks/createOfflinePack';
import { CreateOfflinePackProps } from '~/utils/globalTypes';

export default function useCreatePack() {
  const [progress, setProgress] = useState<number>(0);

  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (options: CreateOfflinePackProps) => CreateOfflinePack(options, setProgress),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['offlinePacks'] }),
  });

  return { ...mutation, progress };
}

/*
Errors:
1.  ERROR  [Error: Offline pack with name Sre O Primary School already exists.]
*/
