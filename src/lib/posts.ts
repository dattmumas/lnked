import type { Database } from '@/lib/database.types';
import type { SupabaseClient } from '@supabase/supabase-js';

export type PostWithAuthorAndCollective = {
  id: string;
  title: string | null;
  content: string | null;
  subtitle: string | null;
  author_id: string;
  collective_id: string | null;
  thumbnail_url: string | null;
  is_public: boolean | null;
  published_at: string | null;
  created_at: string | null;
  view_count: number | null;
  post_type: Database['public']['Enums']['post_type_enum'];
  video_id: string | null;
  author: {
    id: string;
    full_name: string | null;
    username: string | null;
    avatar_url: string | null;
    bio: string | null;
  } | null;
  collective: {
    id: string;
    name: string;
    slug: string;
  } | null;
  video_asset?: {
    id: string;
    mux_playback_id: string | null;
    status: string | null;
    duration: number | null;
    is_public: boolean | null;
  } | null;
  user_reaction?: {
    reaction_type: string;
  };
  user_bookmark?: {
    id: string;
  };
  real_like_count: number;
  real_dislike_count: number;
};

export type PostViewer = {
  isOwner: boolean;
  isPublished: boolean;
  canReact: boolean;
  canEdit: boolean;
  canViewPrivate: boolean;
  userReaction?: string;
  isBookmarked: boolean;
};

export type PostResult = {
  post: PostWithAuthorAndCollective;
  viewer: PostViewer;
};

export async function fetchPost(
  supabase: SupabaseClient<Database>,
  slugOrId: string,
  viewerId?: string,
): Promise<PostResult> {
  // Check if it's a UUID
  const isUUID =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      slugOrId,
    );

  // Fetch post with author and collective
  const { data: postData, error: postError } = await supabase
    .from('posts')
    .select(
      `
      *, 
      author:users!author_id(id, full_name, username, avatar_url, bio), 
      collective:collectives!collective_id(id, name, slug)
    `,
    )
    .eq(isUUID ? 'id' : 'slug', slugOrId)
    .maybeSingle();

  if (postError) {
    console.error('Database error fetching post:', postError);
    throw new Error(postError.message);
  }

  if (!postData) {
    throw new Error('404');
  }

  // Use the actual post ID for all subsequent queries
  const postId = postData.id;

  // Prepare parallel queries
  const queries = [
    supabase
      .from('post_reactions')
      .select('*', { count: 'exact', head: true })
      .eq('post_id', postId)
      .eq('type', 'like'),
    supabase
      .from('post_reactions')
      .select('*', { count: 'exact', head: true })
      .eq('post_id', postId)
      .eq('type', 'dislike'),
  ];

  // If this is a video post, fetch video asset data
  let videoAssetPromise = null;
  if (postData.post_type === 'video' && postData.video_id) {
    videoAssetPromise = supabase
      .from('video_assets')
      .select('id, mux_playback_id, status, duration, is_public')
      .eq('id', postData.video_id)
      .single();
  }

  // Execute reaction count queries
  const [likeResult, dislikeResult] = await Promise.all(queries);
  const likeCount = likeResult?.count ?? 0;
  const dislikeCount = dislikeResult?.count ?? 0;

  let reactionData = undefined;
  let bookmarkData = undefined;
  let videoAssetData = null;

  // If we have a viewer, fetch their specific reaction and bookmark data
  if (viewerId) {
    const [{ data: userReaction }, { data: userBookmark }] = await Promise.all([
      supabase
        .from('post_reactions')
        .select('type')
        .eq('post_id', postId)
        .eq('user_id', viewerId)
        .maybeSingle(),
      supabase
        .from('post_bookmarks')
        .select('post_id')
        .eq('post_id', postId)
        .eq('user_id', viewerId)
        .maybeSingle(),
    ]);

    reactionData = userReaction;
    bookmarkData = userBookmark;
  }

  // Fetch video asset data if this is a video post
  if (videoAssetPromise) {
    const { data: videoAsset } = await videoAssetPromise;
    videoAssetData = videoAsset;
  }

  // Determine viewer permissions
  const isOwner = Boolean(viewerId && viewerId === postData.author_id);
  const isPublished = Boolean(
    postData.is_public &&
      postData.published_at !== null &&
      postData.published_at !== undefined &&
      new Date(postData.published_at) <= new Date(),
  );

  // Enforce access control
  if (!isPublished && !isOwner) {
    throw new Error('403');
  }

  const viewer: PostViewer = {
    isOwner,
    isPublished,
    canReact: Boolean(viewerId),
    canEdit: isOwner,
    canViewPrivate: isOwner || isPublished,
    ...(reactionData?.type ? { userReaction: reactionData.type } : {}),
    isBookmarked: Boolean(bookmarkData),
  };

  const post: PostWithAuthorAndCollective = {
    ...postData,
    ...(reactionData
      ? { user_reaction: { reaction_type: reactionData.type } }
      : {}),
    ...(bookmarkData ? { user_bookmark: { id: bookmarkData.post_id } } : {}),
    ...(videoAssetData ? { video_asset: videoAssetData } : {}),
    real_like_count: likeCount ?? 0,
    real_dislike_count: dislikeCount ?? 0,
  };

  return {
    post,
    viewer,
  };
}

// Helper function for formatting dates
export function formatPostDate(dateString: string | null): string {
  if (!dateString) return 'Date not available';

  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return 'just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  if (diffInSeconds < 604800)
    return `${Math.floor(diffInSeconds / 86400)}d ago`;

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });
}
