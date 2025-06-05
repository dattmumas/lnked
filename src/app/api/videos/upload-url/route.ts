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
 * Create MUX direct upload URL - Enhanced with new metadata fields
 * Supports: collective_id, post_id, privacy settings, encoding preferences
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

    const { 
      title, 
      description, 
      collective_id, 
      post_id, 
      privacySetting = 'public',
      encoding_tier = 'smart'
    } = await request.json();

    // Map privacySetting to database fields as per architecture design
    const is_public = privacySetting === 'public';
    const playback_policy = privacySetting === 'public' ? 'public' : 'signed';

    // Validate collective_id if provided
    if (collective_id) {
      const { data: collective, error: collectiveError } = await supabase
        .from('collectives')
        .select('id')
        .eq('id', collective_id)
        .single();

      if (collectiveError || !collective) {
        return NextResponse.json(
          { error: 'Invalid collective ID' },
          { status: 400 }
        );
      }

      // Check if user is a member of the collective
      const { data: membership, error: membershipError } = await supabase
        .from('collective_members')
        .select('id')
        .eq('collective_id', collective_id)
        .eq('user_id', user.id)
        .single();

      if (membershipError || !membership) {
        return NextResponse.json(
          { error: 'Not authorized to upload to this collective' },
          { status: 403 }
        );
      }
    }

    // Validate post_id if provided
    if (post_id) {
      const { data: post, error: postError } = await supabase
        .from('posts')
        .select('id, author_id')
        .eq('id', post_id)
        .single();

      if (postError || !post) {
        return NextResponse.json(
          { error: 'Invalid post ID' },
          { status: 400 }
        );
      }

      if (post.author_id !== user.id) {
        return NextResponse.json(
          { error: 'Not authorized to attach video to this post' },
          { status: 403 }
        );
      }
    }

    // Create MUX direct upload with enhanced settings
    const directUpload = await mux.video.uploads.create({
      cors_origin: process.env.NODE_ENV === 'development' 
        ? 'http://localhost:3000' 
        : process.env.NEXT_PUBLIC_APP_URL || 'https://your-domain.com',
      new_asset_settings: {
        playback_policy: [playback_policy],
        mp4_support: 'capped-1080p',
        encoding_tier: encoding_tier,
      },
    });

    // Save enhanced video metadata to database
    const { data: videoRecord, error: dbError } = await supabase
      .from('video_assets')
      .insert({
        title: title || null,
        description: description || null,
        mux_upload_id: directUpload.id,
        mux_asset_id: null,
        status: 'preparing',
        created_by: user.id,
        mp4_support: 'capped-1080p',
        // Enhanced metadata fields
        is_public,
        playback_policy,
        encoding_tier,
        collective_id: collective_id || null,
        post_id: post_id || null,
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