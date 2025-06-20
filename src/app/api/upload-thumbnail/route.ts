import { NextRequest, NextResponse } from 'next/server';

import { uploadThumbnail } from '@/app/actions/postActions';

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const formData = await request.formData();
    
    // Get optional postId from form data or query params with explicit null handling
    const postId = formData.get('postId') as string | null;
    const queryPostId = request.nextUrl.searchParams.get('postId');
    
    // Explicitly handle nullable strings
    let finalPostId: string | undefined = undefined;
    if (postId !== null && postId.length > 0) {
      finalPostId = postId;
    } else if (queryPostId !== null && queryPostId.length > 0) {
      finalPostId = queryPostId;
    }
    
    const result = await uploadThumbnail(formData, finalPostId);
    
    if (result.success) {
      return NextResponse.json({ 
        success: true, 
        thumbnailUrl: result.thumbnailUrl 
      });
    } else {
      return NextResponse.json({ 
        success: false, 
        error: result.error 
      }, { status: 400 });
    }
  } catch (error: unknown) {
    console.error('Thumbnail upload API error:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
} 