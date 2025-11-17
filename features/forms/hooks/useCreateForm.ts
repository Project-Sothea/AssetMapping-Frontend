import { useMutation } from '@tanstack/react-query';
import { createForm } from '../services';
import type { FormDB } from '~/db/schema';

export const useCreateForm = () => {
  const mutation = useMutation({
    mutationFn: (values: Omit<FormDB, 'id'>) => createForm(values),
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
