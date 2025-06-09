import { getCommentsByPostId, getCommentsByVideoId } from '@/lib/data/comments';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card } from '@/components/ui/card';
import { MessageCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

// Comment type based on the database schema
interface CommentWithUser {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  created_at: string | null;
  parent_id: string | null;
  user: {
    id: string;
    full_name: string | null;
    username: string | null;
    avatar_url: string | null;
  } | null;
  reactions: Array<{
    id: string;
    type: string;
    user_id: string;
  }>;
}

interface CommentsServerProps {
  postId: string;
}

function getInitials(name: string | null | undefined): string {
  if (!name) return 'U';
  return name
    .split(' ')
    .map((word) => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function formatTimeAgo(dateString: string | null): string {
  if (!dateString) return 'unknown time';
  try {
    return formatDistanceToNow(new Date(dateString), { addSuffix: true });
  } catch {
    return 'some time ago';
  }
}

function CommentItem({
  comment,
  isReply = false,
}: {
  comment: CommentWithUser;
  isReply?: boolean;
}) {
  return (
    <div className={`flex gap-3 ${isReply ? 'py-2' : 'py-4'}`}>
      <Avatar className={`${isReply ? 'w-6 h-6' : 'w-8 h-8'} flex-shrink-0`}>
        <AvatarImage
          src={comment.user?.avatar_url || ''}
          alt={comment.user?.full_name || 'User'}
        />
        <AvatarFallback className="text-xs font-medium bg-gradient-to-br from-blue-500 to-purple-600 text-white">
          {getInitials(comment.user?.full_name)}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-medium text-sm text-gray-900 dark:text-gray-100">
            {comment.user?.full_name || 'User'}
          </span>
          <span className="text-xs text-gray-600 dark:text-gray-400">
            {formatTimeAgo(comment.created_at)}
          </span>
        </div>
        <div className="text-sm text-gray-900 dark:text-gray-100 leading-relaxed">
          {comment.content}
        </div>
      </div>
    </div>
  );
}

function organizeComments(comments: CommentWithUser[]) {
  const topLevel: CommentWithUser[] = [];
  const replies: Record<string, CommentWithUser[]> = {};

  comments.forEach((comment) => {
    if (comment.parent_id) {
      if (!replies[comment.parent_id]) {
        replies[comment.parent_id] = [];
      }
      replies[comment.parent_id].push(comment);
    } else {
      topLevel.push(comment);
    }
  });

  // Sort by newest first for consistency with client behavior
  topLevel.sort((a, b) => {
    const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
    const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
    return dateB - dateA;
  });

  Object.keys(replies).forEach((parentId) => {
    replies[parentId].sort((a, b) => {
      const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
      const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
      return dateA - dateB;
    });
  });

  return { topLevel, replies };
}

export default async function CommentsServer({ postId }: CommentsServerProps) {
  let comments: CommentWithUser[] = [];
  let hasError = false;

  // Validate postId format
  if (!postId || typeof postId !== 'string') {
    hasError = true;
  } else {
    try {
      // Handle video IDs (format: video-{videoId})
      if (postId.startsWith('video-')) {
        const videoId = postId.replace('video-', '');
        comments = await getCommentsByVideoId(videoId);
      } else {
        // Handle regular post IDs
        comments = await getCommentsByPostId(postId);
      }
    } catch (error) {
      // Silent error handling for server components to prevent hydration issues
      hasError = true;
      comments = [];
    }
  }

  const { topLevel, replies } = organizeComments(comments);

  return (
    <section className="mt-8">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
          {hasError
            ? 'Comments'
            : `${comments.length} ${comments.length === 1 ? 'Comment' : 'Comments'}`}
        </h3>
      </div>

      <div className="space-y-0">
        {hasError ? (
          <Card className="p-8 text-center">
            <MessageCircle className="w-12 h-12 mx-auto mb-3 text-gray-400 opacity-50" />
            <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-1">
              Comments temporarily unavailable
            </h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Please try refreshing the page
            </p>
          </Card>
        ) : topLevel.length === 0 ? (
          <Card className="p-8 text-center">
            <MessageCircle className="w-12 h-12 mx-auto mb-3 text-gray-400 opacity-50" />
            <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-1">
              No comments yet
            </h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Be the first to share what you think!
            </p>
          </Card>
        ) : (
          topLevel.map((comment) => (
            <div
              key={comment.id}
              className="border-b border-gray-200 dark:border-gray-700 last:border-b-0"
            >
              <CommentItem comment={comment} />

              {/* Render replies */}
              {replies[comment.id] && replies[comment.id].length > 0 && (
                <div className="border-l-2 border-gray-200 dark:border-gray-700 pl-4 ml-2 space-y-0">
                  {replies[comment.id].map((reply) => (
                    <CommentItem key={reply.id} comment={reply} isReply />
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </section>
  );
}
