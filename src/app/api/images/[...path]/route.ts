import { NextRequest, NextResponse } from 'next/server';

import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  try {
    const { path } = await params;
    const storagePath = path.join('/');

    // Extract bucket name from the path
    const bucketName = path[0];
    const filePath = path.slice(1).join('/');

    if (!bucketName || !filePath) {
      return NextResponse.json(
        { error: 'Invalid image path' },
        { status: 400 },
      );
    }

    const supabase = await createServerSupabaseClient();

    // Generate a signed URL with 1 hour expiry
    const { data, error } = await supabase.storage
      .from(bucketName)
      .createSignedUrl(filePath, 3600);

    if (error || !data?.signedUrl) {
      console.error('Error generating signed URL:', error);
      return NextResponse.json(
        { error: 'Failed to generate signed URL' },
        { status: 500 },
      );
    }

    // Fetch the image from the signed URL
    const imageResponse = await fetch(data.signedUrl);

    if (!imageResponse.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch image' },
        { status: imageResponse.status },
      );
    }

    // Get the image data and content type
    const imageBuffer = await imageResponse.arrayBuffer();
    const contentType =
      imageResponse.headers.get('content-type') || 'image/png';

    // Return the image with appropriate headers
    return new NextResponse(imageBuffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
      },
    });
  } catch (error) {
    console.error('Error in image proxy:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
