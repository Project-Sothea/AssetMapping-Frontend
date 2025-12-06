import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { CreateOfflinePack } from './createOfflinePack';
import { CreateOfflinePackProps } from './types';

export default function useCreatePack() {
  const [progress, setProgress] = useState<number>(0);
  const [name, setName] = useState<string>('');

  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (options: CreateOfflinePackProps) =>
      CreateOfflinePack(options, setProgress, setName),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['offlinePacks'] }),
  });

  return { ...mutation, progress, name };
}
