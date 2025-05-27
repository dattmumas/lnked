import { createSupabaseBrowserClient } from './supabase/browser';

export async function uploadPostImage(file: File): Promise<{ url: string | null; error?: string }> {
  const supabase = createSupabaseBrowserClient();
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id || 'anon';
  const ext = file.name.split('.').pop() || 'png';
  const filePath = `user-${userId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  const { error } = await supabase.storage
    .from('post-images')
    .upload(filePath, file, { cacheControl: '3600', contentType: file.type, upsert: false });

  if (error) {
    console.error('Error uploading image:', error.message);
    return { url: null, error: error.message };
  }

  const { data } = supabase.storage.from('post-images').getPublicUrl(filePath);
  return { url: data.publicUrl, error: undefined };
}
