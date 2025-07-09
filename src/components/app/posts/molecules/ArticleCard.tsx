import parse from 'html-react-parser';
import DOMPurify from 'isomorphic-dompurify';
import { Maximize2 } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import React, { useMemo } from 'react';

import { Button } from '@/components/primitives/Button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { transformImageUrls } from '@/lib/utils/transform-image-urls';

import PostCardFooter from './PostCardFooter';
import PostCardHeader from './PostCardHeader';

// Constants
const DEFAULT_EXCERPT_LENGTH = 150;

interface Author {
  id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
}

interface Collective {
  id: string;
  name: string;
  slug: string;
}

interface PostInteractions {
  isLiked: boolean;
  isDisliked: boolean;
  isBookmarked: boolean;
  likeCount: number;
  dislikeCount: number;
  viewCount?: number;
}

interface ArticlePost {
  id: string;
  title: string;
  content?: string | null;
  meta_description?: string | null;
  thumbnail_url?: string | null;
  slug?: string | null;
  created_at: string;
  author: Author;
  collective?: Collective | null;
}

interface ArticleCardProps {
  post: ArticlePost;
  interactions: PostInteractions;
  onToggleLike?: () => void;
  onToggleDislike?: () => void;
  onToggleBookmark?: () => void;
  onFollow?: () => void;
  isFollowing?: boolean;
  currentUserId?: string;
  showFollowButton?: boolean;
  className?: string;
  priority?: boolean;
}

// Utility function to extract text from content for plain text excerpt
function getPlainTextExcerpt(content: string | undefined | null): string {
  if (!content) {
    return '';
  }

  // Remove HTML tags and truncate
  const plainText = content.replace(/<[^>]*>/g, '');
  return plainText.length > 200
    ? `${plainText.substring(0, 200)}...`
    : plainText;
}

// Utility function to truncate HTML content while preserving some formatting
function getTruncatedHtmlContent(
  content: string,
  maxLength: number = 300,
): string {
  if (!content) return '';

  // For HTML content, we'll truncate more conservatively to avoid breaking tags
  if (content.length <= maxLength) return content;

  // Find a good breaking point (end of sentence or paragraph)
  const truncated = content.substring(0, maxLength);
  const lastSentence = truncated.lastIndexOf('.');
  const lastParagraph = truncated.lastIndexOf('</p>');

  if (lastParagraph > lastSentence && lastParagraph > maxLength * 0.6) {
    return content.substring(0, lastParagraph + 4); // Include the </p>
  } else if (lastSentence > maxLength * 0.6) {
    return content.substring(0, lastSentence + 1);
  } else {
    return `${truncated}...`;
  }
}

export default function ArticleCard({
  post,
  interactions,
  onToggleLike,
  onToggleDislike,
  onToggleBookmark,
  onFollow,
  isFollowing = false,
  currentUserId,
  showFollowButton = false,
  className,
  priority = false,
}: ArticleCardProps): React.ReactElement {
  const router = useRouter();
  const search = useSearchParams();

  const postUrl =
    post.slug !== undefined && post.slug !== null && post.slug.length > 0
      ? `/posts/${post.slug}`
      : `/posts/${post.id}`;

  // Process content for display
  const hasHtmlContent =
    post.content?.includes('<') && post.content?.includes('>');
  const excerpt =
    post.meta_description ?? getPlainTextExcerpt(post.content ?? null);

  // Sanitize and prepare content for rich display if it contains HTML
  const sanitizedHtml = useMemo(() => {
    if (!post.content || !hasHtmlContent) return null;
    return DOMPurify.sanitize(
      transformImageUrls(getTruncatedHtmlContent(post.content)),
      { USE_PROFILES: { html: true } },
    );
  }, [post.content, hasHtmlContent]);

  function openOverlay() {
    const params = new URLSearchParams(search);
    params.set('post', post.id);
    router.push(`?${params.toString()}`, { scroll: false });
  }

  return (
    <Card
      className={cn(
        // Modern card styling matching ChainCard exactly
        'overflow-hidden rounded-3xl bg-white/[0.02] backdrop-blur-xl',
        'border border-white/[0.08] dark:border-white/[0.06]',
        'shadow-sm hover:shadow-md',
        'transition-all duration-200 ease-out',
        'mx-4 mb-6',
        className,
      )}
    >
      <div className="p-6 pb-4">
        <PostCardHeader
          author={post.author}
          timestamp={post.created_at}
          {...(post.collective ? { collective: post.collective } : {})}
          showFollowButton={showFollowButton}
          {...(currentUserId ? { currentUserId } : {})}
          {...(onFollow ? { onFollow } : {})}
        />

        {/* Title */}
        <div className="flex items-start justify-between gap-2 mt-4">
          <h2 className="text-xl font-bold leading-snug flex-1 min-w-0">
            <Link href={postUrl} className="hover:underline">
              {post.title}
            </Link>
          </h2>
          <Button
            size="icon"
            variant="ghost"
            onClick={openOverlay}
            aria-label="Open overlay"
            className="flex-shrink-0"
          >
            <Maximize2 className="h-4 w-4" />
          </Button>
        </div>

        {post.thumbnail_url && (
          <Link href={postUrl} className="mt-4 block">
            <div className="relative aspect-video w-full overflow-hidden rounded-2xl bg-muted">
              <Image
                src={post.thumbnail_url}
                alt={post.title}
                fill
                priority={priority}
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                className="object-cover transition-transform duration-300 group-hover:scale-105"
                placeholder="blur"
                blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k="
              />
            </div>
          </Link>
        )}

        {(excerpt || sanitizedHtml) && (
          <div className="mt-4">
            {hasHtmlContent && sanitizedHtml ? (
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <div className="text-sm leading-relaxed text-foreground/90 line-clamp-3">
                  {parse(sanitizedHtml)}
                </div>
              </div>
            ) : excerpt ? (
              <p className="text-sm leading-relaxed text-muted-foreground line-clamp-3">
                {excerpt}
              </p>
            ) : null}
          </div>
        )}
      </div>

      <PostCardFooter
        postId={post.id}
        postSlug={post.slug ?? null}
        postTitle={post.title}
        interactions={interactions}
        {...(onToggleLike ? { onToggleLike } : {})}
        {...(onToggleDislike ? { onToggleDislike } : {})}
        {...(onToggleBookmark ? { onToggleBookmark } : {})}
        showViewCount
      />
    </Card>
  );
}
