import supabase from '@/lib/supabase/browser';

const BUCKET = 'post-images';

interface UploadImageParams {
  file: File;
  userId: string;
  draftId: string;
}

/**
 * Uploads an image file to the private post-images bucket and returns a public URL.
 * Path format: user-{userId}/{draftId}/{timestamp}-{fileName}
 */
export async function uploadImage({
  file,
  userId,
  draftId,
}: UploadImageParams): Promise<string> {
  console.log('📦 uploadImage called', {
    fileName: file.name,
    fileSize: file.size,
    userId,
    draftId,
  });

  const folder = `user-${userId}/${draftId}`;
  const timestamp = Date.now();
  const randomSuffix = crypto.randomUUID().slice(0, 8);
  const path = `${folder}/${timestamp}-${randomSuffix}-${file.name}`;

  console.log('📁 Upload path:', path);
  console.log('☁️ Uploading to Supabase storage...');

  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    cacheControl: '31536000',
    upsert: false,
    contentType: file.type,
  });

  console.log('📤 Upload result:', {
    error: error ? error.message : 'success',
  });

  if (error) {
    // Handle filename collision by retrying with additional randomness
    if (
      error.message?.includes('already exists') ||
      error.message?.includes('409')
    ) {
      console.log('🔄 File collision detected, retrying with new name...');
      const retryPath = `${folder}/${timestamp}-${crypto.randomUUID()}-${file.name}`;
      console.log('📁 Retry path:', retryPath);

      const { error: retryError } = await supabase.storage
        .from(BUCKET)
        .upload(retryPath, file, {
          cacheControl: '31536000',
          upsert: false,
          contentType: file.type,
        });

      console.log('📤 Retry upload result:', {
        error: retryError ? retryError.message : 'success',
      });

      if (retryError) {
        throw retryError;
      }

      console.log('🔗 Creating signed URL for retry path...');
      // Use retry path for signed URL generation
      const { data, error: signErr } = await supabase.storage
        .from(BUCKET)
        .createSignedUrl(retryPath, 60 * 60); // 1-hour URL

      console.log('🔗 Retry signed URL result:', {
        signedUrl: data?.signedUrl ? 'created' : 'failed',
        error: signErr ? signErr.message : null,
      });

      if (signErr || !data?.signedUrl) {
        throw signErr ?? new Error('Failed to create signed URL');
      }

      console.log('✅ uploadImage retry completed successfully');
      return data.signedUrl;
    }

    console.log('❌ Upload failed with non-collision error:', error.message);
    throw error;
  }

  console.log('🔗 Creating signed URL...');
  const { data, error: signErr } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, 60 * 60); // 1-hour URL

  console.log('🔗 Signed URL result:', {
    signedUrl: data?.signedUrl ? 'created' : 'failed',
    error: signErr ? signErr.message : null,
  });

  if (signErr || !data?.signedUrl) {
    throw signErr ?? new Error('Failed to create signed URL');
  }

  console.log('✅ uploadImage completed successfully');
  return data.signedUrl;
}
