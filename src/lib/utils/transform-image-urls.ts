/**
 * Transforms Supabase storage signed URLs to use our API endpoint
 * This ensures images always have fresh signed URLs
 */
export function transformImageUrls(html: string): string {
  // Pattern to match Supabase storage signed URLs
  const supabaseUrlPattern =
    /https:\/\/([^.]+)\.supabase\.co\/storage\/v1\/object\/sign\/([^?]+)\?[^"']*/g;

  // Replace all matched URLs with our API endpoint
  return html.replace(supabaseUrlPattern, (match, projectRef, path) => {
    // The path already includes the bucket name and file path
    return `/api/images/${path}`;
  });
}
