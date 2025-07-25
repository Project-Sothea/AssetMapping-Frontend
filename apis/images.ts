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

export const deleteImage = async (publicUrl: string): Promise<boolean> => {
  try {
    const baseUrl = supabase.storage.from('pins').getPublicUrl('').data.publicUrl;
    console.log('baseUrl', baseUrl);
    // Strip base URL to get path: pins/<pinId>/<filename>
    const path = publicUrl.replace(baseUrl, '').replace(/^\/+/, '');
    console.log('path', path);

    const { error } = await supabase.storage.from('pins').remove([path]);

    if (error) {
      console.error('Failed to delete image:', error.message);
      return false;
    }

    return true;
  } catch (err) {
    console.error('Unexpected error deleting image:', err);
    return false;
  }
};
