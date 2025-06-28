import { useQuery } from '@tanstack/react-query';
import { getForm, getForms } from '~/apis/Forms';
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
