import { supabase } from '~/services/supabase';
import { decode } from 'base64-arraybuffer';
import * as FileSystem from 'expo-file-system';

export const uploadImageAsync = async (uri: string, filename: string) => {
  const contentType = 'image/jpg';
  const base64 = await FileSystem.readAsStringAsync(uri, { encoding: 'base64' });

  const { data, error } = await supabase.storage.from('pins').upload(filename, decode(base64), {
    contentType,
  });

  if (error) throw error;

  const publicUrl = supabase.storage.from('pins').getPublicUrl(data.path).data.publicUrl;
  return publicUrl;
};
