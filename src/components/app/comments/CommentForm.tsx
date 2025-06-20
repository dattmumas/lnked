'use client';

import React, { useCallback, useState } from 'react';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useUser } from '@/hooks/useUser';

// Constants
const MAX_INITIALS_LENGTH = 2;

// Type definitions for user metadata
interface UserMetadata {
  full_name?: string;
  avatar_url?: string;
  [key: string]: unknown;
}

interface AuthUser {
  email?: string;
  user_metadata?: UserMetadata;
  [key: string]: unknown;
}

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
}): React.ReactElement => {
  const [content, setContent] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const { user } = useUser();

  const handleSubmit = useCallback(
    (e: React.FormEvent): void => {
      e.preventDefault();

      if (content.trim().length === 0) return;

      onSubmit(content.trim());
      setContent('');
      setIsExpanded(false);
    },
    [content, onSubmit],
  );

  const handleFocus = useCallback((): void => {
    setIsExpanded(true);
  }, []);

  const handleCancel = useCallback((): void => {
    setContent('');
    setIsExpanded(false);
  }, []);

  const handleContentChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>): void => {
      setContent(e.target.value);
    },
    [],
  );

  const handleFormSubmit = useCallback(
    (e: React.FormEvent): void => {
      void handleSubmit(e);
    },
    [handleSubmit],
  );

  // Safely extract user info with proper typing
  const authUser = user as unknown as AuthUser | undefined;
  const userMetadata = authUser?.user_metadata;
  const fullName = userMetadata?.full_name ?? undefined;
  const email = authUser?.email ?? undefined;
  const avatarUrl = userMetadata?.avatar_url ?? undefined;

  const userDisplayName =
    // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
    (fullName !== undefined && fullName !== null && fullName.length > 0
      ? fullName
      : undefined) ||
    // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
    (email !== undefined && email !== null && email.length > 0
      ? email
      : undefined) ||
    'User';

  const userAvatarUrl =
    avatarUrl !== undefined && avatarUrl !== null && avatarUrl.length > 0
      ? avatarUrl
      : '';

  const userInitials = userDisplayName
    .split(' ')
    .map((n: string) => n.charAt(0))
    .join('')
    .toUpperCase()
    .slice(0, MAX_INITIALS_LENGTH);

  return (
    <form onSubmit={handleFormSubmit} className={`space-y-3 ${className}`}>
      <div className="flex gap-3">
        <Avatar className="h-8 w-8 flex-shrink-0">
          <AvatarImage src={userAvatarUrl} />
          <AvatarFallback className="text-xs">{userInitials}</AvatarFallback>
        </Avatar>

        <div className="flex-1 space-y-3">
          <Textarea
            value={content}
            onChange={handleContentChange}
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
                disabled={content.trim().length === 0 || loading}
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
