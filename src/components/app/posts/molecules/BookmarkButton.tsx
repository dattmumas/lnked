'use client';

import { Bookmark, BookmarkCheck } from 'lucide-react';
import { useState, useTransition } from 'react';

import { Button } from '@/components/ui/button';

interface BookmarkButtonProps {
  postId: string;
  initialBookmarked: boolean;
  disabled?: boolean;
}

export default function BookmarkButton({
  postId,
  initialBookmarked,
  disabled = false,
}: BookmarkButtonProps) {
  const [isPending, startTransition] = useTransition();
  const [bookmarked, setBookmarked] = useState(initialBookmarked);

  const handleToggle = () => {
    if (disabled || isPending) return;
    const prevBookmarked = bookmarked;
    setBookmarked(!bookmarked);
    startTransition(async () => {
      const res = await fetch(`/api/posts/${postId}/bookmark`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (res.ok) {
        const data = await res.json();
        setBookmarked(Boolean(data.bookmarked));
      } else {
        setBookmarked(prevBookmarked);
      }
    });
  };

  return (
    <Button
      variant={bookmarked ? 'default' : 'ghost'}
      size="icon"
      aria-label={bookmarked ? 'Remove bookmark' : 'Bookmark post'}
      onClick={handleToggle}
      disabled={disabled || isPending}
      className="rounded-full"
    >
      {bookmarked ? (
        <BookmarkCheck className="text-accent" />
      ) : (
        <Bookmark className="text-muted-foreground" />
      )}
    </Button>
  );
}
