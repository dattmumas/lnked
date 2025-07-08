import { createServerSupabaseClient } from '@/lib/supabase/server';

import type { Database } from '@/lib/database.types';

type VideoAssetRow = Database['public']['Tables']['video_assets']['Row'];

export interface VideoAsset {
  id: string;
  title: string | null;
  description: string | null;
  status: string | null;
  duration: number | null;
  aspect_ratio: string | null;
  created_at: string | null;
  updated_at: string | null;
  mux_asset_id: string | null;
  mux_playback_id: string | null;
  created_by: string | null;
  deleted_at: string | null;
  is_public: boolean | null;
  collective_id: string | null;
  post_id: string | null;
  view_count?: number;
  like_count?: number;
  post?: {
    id: string;
    title: string;
    slug: string | null;
  } | null;
}

export interface VideoStats {
  totalVideos: number;
  readyVideos: number;
  processingVideos: number;
  erroredVideos: number;
  totalDuration: number;
  totalViews: number;
  totalStorage: number; // in bytes
}

export interface VideoPageData {
  videos: VideoAsset[];
  stats: VideoStats;
  pagination: {
    page: number;
    limit: number;
    totalCount: number;
    totalPages: number;
    hasMore: boolean;
  };
}

export interface VideoFilters {
  page?: number;
  limit?: number;
  search?: string;
  status?: 'all' | 'ready' | 'preparing' | 'processing' | 'errored';
  sortBy?: 'created_at' | 'title' | 'duration' | 'updated_at' | 'view_count';
  sortOrder?: 'asc' | 'desc';
}

/**
 * Load video data for the video management page
 * Optimized to minimize queries and fetch all data in parallel
 */
export async function loadVideoData(
  userId: string,
  filters: VideoFilters = {},
): Promise<VideoPageData> {
  const {
    page = 1,
    limit = 20,
    search = '',
    status = 'all',
    sortBy = 'created_at',
    sortOrder = 'desc',
  } = filters;

  const supabase = await createServerSupabaseClient();
  const offset = (page - 1) * limit;

  // Build the main query
  let query = supabase
    .from('video_assets')
    .select(
      `
      *,
      posts!video_assets_post_id_fkey(
        id,
        title,
        slug
      )
    `,
      { count: 'exact' },
    )
    .eq('created_by', userId)
    .is('deleted_at', null);

  // Apply filters
  if (search.trim()) {
    query = query.or(
      `title.ilike.%${search.trim()}%,description.ilike.%${search.trim()}%`,
    );
  }

  if (status !== 'all') {
    query = query.eq('status', status);
  }

  // Apply sorting
  query = query.order(sortBy, { ascending: sortOrder === 'asc' });

  // Apply pagination
  const {
    data: videos,
    error,
    count,
  } = await query.range(offset, offset + limit - 1);

  if (error) {
    console.error('Error fetching videos:', error);
    return {
      videos: [],
      stats: getDefaultStats(),
      pagination: {
        page,
        limit,
        totalCount: 0,
        totalPages: 0,
        hasMore: false,
      },
    };
  }

  // Fetch aggregate stats in parallel
  const statsResult = await supabase
    .from('video_assets')
    .select('status, duration')
    .eq('created_by', userId)
    .is('deleted_at', null);

  // Calculate stats
  const videoStatsData = statsResult.data || [];
  const validVideoStatsData: Array<{
    status: string | null;
    duration: number | null;
  }> = [];

  if (Array.isArray(videoStatsData)) {
    videoStatsData.forEach((item) => {
      if (item !== null && item !== undefined && typeof item === 'object') {
        validVideoStatsData.push({
          status: item.status ?? null,
          duration: item.duration ?? null,
        });
      }
    });
  }

  const stats = calculateVideoStats(validVideoStatsData);

  // Transform videos to include additional data
  const transformedVideos: VideoAsset[] = (videos || []).map((video) => ({
    ...video,
    post:
      Array.isArray(video.posts) && video.posts.length > 0
        ? video.posts[0]
        : null,
  }));

  return {
    videos: transformedVideos,
    stats,
    pagination: {
      page,
      limit,
      totalCount: count || 0,
      totalPages: Math.ceil((count || 0) / limit),
      hasMore: (count || 0) > offset + limit,
    },
  };
}

/**
 * Load a single video with full details
 */
export async function loadVideoDetails(
  videoId: string,
  userId: string,
): Promise<VideoAsset | null> {
  const supabase = await createServerSupabaseClient();

  const { data: video, error } = await supabase
    .from('video_assets')
    .select(
      `
      *,
      posts!video_assets_post_id_fkey(
        id,
        title,
        slug,
        view_count,
        like_count
      )
    `,
    )
    .eq('id', videoId)
    .eq('created_by', userId)
    .is('deleted_at', null)
    .single();

  if (error || !video) {
    console.error('Error fetching video details:', error);
    return null;
  }

  // Transform the result
  const post =
    Array.isArray(video.posts) && video.posts.length > 0
      ? video.posts[0]
      : null;

  return {
    ...video,
    post,
    view_count: post?.view_count || 0,
    like_count: post?.like_count || 0,
  };
}

/**
 * Load videos that are currently processing
 */
export async function loadProcessingVideos(
  userId: string,
): Promise<VideoAsset[]> {
  const supabase = await createServerSupabaseClient();

  const { data: videos, error } = await supabase
    .from('video_assets')
    .select('*')
    .eq('created_by', userId)
    .in('status', ['preparing', 'processing'])
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching processing videos:', error);
    return [];
  }

  return videos || [];
}

/**
 * Helper functions
 */
function calculateVideoStats(
  videos: Array<{ status: string | null; duration: number | null }>,
): VideoStats {
  const stats: VideoStats = {
    totalVideos: videos.length,
    readyVideos: 0,
    processingVideos: 0,
    erroredVideos: 0,
    totalDuration: 0,
    totalViews: 0,
    totalStorage: 0,
  };

  videos.forEach((video) => {
    // Count by status
    switch (video.status) {
      case 'ready':
        stats.readyVideos++;
        break;
      case 'preparing':
      case 'processing':
        stats.processingVideos++;
        break;
      case 'errored':
        stats.erroredVideos++;
        break;
    }

    // Sum duration
    if (video.duration) {
      stats.totalDuration += video.duration;
    }
  });

  return stats;
}

function getDefaultStats(): VideoStats {
  return {
    totalVideos: 0,
    readyVideos: 0,
    processingVideos: 0,
    erroredVideos: 0,
    totalDuration: 0,
    totalViews: 0,
    totalStorage: 0,
  };
}
