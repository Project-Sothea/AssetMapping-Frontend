import { useQuery } from '@tanstack/react-query';
import { fetchOfflinePacks } from '~/apis/OfflinePacks/fetchOfflinePacks';

//to retrieve offline tile pack stored in the db

export const useFetchPacks = () => {
  return useQuery({
    queryFn: fetchOfflinePacks,
    queryKey: ['offlinePacks'],
  });
};
