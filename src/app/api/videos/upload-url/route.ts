import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import Mux from '@mux/mux-node';

// Initialize MUX client following their documentation
const mux = new Mux({
  tokenId: process.env.MUX_TOKEN_ID!,
  tokenSecret: process.env.MUX_TOKEN_SECRET!,
});

/**
 * POST /api/videos/upload-url
 * Create MUX direct upload URL - following MUX documentation exactly
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { title, description } = await request.json();

    // Create MUX direct upload following their documentation
    const directUpload = await mux.video.uploads.create({
      cors_origin: process.env.NODE_ENV === 'development' 
        ? 'http://localhost:3000' 
        : process.env.NEXT_PUBLIC_APP_URL || 'https://your-domain.com',
      new_asset_settings: {
        playback_policy: ['public'],
        mp4_support: 'capped-1080p', // Enable MP4 downloads
        encoding_tier: 'smart',
      },
    });

    // Save initial video metadata to database with upload ID
    // Following MUX pattern: webhook will update this with actual asset ID
    const { data: videoRecord, error: dbError } = await supabase
      .from('video_assets')
      .insert({
        title: title || null,
        description: description || null,
        mux_upload_id: directUpload.id,
        mux_asset_id: null,
        status: 'preparing',
        created_by: user.id,
        mp4_support: 'capped-1080p', // Store MP4 support setting
      })
      .select()
      .single();

    if (dbError) {
      console.error('Database error:', dbError);
      return NextResponse.json(
        { error: 'Failed to save video metadata' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      uploadUrl: directUpload.url,
      video: videoRecord,
    });
  } catch (error) {
    console.error('Upload URL creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create upload URL' },
      { status: 500 }
    );
  }
} 