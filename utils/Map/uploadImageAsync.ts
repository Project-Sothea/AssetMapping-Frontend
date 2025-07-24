import { callImages } from '~/apis';

export const uploadImageAsync = async (uri: string, filename: string) => {
  const { data, error } = await callImages.uploadAndGetUrl(uri, filename);
  if (error) throw error;
  return data;
};
