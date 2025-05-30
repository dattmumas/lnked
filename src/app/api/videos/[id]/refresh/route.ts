import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import Mux from '@mux/mux-node';

// Initialize MUX client following their documentation
const mux = new Mux({
  tokenId: process.env.MUX_TOKEN_ID!,
  tokenSecret: process.env.MUX_TOKEN_SECRET!,
});

export async function POST(
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

    // If no upload or asset ID exists, nothing to refresh
    if (!videoAsset.mux_upload_id && !videoAsset.mux_asset_id) {
      return NextResponse.json({
        success: true,
        video: videoAsset,
        message: 'Video upload not started'
      });
    }

    // Define proper type for update data
    interface UpdateData {
      mux_asset_id?: string;
      status?: string;
      duration?: number;
      aspect_ratio?: string;
      mux_playback_id?: string;
      updated_at: string;
    }

    let updateData: UpdateData = { updated_at: new Date().toISOString() };
    let responseMessage = '';

    // Following MUX's documented API patterns:
    // If we have an upload ID but no asset ID, check upload status
    if (videoAsset.mux_upload_id && !videoAsset.mux_asset_id) {
      console.info('Checking upload status for:', videoAsset.mux_upload_id);
      
      try {
        // Use MUX Direct Uploads API for upload IDs
        const upload = await mux.video.uploads.retrieve(videoAsset.mux_upload_id);
        
        console.info('Upload status:', upload.status);
        console.info('Upload asset_id:', upload.asset_id);
        
        // Check if upload has created an asset
        if (upload.asset_id) {
          // Update our database with the actual asset ID
          updateData = {
            mux_asset_id: upload.asset_id,
            status: 'processing', // Asset created but might still be processing
            updated_at: new Date().toISOString(),
          };
          
          responseMessage = 'Upload completed, asset created. Getting asset status...';
          
          // Now get the actual asset status using Assets API
          try {
            console.info('Getting asset status for:', upload.asset_id);
            const asset = await mux.video.assets.retrieve(upload.asset_id);
            
            updateData.status = asset.status;
            updateData.duration = asset.duration;
            updateData.aspect_ratio = asset.aspect_ratio;
            
            // Update playback ID if available
            if (asset.playback_ids && asset.playback_ids.length > 0) {
              updateData.mux_playback_id = asset.playback_ids[0].id;
            }
            
            responseMessage = `Asset status updated: ${asset.status}`;
            console.info('Asset status:', asset.status);
          } catch {
            console.info('Asset not fully ready yet, keeping processing status');
            responseMessage = 'Upload completed, asset still processing';
          }
        } else {
          // Upload still in progress
          updateData = {
            status: upload.status,
            updated_at: new Date().toISOString(),
          };
          responseMessage = `Upload in progress: ${upload.status}`;
        }
      } catch (uploadError: unknown) {
        console.error('Upload status check failed:', uploadError);
        return NextResponse.json({
          success: false,
          error: 'Failed to check upload status from MUX'
        }, { status: 500 });
      }
    } 
    // If we have an asset ID, check asset status
    else if (videoAsset.mux_asset_id) {
      console.info('Getting asset status for asset ID:', videoAsset.mux_asset_id);
      
      try {
        const asset = await mux.video.assets.retrieve(videoAsset.mux_asset_id);
        
        updateData = {
          status: asset.status,
          duration: asset.duration,
          aspect_ratio: asset.aspect_ratio,
          updated_at: new Date().toISOString(),
        };

        // Update playback ID if available
        if (asset.playback_ids && asset.playback_ids.length > 0) {
          updateData.mux_playback_id = asset.playback_ids[0].id;
        }
        
        responseMessage = `Asset status: ${asset.status}`;
        console.info('Asset status:', asset.status);
      } catch (assetError: unknown) {
        console.error('Asset status check failed:', assetError);
        return NextResponse.json({
          success: false,
          error: 'Failed to retrieve video status from MUX'
        }, { status: 500 });
      }
    }

    // Update database if we have updates
    if (Object.keys(updateData).length > 1) { // More than just updated_at
      console.info('Updating database with:', updateData);
      
      const { data: updatedVideo, error: updateError } = await supabase
        .from('video_assets')
        .update(updateData)
        .eq('id', videoId)
        .eq('created_by', user.id)
        .select()
        .single();

      if (updateError) {
        console.error('Database update error:', updateError);
        return NextResponse.json({
          success: false,
          error: 'Failed to update video status'
        }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        video: updatedVideo,
        message: responseMessage,
      });
    }

    return NextResponse.json({
      success: true,
      video: videoAsset,
      message: responseMessage || 'No updates needed',
    });
  } catch (error) {
    console.error('Video refresh error:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
} 