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

    const updateData: any = {};
    const has = (key: string) => Object.prototype.hasOwnProperty.call(body, key);

    // Core metadata fields
    if (has('title')) updateData.title = body.title;
    if (has('description')) updateData.description = body.description;
    
    // Handle publishing status - videos are now published without creating posts
    // Users can manually create posts that reference videos if needed
    const newPostId = null;
    // Note: Automatic post creation has been disabled
    // Videos can exist independently of posts
    // Note: We don't set a status here. 'is_published' is a metadata flag.
    // The actual video 'status' (preparing, ready, errored) is controlled by Mux webhooks.

    // Handle privacy setting mapping from client-side 'privacySetting'
    if (has('privacy_setting')) {
      updateData.is_public = body.privacy_setting === 'public';
      updateData.playback_policy = body.privacy_setting === 'public' ? 'public' : 'signed';
    }

    // Direct mapping for other potential fields from the database schema
    if (has('encoding_tier')) updateData.encoding_tier = body.encoding_tier;
    if (has('collective_id')) updateData.collective_id = body.collective_id;
    if (has('post_id')) updateData.post_id = body.post_id;
    
    // Set updated_at timestamp for any change
    if (Object.keys(updateData).length > 0) {
      updateData.updated_at = new Date().toISOString();
    }
    
    console.log('PATCH /api/videos/[id] - Update data prepared:', updateData);

    // Update in database if there are changes
    if (Object.keys(updateData).length === 0) {
      console.log('PATCH /api/videos/[id] - No changes to apply.');
      return NextResponse.json({
        success: true,
        video: existingVideo,
        message: 'No changes detected.',
      });
    }
    
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

    try {
      // Step 1: Delete MUX resources first
      if (videoAsset.mux_asset_id) {
        // If an asset exists, delete the asset
        await mux.video.assets.delete(videoAsset.mux_asset_id);
        console.info('Deleted MUX asset:', videoAsset.mux_asset_id);
      } else if (videoAsset.mux_upload_id) {
        // If only an upload exists (asset not created yet), cancel the upload
        // This can still fail if the upload completes between the DB fetch and this call, so we wrap it
        try {
          await mux.video.uploads.cancel(videoAsset.mux_upload_id);
          console.info('Cancelled MUX upload:', videoAsset.mux_upload_id);
        } catch (muxError: any) {
          // It's safe to ignore a 400 error here, which Mux sends if the upload is already complete or cancelled
          if (muxError?.status !== 400) {
            throw muxError; // Re-throw if it's not the expected error
          }
          console.warn('Mux upload cancellation failed (likely already complete):', muxError.error?.messages);
        }
    }

      // Step 2: Delete the record from Supabase database
    const { error: deleteError } = await supabase
      .from('video_assets')
      .delete()
        .eq('id', videoId);

    if (deleteError) {
      console.error('Database deletion error:', deleteError);
        // If MUX deletion worked but DB failed, we have an orphan record
        // This is a candidate for a retry mechanism or manual cleanup
        return NextResponse.json(
          { error: 'Failed to delete video from database after deleting from MUX' },
          { status: 500 }
        );
      }

      console.log('Successfully deleted video record:', videoId);
      return NextResponse.json({
        success: true,
        message: 'Video deleted successfully',
      });
    } catch (muxError: any) {
      console.error('MUX deletion error:', muxError);
      // Return a specific error if MUX fails
      return NextResponse.json(
        {
          error: `Failed to delete MUX asset: ${muxError.message || 'Unknown MUX error'}`,
          details: muxError.error
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('DELETE /api/videos/[id] - Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 