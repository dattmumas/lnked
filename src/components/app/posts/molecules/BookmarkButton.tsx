'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Bookmark, BookmarkCheck } from 'lucide-react';

interface BookmarkButtonProps {
  postSlug: string;
  initialBookmarked: boolean;
  disabled?: boolean;
}

export default function BookmarkButton({
  postSlug,
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
      const res = await fetch(`/api/posts/${postSlug}/bookmark`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (res.ok) {
        const data = await res.json();
        setBookmarked(!!data.bookmarked);
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
