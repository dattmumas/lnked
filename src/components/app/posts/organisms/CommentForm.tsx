import { Loader2 } from 'lucide-react';
import React from 'react';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

// Constants for magic numbers
const REPLY_TEXTAREA_ROWS = 2;
const COMMENT_TEXTAREA_ROWS = 3;

interface CommentFormProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onSubmit: (e: React.FormEvent) => void;
  loading?: boolean;
  disabled?: boolean;
  placeholder?: string;
  buttonText?: string;
  avatarFallback?: string;
  onCancel?: () => void;
  isReply?: boolean;
}

export default function CommentForm({
  value,
  onChange,
  onSubmit,
  loading = false,
  disabled = false,
  placeholder = 'Add a comment...',
  buttonText = 'Comment',
  avatarFallback = 'Me',
  onCancel,
  isReply = false,
}: CommentFormProps): React.ReactElement {
  return (
    <form onSubmit={onSubmit} className={isReply ? '' : 'flex gap-3'}>
      <Avatar
        className={isReply ? 'w-6 h-6 flex-shrink-0' : 'w-8 h-8 flex-shrink-0'}
      >
        <AvatarFallback className="bg-gradient-to-br from-green-500 to-blue-600 text-white text-sm">
          {avatarFallback}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1">
        <Textarea
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className={
            isReply
              ? 'min-h-[60px] border-0 bg-transparent resize-none focus-visible:ring-1 text-sm'
              : 'border-0 bg-transparent resize-none focus-visible:ring-1 text-sm min-h-[80px]'
          }
          rows={isReply ? REPLY_TEXTAREA_ROWS : COMMENT_TEXTAREA_ROWS}
          disabled={disabled || loading}
        />
        <div className="flex gap-2 justify-end mt-3 pt-3 border-t">
          {onCancel && (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={onCancel}
              className="h-8 text-muted-foreground hover:text-foreground"
              disabled={loading}
            >
              Cancel
            </Button>
          )}
          <Button
            type="submit"
            size="sm"
            disabled={loading || disabled || !value.trim()}
            className={
              isReply
                ? 'h-8 bg-blue-600 hover:bg-blue-700 text-white'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            {loading ? (isReply ? 'Posting...' : 'Commenting...') : buttonText}
          </Button>
        </div>
      </div>
    </form>
  );
}
