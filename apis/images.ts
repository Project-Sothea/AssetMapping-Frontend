import { supabase } from '~/services/supabase';
import * as FileSystem from 'expo-file-system';
import { decode } from 'base64-arraybuffer';

export const uploadToRemote = async (uri: string, fileName: string): Promise<string> => {
  console.log('tryin1');
  console.log('uri', uri);
  console.log('fileName', fileName);

  try {
    const contentType = 'image/jpg';
    const base64 = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    const uint8Array = new Uint8Array(decode(base64));

    console.log('base64', decode(base64).byteLength);
    const { data, error } = await supabase.storage
      .from('pins')
      .upload(fileName, uint8Array, { contentType, upsert: true });
    // const response = await fetch(uri);
    // const blob = await response.blob();
    // const arrayBuffer = await new Response(blob).arrayBuffer();
    // console.log('arrayBuffer', arrayBuffer.byteLength);

    // const { error } = await supabase.storage
    //   .from('pins')
    //   .upload(fileName, arrayBuffer, { contentType: 'image/jpeg', upsert: false });

    // const { data, error } = await supabase.storage
    //   .from('pins')
    //   .upload(fileName, uri, { contentType: 'image/jpeg' });
    // console.log('done1');

    console.log('trying2');
    if (error) {
      console.error('supabase error:', error.message);
      throw new Error(`supabase error:, ${error.message}`);
    }
    const publicUrl = supabase.storage.from('pins').getPublicUrl(data.path).data.publicUrl;
    console.log('done2');

    console.log('uploadToRemote:', publicUrl);
    return publicUrl;
  } catch (e) {
    console.warn(e);
  }
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
