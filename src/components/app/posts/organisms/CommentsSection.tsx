'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card } from '@/components/ui/card';
import {
  ThumbsUp,
  ThumbsDown,
  MessageCircle,
  Loader2,
  MoreVertical,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface Comment {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  created_at: string;
  parent_id: string | null;
  like_count?: number;
  dislike_count?: number;
  user_full_name?: string | null;
}

interface CommentsSectionProps {
  postSlug: string;
  currentUserId: string | null;
}

const getInitials = (name: string | null | undefined) => {
  if (!name) return 'U';
  return name
    .split(' ')
    .map((word) => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

const formatTimeAgo = (dateString: string) => {
  try {
    return formatDistanceToNow(new Date(dateString), { addSuffix: true });
  } catch {
    return 'some time ago';
  }
};

export default function CommentsSection({
  postSlug,
  currentUserId,
}: CommentsSectionProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [posting, setPosting] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [sortBy, setSortBy] = useState<'newest' | 'top'>('newest');

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    fetch(`/api/posts/${postSlug}/comments`)
      .then((res) => res.json())
      .then((data) => setComments(data.comments || []))
      .finally(() => setIsLoading(false));
  }, [postSlug]);

  const handlePost = async (parent_id?: string) => {
    if (!newComment.trim()) return;
    setPosting(true);
    const res = await fetch(`/api/posts/${postSlug}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: newComment, parent_id }),
    });
    if (res.ok) {
      const { comment } = await res.json();
      setComments((prev) => [...prev, comment]);
      setNewComment('');
      setReplyTo(null);
    }
    setPosting(false);
  };

  // Build a map of parent_id to children for nesting
  const repliesByParent: Record<string, Comment[]> = {};
  comments.forEach((c) => {
    if (c.parent_id) {
      if (!repliesByParent[c.parent_id]) repliesByParent[c.parent_id] = [];
      repliesByParent[c.parent_id].push(c);
    }
  });

  // Sort top-level comments
  const topLevel = comments
    .filter((c) => !c.parent_id)
    .sort((a, b) => {
      if (sortBy === 'top') {
        return (b.like_count || 0) - (a.like_count || 0);
      }
      return (
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    });

  function CommentItem({
    comment,
    isReply = false,
  }: {
    comment: Comment;
    isReply?: boolean;
  }) {
    const [likeCount, setLikeCount] = useState(comment.like_count || 0);
    const [dislikeCount, setDislikeCount] = useState(
      comment.dislike_count || 0,
    );
    const [userReaction, setUserReaction] = useState<'like' | 'dislike' | null>(
      null,
    );
    const [showReplies, setShowReplies] = useState(true);

    const handleReact = (type: 'like' | 'dislike') => {
      if (!mounted || !currentUserId) return;
      const prevReaction = userReaction;
      let newLike = likeCount,
        newDislike = dislikeCount;

      if (type === 'like') {
        if (userReaction === 'like') {
          newLike -= 1;
          setUserReaction(null);
        } else {
          newLike += 1;
          if (userReaction === 'dislike') newDislike -= 1;
          setUserReaction('like');
        }
      } else {
        if (userReaction === 'dislike') {
          newDislike -= 1;
          setUserReaction(null);
        } else {
          newDislike += 1;
          if (userReaction === 'like') newLike -= 1;
          setUserReaction('dislike');
        }
      }

      setLikeCount(newLike);
      setDislikeCount(newDislike);

      fetch(`/api/comments/${comment.id}/reactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type }),
      })
        .then((res) => res.json())
        .then((data) => {
          setLikeCount(data.likeCount ?? 0);
          setDislikeCount(data.dislikeCount ?? 0);
          setUserReaction(data.userReaction);
        })
        .catch(() => {
          setLikeCount(likeCount);
          setDislikeCount(dislikeCount);
          setUserReaction(prevReaction);
        });
    };

    const replies = repliesByParent[comment.id] || [];

    return (
      <div className={`flex gap-3 ${isReply ? 'py-2' : 'py-4'} group`}>
        <Avatar className={`${isReply ? 'w-6 h-6' : 'w-8 h-8'} flex-shrink-0`}>
          <AvatarImage src="" alt={comment.user_full_name || 'User'} />
          <AvatarFallback className="text-xs font-medium bg-gradient-to-br from-blue-500 to-purple-600 text-white">
            {getInitials(comment.user_full_name)}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-medium text-sm text-foreground">
              {comment.user_full_name || 'User'}
            </span>
            <span className="text-xs text-muted-foreground">
              {formatTimeAgo(comment.created_at)}
            </span>
          </div>

          <div className="text-sm text-foreground leading-relaxed mb-2">
            {comment.content}
          </div>

          <div className="flex items-center gap-1 -ml-2">
            <Button
              variant="ghost"
              size="sm"
              className={`h-8 px-2 rounded-full transition-all duration-200 hover:bg-accent/50 ${
                userReaction === 'like'
                  ? 'text-blue-600 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-900/30'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              onClick={() => handleReact('like')}
              disabled={!mounted || !currentUserId}
            >
              <ThumbsUp className="w-4 h-4 mr-1" />
              {likeCount > 0 && <span className="text-xs">{likeCount}</span>}
            </Button>

            <Button
              variant="ghost"
              size="sm"
              className={`h-8 px-2 rounded-full transition-all duration-200 hover:bg-accent/50 ${
                userReaction === 'dislike'
                  ? 'text-red-600 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/30'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              onClick={() => handleReact('dislike')}
              disabled={!mounted || !currentUserId}
            >
              <ThumbsDown className="w-4 h-4" />
            </Button>

            {mounted && currentUserId && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-all duration-200"
                onClick={() =>
                  setReplyTo(replyTo === comment.id ? null : comment.id)
                }
              >
                <MessageCircle className="w-4 h-4 mr-1" />
                Reply
              </Button>
            )}

            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 rounded-full text-muted-foreground hover:text-foreground hover:bg-accent/50 opacity-0 group-hover:opacity-100 transition-all duration-200"
            >
              <MoreVertical className="w-4 h-4" />
            </Button>
          </div>

          {mounted && replyTo === comment.id && currentUserId && (
            <div className="mt-3 p-3 bg-accent/20 rounded-lg border">
              <div className="flex gap-2 mb-3">
                <Avatar className="w-6 h-6 flex-shrink-0">
                  <AvatarFallback className="text-xs bg-gradient-to-br from-green-500 to-blue-600 text-white">
                    Me
                  </AvatarFallback>
                </Avatar>
                <Textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Add a reply..."
                  className="min-h-[60px] border-0 bg-transparent resize-none focus-visible:ring-1 text-sm"
                  rows={2}
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setReplyTo(null)}
                  className="h-8 text-muted-foreground hover:text-foreground"
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={() => handlePost(comment.id)}
                  disabled={posting || !newComment.trim()}
                  className="h-8 bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {posting && <Loader2 className="h-3 w-3 animate-spin mr-1" />}
                  {posting ? 'Posting...' : 'Reply'}
                </Button>
              </div>
            </div>
          )}

          {replies.length > 0 && (
            <div className="mt-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowReplies(!showReplies)}
                className="h-7 px-2 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 mb-2 rounded-full"
              >
                <MessageCircle className="w-3 h-3 mr-1" />
                {showReplies ? 'Hide' : 'Show'} {replies.length}{' '}
                {replies.length === 1 ? 'reply' : 'replies'}
              </Button>

              {showReplies && (
                <div className="space-y-0 border-l-2 border-accent/30 pl-4 ml-2">
                  {replies.map((reply) => (
                    <CommentItem key={reply.id} comment={reply} isReply />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (!mounted || isLoading) {
    return (
      <section className="mt-8">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold">Comments</h3>
        </div>
        <Card className="p-6">
          <div className="flex items-center gap-3">
            <div className="h-5 w-5 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin"></div>
            <span>Loading comments...</span>
          </div>
        </Card>
      </section>
    );
  }

  return (
    <section className="mt-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <h3 className="text-xl font-semibold text-foreground">
            {comments.length} {comments.length === 1 ? 'Comment' : 'Comments'}
          </h3>
          <div className="flex items-center gap-2">
            <Button
              variant={sortBy === 'newest' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setSortBy('newest')}
              className="h-8 text-sm"
            >
              Newest first
            </Button>
            <Button
              variant={sortBy === 'top' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setSortBy('top')}
              className="h-8 text-sm"
            >
              Top comments
            </Button>
          </div>
        </div>
      </div>

      {currentUserId ? (
        <Card className="p-4 mb-6">
          <div className="flex gap-3">
            <Avatar className="w-8 h-8 flex-shrink-0">
              <AvatarFallback className="bg-gradient-to-br from-green-500 to-blue-600 text-white text-sm">
                Me
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <Textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Add a comment..."
                className="border-0 bg-transparent resize-none focus-visible:ring-1 text-sm min-h-[80px]"
                rows={3}
              />
              <div className="flex gap-2 justify-end mt-3 pt-3 border-t">
                <Button
                  onClick={() => handlePost()}
                  disabled={posting || !newComment.trim()}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {posting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  {posting ? 'Posting...' : 'Comment'}
                </Button>
              </div>
            </div>
          </div>
        </Card>
      ) : (
        <Card className="p-4 mb-6 bg-accent/20">
          <div className="text-center text-muted-foreground">
            <MessageCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Sign in to join the conversation</p>
          </div>
        </Card>
      )}

      <div className="space-y-0">
        {topLevel.length === 0 ? (
          <Card className="p-8 text-center">
            <MessageCircle className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-50" />
            <h4 className="font-medium text-foreground mb-1">
              No comments yet
            </h4>
            <p className="text-sm text-muted-foreground">
              Be the first to share what you think!
            </p>
          </Card>
        ) : (
          topLevel.map((comment) => (
            <div
              key={comment.id}
              className="border-b border-accent/30 last:border-b-0"
            >
              <CommentItem comment={comment} />
            </div>
          ))
        )}
      </div>
    </section>
  );
}
