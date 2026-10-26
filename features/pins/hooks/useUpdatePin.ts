import type { Pin } from '@assetmapping/shared-types';
import { useMutation } from '@tanstack/react-query';

import { updatePin } from '../services/PinService';
import { PinValues } from '../types/';

export const useUpdatePin = () => {
  const mutation = useMutation({
    retry: false,
    mutationFn: ({
      id,
      updates,
      baseline,
    }: {
      id: string;
      updates: Partial<PinValues>;
      baseline?: Pin;
    }) => updatePin(id, updates, baseline),
  });

  return {
    updatePin: mutation.mutate,
    updatePinAsync: mutation.mutateAsync,
    loading: mutation.isPending,
    error: mutation.error?.message || null,
    isSuccess: mutation.isSuccess,
    data: mutation.data,
  };
};
