import { useMutation } from '@tanstack/react-query';
import { updateForm } from '../services';
import { Form } from '~/db/types';

export const useUpdateForm = () => {
  const mutation = useMutation({
    mutationFn: ({ id, values }: { id: string; values: Omit<Form, 'id'> }) =>
      updateForm(id, values),
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
