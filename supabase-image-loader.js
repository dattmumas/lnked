const projectId =
  process.env.NEXT_PUBLIC_SUPABASE_URL?.split('//')[1]?.split('.')[0] || '';

export default function supabaseLoader({ src, width, quality }) {
  // Handle both absolute URLs and relative paths
  if (src.startsWith('http')) {
    // If it's already a full URL, return as-is or apply transforms if it's a Supabase URL
    if (src.includes('.supabase.co')) {
      return `${src}?width=${width}&quality=${quality || 75}`;
    }
    return src;
  }

  // For relative paths, construct the Supabase storage URL with transformations
  return `https://${projectId}.supabase.co/storage/v1/render/image/public/${src}?width=${width}&quality=${quality || 75}`;
}
