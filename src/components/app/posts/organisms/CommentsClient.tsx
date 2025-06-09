'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { MessageCircle } from 'lucide-react';
import CommentForm from './CommentForm';
import { createSupabaseBrowserClient } from '@/lib/supabase/browser';

interface CommentsClientProps {
  postId: string;
  currentUserId: string | null;
  postSlug?: string;
}

export default function CommentsClient({
  postId,
  currentUserId,
  postSlug,
}: CommentsClientProps) {
  const router = useRouter();
  const [newComment, setNewComment] = useState('');
  const [posting, setPosting] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handlePost = async () => {
    if (!newComment.trim()) return;
    setPosting(true);

    try {
      const res = await fetch(`/api/posts/${postId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newComment }),
      });

      if (res.ok) {
        setNewComment('');
        // Small delay to ensure comment is saved before refreshing
        setTimeout(() => {
          router.refresh();
        }, 100);
      } else {
        console.error('Failed to post comment:', res.statusText);
      }
    } catch (error) {
      console.error('Failed to post comment:', error);
    } finally {
      setPosting(false);
    }
  };

  if (!mounted) {
    return null; // Avoid hydration issues
  }

  return (
    <div className="mt-6">
      {/* Sorting controls */}
      <div className="flex items-center gap-2 mb-6">
        <Button variant="default" size="sm" className="h-8 text-sm">
          Newest first
        </Button>
        <Button variant="ghost" size="sm" className="h-8 text-sm">
          Top comments
        </Button>
      </div>

      {/* Comment form for authenticated users */}
      {currentUserId ? (
        <Card className="p-4 mb-6">
          <CommentForm
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            onSubmit={(e) => {
              e.preventDefault();
              handlePost();
            }}
            loading={posting}
            placeholder="Add a comment..."
            buttonText="Comment"
          />
        </Card>
      ) : (
        <Card className="p-4 mb-6 bg-accent/20">
          <div className="text-center text-muted-foreground">
            <MessageCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Sign in to join the conversation</p>
          </div>
        </Card>
      )}
    </div>
  );
}
