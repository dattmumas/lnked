import Image from 'next/image';
import Link from 'next/link';
import React from 'react';

import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

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
  commentCount: number;
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
}

// Type for Lexical node structure
interface LexicalNode {
  type?: string;
  text?: string;
  children?: LexicalNode[];
}

// Type for Lexical document structure
interface LexicalData {
  root?: {
    children?: LexicalNode[];
  };
}

// Utility function to extract text from Lexical JSON or plain text
const extractTextFromContent = (
  content: string | null,
  maxLength = DEFAULT_EXCERPT_LENGTH,
): string => {
  if (content === undefined || content === null || content.length === 0)
    return '';

  try {
    // Try to parse as Lexical JSON
    const parsedData = JSON.parse(content) as unknown;

    // Type guard to check if it's a valid LexicalData structure
    const isLexicalData = (data: unknown): data is LexicalData => {
      return typeof data === 'object' && data !== null && 'root' in data;
    };

    if (
      isLexicalData(parsedData) &&
      parsedData.root !== undefined &&
      parsedData.root !== null &&
      parsedData.root.children !== undefined &&
      parsedData.root.children !== null
    ) {
      const extractText = (node: LexicalNode): string => {
        if (
          node.type === 'text' &&
          node.text !== undefined &&
          node.text !== null
        ) {
          return node.text;
        }
        if (node.children !== undefined && node.children !== null) {
          return node.children.map(extractText).join('');
        }
        return '';
      };

      const fullText = parsedData.root.children.map(extractText).join(' ');
      return fullText.length <= maxLength
        ? fullText
        : `${fullText.substring(0, maxLength)}...`;
    }
  } catch {
    // If not valid JSON, treat as plain text
    return content.length <= maxLength
      ? content
      : `${content.substring(0, maxLength)}...`;
  }

  return '';
};

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
}: ArticleCardProps): React.ReactElement {
  const postUrl =
    post.slug !== undefined && post.slug !== null && post.slug.length > 0
      ? `/posts/${post.slug}`
      : `/posts/${post.id}`;

  // Use meta_description if available, otherwise extract from content
  const excerpt =
    post.meta_description !== undefined &&
    post.meta_description !== null &&
    post.meta_description.length > 0
      ? post.meta_description
      : extractTextFromContent(
          post.content !== undefined && post.content !== null
            ? post.content
            : null,
        );

  return (
    <Card
      className={cn(
        'overflow-hidden border border-border drop-shadow-sm hover:shadow-lg transition-all duration-200 hover:ring-2 hover:ring-primary/20 hover:scale-[1.02]',
        className,
      )}
    >
      <CardContent className="p-6">
        <PostCardHeader
          author={post.author}
          timestamp={post.created_at}
          {...(post.collective ? { collective: post.collective } : {})}
          showFollowButton={showFollowButton}
          {...(currentUserId ? { currentUserId } : {})}
          {...(onFollow ? { onFollow } : {})}
          isFollowing={isFollowing}
        />

        {/* Thumbnail (if available) */}
        {post.thumbnail_url !== undefined &&
          post.thumbnail_url !== null &&
          post.thumbnail_url.length > 0 && (
            <Link href={postUrl} className="block mb-4">
              <div className="relative aspect-video overflow-hidden rounded-lg bg-muted group">
                <Image
                  src={post.thumbnail_url}
                  alt={post.title}
                  width={800}
                  height={450}
                  priority
                  className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
                />
              </div>
            </Link>
          )}

        {/* Content */}
        <Link href={postUrl} className="group block">
          <h2 className="text-xl font-semibold mb-3 group-hover:text-accent transition-colors line-clamp-2">
            {post.title}
          </h2>

          {excerpt !== undefined && excerpt !== null && excerpt.length > 0 && (
            <p className="text-sm text-muted-foreground mb-4 line-clamp-3 leading-relaxed">
              {excerpt}
            </p>
          )}

          <div className="text-sm font-medium text-accent hover:underline">
            Read more →
          </div>
        </Link>

        <PostCardFooter
          postId={post.id}
          {...(post.slug !== undefined &&
          post.slug !== null &&
          post.slug.length > 0
            ? { postSlug: post.slug }
            : {})}
          postTitle={post.title}
          interactions={interactions}
          {...(onToggleLike ? { onToggleLike } : {})}
          {...(onToggleDislike ? { onToggleDislike } : {})}
          {...(onToggleBookmark ? { onToggleBookmark } : {})}
          showViewCount
        />
      </CardContent>
    </Card>
  );
}
