import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createForm, softDeleteForm, getForm, getForms, updateForm } from '~/apis/Forms';
import { Form } from '~/utils/database.types';

export const useBulkFetchForms = () => {
  return useQuery<Form[]>({
    queryKey: ['forms'],
    queryFn: () => getForms(),
  });
};

export const useFetchForm = (id: string) => {
  return useQuery<Form | null>({
    queryKey: ['form', id],
    queryFn: () => getForm(id),
  });
};

export const useCreateForm = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (form: Form) => createForm(form),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['forms'] });
    },
  });
};

export const useUpdateForm = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, values }: { id: string; values: Partial<Form> }) => updateForm(id, values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['forms'] });
    },
  });
};

export const useSoftDeleteForm = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => softDeleteForm(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['forms'] });
    },
  });
};

export const useFormsSync = () => {
  const queryClient = useQueryClient();

  // return useMutation(
  //   (lastSyncTime: string) => formsSync(lastSyncTime),
  //   {
  //     onSuccess: () => {
  //       queryClient.invalidateQueries(['forms']);
  //     },
  //   }
  // );
};
