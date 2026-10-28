import type { Form } from '@assetmapping/shared-types';
import { useMutation } from '@tanstack/react-query';

import { deleteForm } from '../services/FormService';

export const useDeleteForm = () => {
  const mutation = useMutation({
    retry: false,
    mutationFn: ({ id, baseline }: { id: string; baseline?: Form }) => deleteForm(id, baseline),
  });

  return {
    deleteForm: mutation.mutate,
    deleteFormAsync: mutation.mutateAsync,
    loading: mutation.isPending,
    error: mutation.error?.message || null,
    isSuccess: mutation.isSuccess,
    data: mutation.data,
  };
};
