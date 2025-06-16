import { offlineManager } from '@rnmapbox/maps';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

type UseCreatePackProps = Parameters<typeof offlineManager.createPack>[0];

export default function useCreatePack(options: UseCreatePackProps) {
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<Error | null>(null);

  //to update UI
  const createPack = async (options: UseCreatePackProps) => {
    return await offlineManager.createPack(
      options,
      (pack, status) => setProgress(status.percentage),
      (pack, err) => {
        console.error('Offline pack error:', err);
        setError(err instanceof Error ? err : new Error('Unknown error'));
      }
    );
  };

  //reactQuery mutation function for state management
  const queryClient = useQueryClient();

  const { mutateAsync: createPackMutation } = useMutation({
    mutationFn: createPack,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['offlinePacks'] }),
  });

  return { createPackMutation, progress, error };
}
