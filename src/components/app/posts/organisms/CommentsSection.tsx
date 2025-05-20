"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ThumbsUp, ThumbsDown, MessageCircle, Loader2 } from "lucide-react";

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
  postId: string;
  currentUserId: string | null;
}

export default function CommentsSection({
  postId,
  currentUserId,
}: CommentsSectionProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newComment, setNewComment] = useState("");
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    fetch(`/api/posts/${postId}/comments`)
      .then((res) => res.json())
      .then((data) => setComments(data.comments || []))
      .finally(() => setIsLoading(false));
  }, [postId]);

  const handlePost = async (parent_id?: string) => {
    if (!newComment.trim()) return;
    setPosting(true);
    const res = await fetch(`/api/posts/${postId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: newComment, parent_id }),
    });
    if (res.ok) {
      const { comment } = await res.json();
      setComments((prev) => [...prev, comment]);
      setNewComment("");
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
  const topLevel = comments.filter((c) => !c.parent_id);

  function CommentItem({ comment }: { comment: Comment }) {
    const [likeCount, setLikeCount] = useState(comment.like_count || 0);
    const [dislikeCount, setDislikeCount] = useState(
      comment.dislike_count || 0
    );
    const [userReaction, setUserReaction] = useState<"like" | "dislike" | null>(
      null
    );
    const handleReact = (type: "like" | "dislike") => {
      if (!currentUserId) return;
      const prevReaction = userReaction;
      let newLike = likeCount,
        newDislike = dislikeCount;
      if (type === "like") {
        if (userReaction === "like") {
          newLike -= 1;
          setUserReaction(null);
        } else {
          newLike += 1;
          if (userReaction === "dislike") newDislike -= 1;
          setUserReaction("like");
        }
      } else {
        if (userReaction === "dislike") {
          newDislike -= 1;
          setUserReaction(null);
        } else {
          newDislike += 1;
          if (userReaction === "like") newLike -= 1;
          setUserReaction("dislike");
        }
      }
      setLikeCount(newLike);
      setDislikeCount(newDislike);
      fetch(`/api/comments/${comment.id}/reactions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
    return (
      <div className="mb-4">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm">
            {comment.user_full_name || "User"}
          </span>
          <span className="text-xs text-muted-foreground">
            {new Date(comment.created_at).toLocaleString()}
          </span>
        </div>
        <div className="ml-2 text-sm">{comment.content}</div>
        <div className="flex items-center gap-2 ml-2 mt-1">
          <Button
            variant={userReaction === "like" ? "default" : "ghost"}
            size="icon"
            aria-label={
              userReaction === "like" ? "Unlike comment" : "Like comment"
            }
            onClick={() => handleReact("like")}
            disabled={!currentUserId}
            className="rounded-full"
          >
            <ThumbsUp
              className={
                userReaction === "like"
                  ? "text-primary"
                  : "text-muted-foreground"
              }
            />
          </Button>
          <span className="text-xs tabular-nums w-4 text-center">
            {likeCount}
          </span>
          <Button
            variant={userReaction === "dislike" ? "destructive" : "ghost"}
            size="icon"
            aria-label={
              userReaction === "dislike" ? "Remove dislike" : "Dislike comment"
            }
            onClick={() => handleReact("dislike")}
            disabled={!currentUserId}
            className="rounded-full"
          >
            <ThumbsDown
              className={
                userReaction === "dislike"
                  ? "text-destructive"
                  : "text-muted-foreground"
              }
            />
          </Button>
          <span className="text-xs tabular-nums w-4 text-center">
            {dislikeCount}
          </span>
          {currentUserId && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setReplyTo(comment.id)}
              className="px-2"
            >
              <MessageCircle className="w-4 h-4 mr-1" /> Reply
            </Button>
          )}
        </div>
        {/* Replies */}
        {repliesByParent[comment.id]?.length > 0 && (
          <div className="ml-6 mt-2 border-l-2 border-muted pl-4">
            {repliesByParent[comment.id].map((child) => (
              <CommentItem key={child.id} comment={child} />
            ))}
          </div>
        )}
        {/* Reply form */}
        {replyTo === comment.id && (
          <div className="ml-6 mt-2">
            <Textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Write a reply..."
              className="mb-2"
              rows={2}
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={() => handlePost(comment.id)}
                disabled={posting}
              >
                {posting && (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                )}
                {posting ? 'Posting…' : 'Post'}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setReplyTo(null)}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <section className="mt-10">
      <h3 className="text-lg font-bold mb-4">Comments</h3>
      {isLoading ? (
        <div className="text-muted-foreground flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Loading comments…</span>
        </div>
      ) : (
        <div>
          {topLevel.length === 0 && (
            <div className="text-muted-foreground">No comments yet.</div>
          )}
          {topLevel.map((comment) => (
            <CommentItem key={comment.id} comment={comment} />
          ))}
        </div>
      )}
      {currentUserId && (
        <div className="mt-6">
          <Textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Write a comment..."
            className="mb-2"
            rows={3}
          />
          <Button onClick={() => handlePost()} disabled={posting}>
            {posting && (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            )}
            {posting ? 'Posting…' : 'Post Comment'}
          </Button>
        </div>
      )}
      {!currentUserId && (
        <div className="mt-6 text-muted-foreground text-sm">
          Sign in to comment.
        </div>
      )}
    </section>
  );
}
