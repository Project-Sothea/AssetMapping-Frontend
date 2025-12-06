import { useMutation } from '@tanstack/react-query';

import { createForm } from '../services/FormService';
import { FormValues } from '../types';

export const useCreateForm = () => {
  const mutation = useMutation({
    mutationFn: (values: FormValues) => createForm(values),
  });

  return {
    createForm: mutation.mutate,
    createFormAsync: mutation.mutateAsync,
    loading: mutation.isPending,
    error: mutation.error?.message || null,
    isSuccess: mutation.isSuccess,
    data: mutation.data,
  };
};
