import { createBrowserClient } from '@supabase/ssr';

import {
  parseVideoAsset,
  parseVideoAssets,
  parseVideosWithUser,
  VideoInsertSchema,
  VideoUpdateSchema,
  type VideoAsset,
  type VideoInsert,
  type VideoUpdate,
  type VideoWithUser,
} from './schemas/video.schema';

import type { Database } from '@/lib/database.types';

/**
 * Video Repository
 *
 * Handles all video asset database operations.
 */
export class VideoRepository {
  constructor(
    private supabase: ReturnType<typeof createBrowserClient<Database>>,
  ) {}

  /**
   * Create a new video asset
   */
  async create(video: VideoInsert): Promise<VideoAsset | undefined> {
    const dbVideo = VideoInsertSchema.parse(video);

    const { data, error } = await this.supabase
      .from('video_assets')
      .insert(
        dbVideo as unknown as Database['public']['Tables']['video_assets']['Insert'],
      )
      .select()
      .single();

    if (error !== undefined || data === undefined) {
      return undefined;
    }

    return parseVideoAsset(data);
  }

  /**
   * Get a video by ID
   */
  async getById(id: string): Promise<VideoAsset | undefined> {
    const { data, error } = await this.supabase
      .from('video_assets')
      .select('*')
      .eq('id', id)
      .single();

    if (error !== undefined || data === undefined) {
      return undefined;
    }

    return parseVideoAsset(data);
  }

  /**
   * Get videos with user info
   */
  async getVideosWithUser(limit = 20): Promise<VideoWithUser[]> {
    const { data, error } = await this.supabase
      .from('video_assets')
      .select(
        `
        *,
        user:users!user_id (
          id,
          username,
          full_name,
          avatar_url
        )
      `,
      )
      .eq('status', 'ready')
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error !== undefined || data === undefined) {
      return [];
    }

    return parseVideosWithUser(data);
  }

  /**
   * Get videos by user
   */
  async getByUser(userId: string, limit = 20): Promise<VideoAsset[]> {
    const { data, error } = await this.supabase
      .from('video_assets')
      .select('*')
      .eq('user_id', userId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error !== undefined || data === undefined) {
      return [];
    }

    return parseVideoAssets(data);
  }

  /**
   * Update a video
   */
  async update(
    id: string,
    updates: VideoUpdate,
  ): Promise<VideoAsset | undefined> {
    const dbUpdates = VideoUpdateSchema.parse(updates);

    const { data, error } = await this.supabase
      .from('video_assets')
      .update({
        ...dbUpdates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error !== undefined || data === undefined) {
      return undefined;
    }

    return parseVideoAsset(data);
  }

  /**
   * Delete a video (soft delete)
   */
  async delete(id: string): Promise<boolean> {
    const { error } = await this.supabase
      .from('video_assets')
      .update({
        status: 'deleted',
        deleted_at: new Date().toISOString(),
      })
      .eq('id', id);

    return error === undefined;
  }

  /**
   * Update video status
   */
  async updateStatus(
    id: string,
    status: 'processing' | 'ready' | 'error' | 'deleted',
  ): Promise<boolean> {
    const { error } = await this.supabase
      .from('video_assets')
      .update({ status })
      .eq('id', id);

    return error === undefined;
  }

  /**
   * Update Mux data for a video
   */
  async updateMuxData(
    id: string,
    muxAssetId: string,
    muxPlaybackId: string,
    duration?: number,
  ): Promise<VideoAsset | undefined> {
    const updates: {
      mux_asset_id: string;
      mux_playback_id: string;
      status: string;
      duration?: number;
    } = {
      mux_asset_id: muxAssetId,
      mux_playback_id: muxPlaybackId,
      status: 'ready',
    };

    if (duration !== undefined) {
      updates.duration = duration;
    }

    const { data, error } = await this.supabase
      .from('video_assets')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error !== undefined || data === undefined) {
      return undefined;
    }

    return parseVideoAsset(data);
  }

  /**
   * Increment view count
   * Note: view_count column needs to be added to video_assets table for this to work
   */
  incrementViewCount(_id: string): boolean {
    // TODO: Implement when view_count column is added to the database
    console.warn(
      'incrementViewCount not implemented - view_count column missing',
    );
    return true;
  }

  /**
   * Search videos
   */
  async search(query: string, limit = 20): Promise<VideoWithUser[]> {
    const { data, error } = await this.supabase
      .from('video_assets')
      .select(
        `
        *,
        user:users!user_id (
          id,
          username,
          full_name,
          avatar_url
        )
      `,
      )
      .or(`title.ilike.%${query}%,description.ilike.%${query}%`)
      .eq('status', 'ready')
      .is('deleted_at', null)
      .limit(limit);

    if (error !== undefined || data === undefined) {
      return [];
    }

    return parseVideosWithUser(data);
  }

  /**
   * Update video by Mux asset ID
   */
  async updateByMuxAssetId(
    muxAssetId: string,
    updates: VideoUpdate,
  ): Promise<VideoAsset | undefined> {
    const dbUpdates = VideoUpdateSchema.parse(updates);

    const { data, error } = await this.supabase
      .from('video_assets')
      .update({
        ...dbUpdates,
        updated_at: new Date().toISOString(),
      })
      .eq('mux_asset_id', muxAssetId)
      .select()
      .single();

    if (error !== undefined || data === undefined) {
      return undefined;
    }

    return parseVideoAsset(data);
  }

  /**
   * Update video by Mux upload ID
   */
  async updateByMuxUploadId(
    muxUploadId: string,
    updates: VideoUpdate,
  ): Promise<VideoAsset | undefined> {
    const dbUpdates = VideoUpdateSchema.parse(updates);

    const { data, error } = await this.supabase
      .from('video_assets')
      .update({
        ...dbUpdates,
        updated_at: new Date().toISOString(),
      })
      .eq('mux_upload_id', muxUploadId)
      .select()
      .single();

    if (error !== undefined || data === undefined) {
      return undefined;
    }

    return parseVideoAsset(data);
  }

  /**
   * Get recent videos for debugging
   */
  async getRecentVideos(limit = 5): Promise<VideoAsset[]> {
    const { data, error } = await this.supabase
      .from('video_assets')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error !== undefined || data === undefined) {
      return [];
    }

    return parseVideoAssets(data);
  }
}
