import { supabase } from '~/services/supabase';

export const uploadToRemote = async (uri: string, fileName: string): Promise<string> => {
  console.log('tryin1');
  console.log('uri', uri);
  console.log('fileName', fileName);
  const response = await fetch(uri);
  const blob = await response.blob();

  const arrayBuffer = await new Response(blob).arrayBuffer();
  console.log('arrayBuffer', arrayBuffer.byteLength);

  const { data, error } = await supabase.storage
    .from('pins')
    .upload(fileName, arrayBuffer, { contentType: blob.type || 'image/jpeg', upsert: true });

  console.log('trying2');
  if (error) {
    console.error('supabase error:', error.message);
    throw new Error(`supabase error:, ${error.message}`);
  }
  const publicUrl = supabase.storage.from('pins').getPublicUrl(data.path).data.publicUrl;
  console.log('done2');

  console.log('uploadToRemote:', publicUrl);
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
