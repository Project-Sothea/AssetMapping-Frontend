import { decode } from 'base64-arraybuffer';
import * as FileSystem from 'expo-file-system';
import { supabase } from '~/services/supabase';

export const storeImage = async (uri: string, filename: string): Promise<string> => {
  const contentType = 'image/jpg';
  const base64 = await FileSystem.readAsStringAsync(uri, { encoding: 'base64' });

  const { data, error } = await supabase.storage
    .from('pins')
    .upload(filename, decode(base64), { contentType });

  if (error) {
    console.error('supabase error:', error.message);
    throw new Error(`supabase error:, ${error.message}`);
  }
  const publicUrl = supabase.storage.from('pins').getPublicUrl(data.path).data.publicUrl;

  return publicUrl;
};
