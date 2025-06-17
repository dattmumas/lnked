import Mux from '@mux/mux-node';
import { NextRequest, NextResponse } from 'next/server';

import { createServerSupabaseClient } from '@/lib/supabase/server';

// Initialize MUX client
const mux = new Mux({
  tokenId: process.env.MUX_TOKEN_ID!,
  tokenSecret: process.env.MUX_TOKEN_SECRET!,
});

/**
 * POST /api/videos/fix-playback-ids
 * Temporary endpoint to fix videos missing playback IDs
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

    // Get videos that have mux_asset_id but no mux_playback_id
    const { data: videos, error: fetchError } = await supabase
      .from('video_assets')
      .select('*')
      .eq('created_by', user.id)
      .not('mux_asset_id', 'is', null)
      .is('mux_playback_id', null);

    if (fetchError) {
      console.error('Error fetching videos:', fetchError);
      return NextResponse.json(
        { error: 'Failed to fetch videos' },
        { status: 500 }
      );
    }

    const results = [];

    for (const video of videos || []) {
      try {
        if (!video.mux_asset_id) {
          results.push({
            id: video.id,
            title: video.title,
            status: 'no_asset_id',
            message: 'No MUX asset ID found',
          });
          continue;
        }

        console.log(`Checking MUX asset: ${video.mux_asset_id}`);
        
        // Get asset from MUX
        const asset = await mux.video.assets.retrieve(video.mux_asset_id);
        
        if (asset.playback_ids && asset.playback_ids.length > 0) {
          const playbackId = asset.playback_ids[0].id;
          
          // Update database with playback ID
          const { error: updateError } = await supabase
            .from('video_assets')
            .update({
              mux_playback_id: playbackId,
              status: asset.status,
              duration: asset.duration,
              aspect_ratio: asset.aspect_ratio,
              updated_at: new Date().toISOString(),
            })
            .eq('id', video.id);

          if (updateError) {
            console.error(`Failed to update video ${video.id}:`, updateError);
            results.push({
              id: video.id,
              title: video.title,
              status: 'error',
              message: `Update failed: ${updateError.message}`,
            });
          } else {
            console.log(`Fixed video ${video.id}: ${playbackId}`);
            results.push({
              id: video.id,
              title: video.title,
              status: 'fixed',
              playback_id: playbackId,
            });
          }
        } else {
          results.push({
            id: video.id,
            title: video.title,
            status: 'no_playback_id',
            message: 'MUX asset has no playback IDs yet',
          });
        }
      } catch (muxError) {
        console.error(`Failed to check MUX asset ${video.mux_asset_id}:`, muxError);
        results.push({
          id: video.id,
          title: video.title,
          status: 'mux_error',
          message: `MUX API error: ${muxError instanceof Error ? muxError.message : 'Unknown error'}`,
        });
      }
    }

    return NextResponse.json({
      success: true,
      videos_checked: videos?.length || 0,
      results,
    });
  } catch (error) {
    console.error('Fix playback IDs error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 