'use client';

import React, { useState } from 'react';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useUser } from '@/hooks/useUser';

interface CommentFormProps {
  onSubmit: (content: string) => void;
  placeholder?: string;
  buttonText?: string;
  loading?: boolean;
  className?: string;
}

export const CommentForm: React.FC<CommentFormProps> = ({
  onSubmit,
  placeholder = 'Add a comment...',
  buttonText = 'Comment',
  loading = false,
  className = '',
}) => {
  const [content, setContent] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const { user } = useUser();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!content.trim()) return;

    onSubmit(content.trim());
    setContent('');
    setIsExpanded(false);
  };

  const handleFocus = () => {
    setIsExpanded(true);
  };

  const handleCancel = () => {
    setContent('');
    setIsExpanded(false);
  };

  // Extract user info from user_metadata or email
  const userDisplayName =
    user?.user_metadata?.full_name || user?.email || 'User';
  const userAvatarUrl = user?.user_metadata?.avatar_url || '';
  const userInitials = userDisplayName
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <form onSubmit={handleSubmit} className={`space-y-3 ${className}`}>
      <div className="flex gap-3">
        <Avatar className="h-8 w-8 flex-shrink-0">
          <AvatarImage src={userAvatarUrl} />
          <AvatarFallback className="text-xs">{userInitials}</AvatarFallback>
        </Avatar>

        <div className="flex-1 space-y-3">
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onFocus={handleFocus}
            placeholder={placeholder}
            className="min-h-[60px] resize-none border-input focus:border-accent transition-colors"
            disabled={loading}
          />

          {isExpanded && (
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleCancel}
                disabled={loading}
                className="text-muted-foreground hover:text-foreground"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={!content.trim() || loading}
                className="bg-accent hover:bg-accent/90 text-accent-foreground"
              >
                {loading ? 'Posting...' : buttonText}
              </Button>
            </div>
          )}
        </div>
      </div>
    </form>
  );
};
