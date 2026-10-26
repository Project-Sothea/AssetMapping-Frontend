import type { Pin } from '@assetmapping/shared-types';
import { useMutation } from '@tanstack/react-query';

import { deletePin } from '../services/PinService';

export const useDeletePin = () => {
  const mutation = useMutation({
    retry: false,
    mutationFn: ({ id, baseline }: { id: string; baseline?: Pin }) => deletePin(id, baseline),
  });

  return {
    deletePin: mutation.mutate,
    deletePinAsync: mutation.mutateAsync,
    loading: mutation.isPending,
    error: mutation.error?.message || null,
    isSuccess: mutation.isSuccess,
    data: mutation.data,
  };
};
