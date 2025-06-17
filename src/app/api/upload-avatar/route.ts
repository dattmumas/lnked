import { NextRequest, NextResponse } from 'next/server';

import { uploadAvatar } from '@/app/actions/userActions';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const result = await uploadAvatar(formData);
    
    if (result.success) {
      return NextResponse.json({ 
        success: true, 
        avatarUrl: result.avatarUrl 
      });
    } else {
      return NextResponse.json({ 
        success: false, 
        error: result.error 
      }, { status: 400 });
    }
  } catch (error) {
    console.error('Avatar upload API error:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
} 