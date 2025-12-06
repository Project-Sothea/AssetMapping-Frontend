import { useMutation } from '@tanstack/react-query';
import { updateForm } from '../services/FormService';
import { FormValues } from '../types/';

export const useUpdateForm = () => {
  const mutation = useMutation({
    mutationFn: ({ id, values }: { id: string; values: FormValues }) => updateForm(id, values),
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
