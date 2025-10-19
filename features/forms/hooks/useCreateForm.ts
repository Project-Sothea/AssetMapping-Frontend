import { useMutation } from '@tanstack/react-query';
import { createForm } from '../services';
import { Form } from '~/db/schema';

export const useCreateForm = () => {
  const mutation = useMutation({
    mutationFn: (values: Omit<Form, 'id'>) => createForm(values),
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
