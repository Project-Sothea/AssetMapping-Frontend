import { supabase } from '~/services/supabase';

export const uploadToRemote = async (uri: string, fileName: string): Promise<string> => {
  console.log('tryin1');
  console.log('uri', uri);
  console.log('fileName', fileName);
  const response = await fetch(uri);
  const blob = await response.blob();

  const arrayBuffer = await new Response(blob).arrayBuffer();

  const { data, error } = await supabase.storage
    .from('pins')
    .upload(fileName, arrayBuffer, { contentType: blob.type || 'image/jpeg', upsert: true });

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

export async function listFilesInBucket(folderPath: string): Promise<string[]> {
  // folderPath should be like `${pinId}/`
  const { data, error } = await supabase.storage
    .from('pins') // your bucket name
    .list(folderPath, {
      limit: 100, // adjust as needed
      offset: 0,
      sortBy: { column: 'name', order: 'asc' },
    });

  if (error) {
    console.warn('Failed to list files or folder does not exist:', error);
    return [];
  }

  if (!Array.isArray(data) || data.length === 0) {
    return [];
  }

  return data.map((file) => file.name);
}
