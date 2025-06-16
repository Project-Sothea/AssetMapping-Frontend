import { offlineManager } from '@rnmapbox/maps';
import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';

type UseCreateOfflinePackProps = Parameters<typeof offlineManager.createPack>[0];

export default function useCreateOfflinePack(options: UseCreateOfflinePackProps) {
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<Error | null>(null);

  //to update UI
  const createPack = async (options: UseCreateOfflinePackProps) => {
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
  const { mutateAsync: createPackMutation } = useMutation({
    mutationFn: createPack,
  });

  return { createPackMutation, progress, error };
}
