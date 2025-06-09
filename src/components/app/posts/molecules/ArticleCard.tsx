'use client';

import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import PostCardHeader from './PostCardHeader';
import PostCardFooter from './PostCardFooter';
import { cn } from '@/lib/utils';

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

// Utility function to extract text from Lexical JSON or plain text
const extractTextFromContent = (
  content: string | null,
  maxLength = 150,
): string => {
  if (!content) return '';

  try {
    // Try to parse as Lexical JSON
    const lexicalData = JSON.parse(content);
    if (lexicalData.root && lexicalData.root.children) {
      const extractText = (node: any): string => {
        if (node.type === 'text') {
          return node.text || '';
        }
        if (node.children) {
          return node.children.map(extractText).join('');
        }
        return '';
      };

      const fullText = lexicalData.root.children.map(extractText).join(' ');
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
}: ArticleCardProps) {
  const postUrl = post.slug ? `/posts/${post.slug}` : `/posts/${post.id}`;

  // Use meta_description if available, otherwise extract from content
  const excerpt =
    post.meta_description || extractTextFromContent(post.content || null);

  return (
    <Card
      className={cn(
        'overflow-hidden hover:shadow-lg transition-all duration-200 hover:ring-2 hover:ring-primary/20 hover:scale-[1.02]',
        className,
      )}
    >
      <CardContent className="p-6">
        <PostCardHeader
          author={post.author}
          timestamp={post.created_at}
          collective={post.collective}
          showFollowButton={showFollowButton}
          currentUserId={currentUserId}
          onFollow={onFollow}
          isFollowing={isFollowing}
        />

        {/* Thumbnail (if available) */}
        {post.thumbnail_url && (
          <Link href={postUrl} className="block mb-4">
            <div className="relative aspect-video overflow-hidden rounded-lg bg-muted group">
              <img
                src={post.thumbnail_url}
                alt={`Cover image for ${post.title}`}
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

          {excerpt && (
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
          postSlug={post.slug || undefined}
          postTitle={post.title}
          interactions={interactions}
          onToggleLike={onToggleLike}
          onToggleDislike={onToggleDislike}
          onToggleBookmark={onToggleBookmark}
          showViewCount={true}
        />
      </CardContent>
    </Card>
  );
}
