import { z } from 'zod';

import { createServerSupabaseClient } from '@/lib/supabase/server';

import type { Database } from '@/lib/database.types';
import type { FeedItem } from '@/types/home/types';

const fetchFeedSchema = z.object({
  limit: z.number().min(1).max(100).default(20),
  cursor: z.number().min(0).default(0),
  scope: z.discriminatedUnion('type', [
    z.object({ type: z.literal('global') }),
    z.object({ type: z.literal('tenant'), id: z.string().uuid() }),
  ]),
});

type UnifiedFeedRow =
  Database['public']['Functions']['get_unified_feed']['Returns'][number];

export async function fetchUnifiedFeed(input: z.infer<typeof fetchFeedSchema>) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error('Unauthorized');

  const { limit, cursor: offset, scope } = fetchFeedSchema.parse(input);
  const rpcArgs = {
    p_user_id: user.id,
    p_limit: limit,
    p_offset: offset,
    ...(scope.type === 'tenant' ? { p_tenant_id: scope.id } : {}),
  } as const;

  const { data, error } = await supabase.rpc('get_unified_feed', rpcArgs);
  if (error) throw new Error(error.message);

  const rows = data ?? [];

  // Transform database rows to FeedItem structure
  const items: FeedItem[] = rows.map((row) => {
    const author: FeedItem['author'] = {
      name: row.author_full_name || 'Unknown',
      username: row.author_username || row.author_id, // Fallback to author_id if username is null
    };

    // Only add avatar_url if it exists
    if (row.author_avatar_url) {
      author.avatar_url = row.author_avatar_url;
    }

    const feedItem: FeedItem = {
      id: row.id,
      type: row.post_type === 'video' ? 'video' : 'post',
      title: row.title,
      author,
      published_at: row.published_at, // Already in ISO string format
      stats: {
        likes: Number(row.like_count) || 0,
        dislikes: 0, // Not returned by the query
      },
      thumbnail_url: row.thumbnail_url,
    };

    // Add optional fields only if they have values
    if (row.content) {
      feedItem.content = row.content;
    }

    // Add metadata if it exists and has valid properties
    if (row.metadata && typeof row.metadata === 'object') {
      const meta = row.metadata as Record<string, unknown>;
      const metadata: NonNullable<FeedItem['metadata']> = {};

      if (typeof meta['playbackId'] === 'string')
        metadata.playbackId = meta['playbackId'];
      if (typeof meta['status'] === 'string') metadata.status = meta['status'];
      if (typeof meta['videoAssetId'] === 'string')
        metadata.videoAssetId = meta['videoAssetId'];

      if (Object.keys(metadata).length > 0) {
        feedItem.metadata = metadata;
      }
    }

    // For video posts, ensure we have the playback ID from the video_assets table
    if (feedItem.type === 'video' && row.video_id) {
      // If metadata doesn't exist or is missing playback info, we can add it here
      // This ensures video posts always have the necessary playback data
      if (!feedItem.metadata) {
        feedItem.metadata = {};
      }

      // Add video asset ID for reference
      if (!feedItem.metadata.videoAssetId) {
        feedItem.metadata.videoAssetId = row.video_id;
      }
    }

    if (row.collective_id && row.collective_name && row.collective_slug) {
      feedItem.collective = {
        name: row.collective_name,
        slug: row.collective_slug,
      };
    }

    if (row.tenant_id && row.tenant_name && row.tenant_type) {
      feedItem.tenant = {
        id: row.tenant_id,
        name: row.tenant_name,
        type: row.tenant_type as 'personal' | 'collective',
      };
    }

    return feedItem;
  });

  const nextCursor = items.length === limit ? offset + limit : null;
  return { items, nextCursor };
}
