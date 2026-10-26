import type { Form } from '@assetmapping/shared-types';
import { useMutation } from '@tanstack/react-query';

import { updateForm } from '../services/FormService';
import { FormValues } from '../types/';

export const useUpdateForm = () => {
  const mutation = useMutation({
    retry: false,
    mutationFn: ({ id, values, baseline }: { id: string; values: FormValues; baseline?: Form }) =>
      updateForm(id, values, baseline),
  });

  return {
    updateForm: mutation.mutate,
    updateFormAsync: mutation.mutateAsync,
    loading: mutation.isPending,
    error: mutation.error?.message || null,
    isSuccess: mutation.isSuccess,
    data: mutation.data,
  };
};
