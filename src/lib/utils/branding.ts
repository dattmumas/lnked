export const BRANDING_CONFIG = {
  bucket: 'collective-branding',
  maxSizeMB: 5,
  cacheControl: '3600', // 1 hour
};

export function generateBrandingFilename(
  collectiveId: string,
  kind: 'logo' | 'cover',
  fileType: string,
): string {
  const extension = fileType.split('/')[1] || 'png';
  const timestamp = new Date().getTime();
  return `${collectiveId}/${kind}-${timestamp}.${extension}`;
}

export function extractStoragePathFromUrl(url: string): string | null {
  try {
    const urlObject = new URL(url);
    const pathParts = urlObject.pathname.split('/');
    // Assumes the path is /storage/v1/object/public/bucket_name/path/to/file.ext
    // We want to extract 'path/to/file.ext'
    const bucketNameIndex = pathParts.findIndex(
      (part) => part === BRANDING_CONFIG.bucket,
    );
    if (bucketNameIndex > -1 && bucketNameIndex < pathParts.length - 1) {
      return pathParts.slice(bucketNameIndex + 1).join('/');
    }
  } catch (error) {
    console.error('Invalid URL for storage path extraction:', error);
  }
  return null;
}
