'use client';

import dynamic from 'next/dynamic';

import BookmarkButton from '@/components/app/posts/molecules/BookmarkButton';
import PostContentRenderer from '@/components/app/posts/molecules/PostContentRenderer';
import PostReactionButtons from '@/components/app/posts/molecules/PostReactionButtons';
import PostViewTracker from '@/components/app/posts/molecules/PostViewTracker';
import { formatPostDate } from '@/lib/posts';

// Dynamically import MuxVideoPlayer to avoid SSR issues
const MuxVideoPlayerEnhanced = dynamic(
  () => import('@/components/app/video/MuxVideoPlayerEnhanced'),
  {
    ssr: false,
    loading: () => (
      <div className="aspect-video bg-black rounded-lg animate-pulse flex items-center justify-center">
        <div className="text-white">Loading video...</div>
      </div>
    ),
  },
);

import type {
  PostWithAuthorAndCollective,
  PostViewer as PostViewerType,
} from '@/lib/posts';

interface Props {
  post: PostWithAuthorAndCollective;
  viewer: PostViewerType;
  viewModel: {
    readingTime: string;
    authorInitials: string;
    formattedViewCount: string;
    hasAuthor: boolean;
    hasCollective: boolean;
    isPublished: boolean;
  };
}

// Overlay variant drops the internal navbar/header; rest identical to PostViewer
export default function OverlayPostViewer({ post, viewer, viewModel }: Props) {
  const authorName = post.author?.full_name || 'Anonymous';
  const authorUsername = post.author?.username || post.author?.id || 'unknown';

  const initialLikeCount = post.real_like_count ?? 0;
  const initialDislikeCount = post.real_dislike_count ?? 0;
  const initialUserReaction =
    (viewer.userReaction as 'like' | 'dislike' | null) ?? null;
  const initialBookmarked = viewer.isBookmarked;

  return (
    <>
      <PostViewTracker postId={post.id} />

      {/* Main Content without sticky header */}
      <article className="min-h-screen bg-background">
        <div
          className={`mx-auto px-6 py-12 ${post.post_type === 'video' ? 'max-w-6xl' : 'max-w-4xl'}`}
        >
          {/* Video Player for video posts - 90% width for maximum screen usage */}
          {post.post_type === 'video' && post.video_asset?.mux_playback_id && (
            <div className="mb-12 flex justify-center">
              <div className="w-[90%]">
                <MuxVideoPlayerEnhanced
                  playbackId={post.video_asset.mux_playback_id}
                  title={post.title || 'Video'}
                  className="w-full aspect-video rounded-lg"
                  isPrivate={post.video_asset.is_public === false}
                  videoId={post.video_asset.id}
                />
              </div>
            </div>
          )}

          {/* Thumbnail Hero for non-video posts or videos without playback ID */}
          {(post.post_type !== 'video' || !post.video_asset?.mux_playback_id) &&
            post.thumbnail_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={post.thumbnail_url}
                alt={post.title || 'Post thumbnail'}
                className="w-full h-auto mb-12 rounded-lg object-cover"
              />
            )}

          {/* Enhanced Title & Metadata Section */}
          <header className="mb-8">
            <h1 className="text-3xl md:text-4xl font-bold mb-6 text-foreground leading-tight">
              {post.title || 'Untitled Post'}
            </h1>

            {/* Metadata card with glassmorphism styling */}
            <div className="bg-white/[0.02] backdrop-blur-xl border border-white/[0.08] dark:border-white/[0.06] rounded-2xl p-6 mb-6">
              <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="font-medium">
                    {formatPostDate(post.published_at || post.created_at)}
                  </span>
                </div>
                <span className="text-white/20">•</span>
                <span>{viewModel.readingTime}</span>
                <span className="text-white/20">•</span>
                <span className="font-medium">
                  {viewModel.formattedViewCount}
                </span>
              </div>
            </div>

            {/* Enhanced Reaction Bar */}
            <div className="bg-white/[0.02] backdrop-blur-xl border border-white/[0.08] dark:border-white/[0.06] rounded-2xl p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <PostReactionButtons
                    id={post.id}
                    initialLikeCount={initialLikeCount}
                    initialDislikeCount={initialDislikeCount}
                    initialUserReaction={initialUserReaction}
                    disabled={!viewer.canReact}
                  />
                </div>
                <div className="flex items-center gap-4">
                  <BookmarkButton
                    postId={post.id}
                    initialBookmarked={initialBookmarked}
                    disabled={!viewer.canReact}
                  />
                </div>
              </div>
            </div>
          </header>

          {/* Content Section - Different styling for video vs text posts */}
          {post.post_type === 'video' ? (
            // Video posts: Enhanced glassmorphism styling for content below video
            post.content && (
              <section className="bg-white/[0.02] backdrop-blur-xl border border-white/[0.08] dark:border-white/[0.06] rounded-2xl p-8">
                <PostContentRenderer
                  content={post.content}
                  className="prose prose-lg dark:prose-invert max-w-none prose-headings:text-foreground prose-p:text-foreground/90 prose-strong:text-foreground prose-em:text-foreground/80"
                />
              </section>
            )
          ) : (
            // Text posts: Use same rendering as dedicated post pages
            <PostContentRenderer content={post.content} />
          )}
        </div>
      </article>
    </>
  );
}
