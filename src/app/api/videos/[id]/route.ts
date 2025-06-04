import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import Mux from '@mux/mux-node';

// Initialize MUX client
const mux = new Mux({
  tokenId: process.env.MUX_TOKEN_ID!,
  tokenSecret: process.env.MUX_TOKEN_SECRET!,
});

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createServerSupabaseClient();

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error('PATCH /api/videos/[id] - Auth error:', authError);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: videoId } = await context.params;
    const body = await request.json();

    console.log('PATCH /api/videos/[id] - Request:', {
      videoId,
      userId: user.id,
      body,
    });

    // Validate that the user owns this video
    const { data: existingVideo, error: fetchError } = await supabase
      .from('video_assets')
      .select('*')
      .eq('id', videoId)
      .eq('created_by', user.id)
      .single();

    if (fetchError) {
      console.error('PATCH /api/videos/[id] - Fetch error:', fetchError);
      return NextResponse.json(
        { error: `Video fetch error: ${fetchError.message}` },
        { status: 404 }
      );
    }

    if (!existingVideo) {
      console.error('PATCH /api/videos/[id] - Video not found:', videoId);
      return NextResponse.json(
        { error: 'Video not found or access denied' },
        { status: 404 }
      );
    }

    console.log('PATCH /api/videos/[id] - Existing video found:', existingVideo);

    // Only update columns that ACTUALLY exist in the database
    const updateData: any = {};
    
    // These are the ONLY columns that exist in video_assets table:
    // id, mux_asset_id, mux_playback_id, title, description, duration, 
    // status, aspect_ratio, created_by, created_at, updated_at, mux_upload_id, mp4_support
    
    if (body.title !== undefined) {
      updateData.title = body.title;
    }
    
    if (body.description !== undefined) {
      updateData.description = body.description;
    }
    
    // Handle publishing by updating status (only column that exists)
    if (body.is_published !== undefined) {
      updateData.status = body.is_published ? 'ready' : 'preparing';
    }
    
    // Silently ignore ALL other form fields since they have no database columns:
    // - privacy_setting (no is_public column)
    // - collective_id (no collective_id column)
    // - encoding_tier (no encoding_tier column)
    // - tags (no tags column)
    // - thumbnail_url (no thumbnail_url column)
    // - published_at (no processed_at column)
    
         console.log('PATCH /api/videos/[id] - Filtered update data (only existing columns):', updateData);

    // Update in database
    const { data: updatedVideo, error: updateError } = await supabase
      .from('video_assets')
      .update(updateData)
      .eq('id', videoId)
      .eq('created_by', user.id)
      .select('*')
      .single();

    if (updateError) {
      console.error('PATCH /api/videos/[id] - Update error:', updateError);
      return NextResponse.json(
        { error: `Database update failed: ${updateError.message}` },
        { status: 500 }
      );
    }

    console.log('PATCH /api/videos/[id] - Update successful:', updatedVideo);

    return NextResponse.json({
      success: true,
      video: updatedVideo,
    });
  } catch (error) {
    console.error('PATCH /api/videos/[id] - Unexpected error:', error);
    return NextResponse.json(
      { error: `Internal server error: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
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

    const { id: videoId } = await context.params;

    // Get video asset from database
    const { data: videoAsset, error: fetchError } = await supabase
      .from('video_assets')
      .select('*')
      .eq('id', videoId)
      .eq('created_by', user.id)
      .single();

    if (fetchError || !videoAsset) {
      return NextResponse.json(
        { error: 'Video not found or access denied' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      video: videoAsset,
    });
  } catch (error) {
    console.error('Video fetch error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
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

    const { id: videoId } = await context.params;

    // Get video asset from database
    const { data: videoAsset, error: fetchError } = await supabase
      .from('video_assets')
      .select('*')
      .eq('id', videoId)
      .eq('created_by', user.id)
      .single();

    if (fetchError || !videoAsset) {
      return NextResponse.json(
        { error: 'Video not found or access denied' },
        { status: 404 }
      );
    }

    // Delete from MUX following their documentation
    // Handle both upload cancellation and asset deletion based on proper fields
    try {
      // If we have an upload ID but no asset ID, cancel the upload
      if (videoAsset.mux_upload_id && !videoAsset.mux_asset_id) {
        await mux.video.uploads.cancel(videoAsset.mux_upload_id);
        console.info('Cancelled MUX upload:', videoAsset.mux_upload_id);
      } 
      // If we have an asset ID, delete the asset
      else if (videoAsset.mux_asset_id) {
        await mux.video.assets.delete(videoAsset.mux_asset_id);
        console.info('Deleted MUX asset:', videoAsset.mux_asset_id);
      }
    } catch (muxError: unknown) {
      console.error('MUX deletion error:', muxError);
      // Continue with database deletion even if MUX fails
      // (asset might already be deleted or upload expired)
    }

    // Delete from our database
    const { error: deleteError } = await supabase
      .from('video_assets')
      .delete()
      .eq('id', videoId)
      .eq('created_by', user.id);

    if (deleteError) {
      console.error('Database deletion error:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete video from database' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Video deletion error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 