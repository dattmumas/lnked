import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import Mux from '@mux/mux-node';

// Initialize MUX client
const mux = new Mux({
  tokenId: process.env.MUX_TOKEN_ID!,
  tokenSecret: process.env.MUX_TOKEN_SECRET!,
});

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