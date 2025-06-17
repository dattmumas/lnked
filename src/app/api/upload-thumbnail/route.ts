import { NextRequest, NextResponse } from 'next/server';

import { uploadThumbnail } from '@/app/actions/postActions';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    
    // Get optional postId from form data or query params
    const postId = formData.get('postId') as string | null;
    const queryPostId = request.nextUrl.searchParams.get('postId');
    const finalPostId = postId || queryPostId || undefined;
    
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
  } catch (error) {
    console.error('Thumbnail upload API error:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
} 