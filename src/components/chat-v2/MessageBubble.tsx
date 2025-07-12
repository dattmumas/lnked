'use client';

import Linkify from 'linkify-react';
import { useMemo, useState, useCallback, useRef } from 'react';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { ChatMessage } from '@/types/chat-v2';

interface MessageBubbleProps {
  message: ChatMessage;
  showAvatar?: boolean;
  isOwn?: boolean;
  isGrouped?: boolean;
}

export function MessageBubble({
  message,
  showAvatar = true,
  isOwn = false,
  isGrouped = false,
}: MessageBubbleProps): React.JSX.Element {
  const [showTimestamp, setShowTimestamp] = useState(false);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Get user initials for avatar fallback
  const userInitials = useMemo(() => {
    const name = message.sender?.full_name || message.sender?.username || 'U';
    return name
      .split(' ')
      .map((word) => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }, [message.sender]);

  // Format timestamp
  const formattedTime = useMemo(() => {
    if (!message.created_at) return '';

    const messageDate = new Date(message.created_at);
    const now = new Date();
    const diffInHours =
      (now.getTime() - messageDate.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      // Within 24 hours - show time (e.g., "2:30 pm")
      return messageDate.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
    } else {
      // Older than 24 hours - show date (e.g., "12/25")
      return messageDate.toLocaleDateString('en-US', {
        month: 'numeric',
        day: 'numeric',
      });
    }
  }, [message.created_at]);

  // Long press handlers for mobile
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (e.pointerType === 'touch') {
      longPressTimerRef.current = setTimeout(() => {
        setShowTimestamp(true);
      }, 500);
    }
  }, []);

  const handlePointerUp = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }, []);

  const handlePointerLeave = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    setShowTimestamp(false);
  }, []);

  // Create accessible label
  const accessibleLabel = useMemo(() => {
    const sender =
      message.sender?.full_name || message.sender?.username || 'Unknown';
    const timeLabel = formattedTime ? ` sent at ${formattedTime}` : '';
    return `Message from ${sender}${timeLabel}: ${message.content}`;
  }, [message.sender, formattedTime, message.content]);

  // Handle deleted messages
  if (message.deleted_at) {
    return (
      <div
        className={cn(
          'flex gap-3 px-4',
          isGrouped ? 'py-1' : 'py-2',
          isOwn && 'flex-row-reverse',
        )}
      >
        {showAvatar && (
          <div className="w-8 h-8 opacity-50">
            <Avatar className="h-8 w-8">
              <AvatarImage src={message.sender?.avatar_url || undefined} />
              <AvatarFallback className="text-xs">
                {userInitials}
              </AvatarFallback>
            </Avatar>
          </div>
        )}
        {!showAvatar && <div className="w-8" />}

        <div className={cn('flex-1 max-w-lg', isOwn && 'text-right')}>
          <details className="group">
            <summary className="cursor-pointer list-none rounded-lg px-3 py-2 text-sm text-muted-foreground">
              <span className="italic">Message deleted</span>
            </summary>
            <div className="mt-1 text-xs text-muted-foreground/70">
              {formattedTime && `Deleted message from ${formattedTime}`}
            </div>
          </details>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'flex gap-3 px-4 relative group focus-within:bg-muted/20',
        isGrouped ? 'py-1' : 'py-2',
        isOwn && 'flex-row-reverse',
      )}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerLeave}
    >
      {showAvatar && (
        <Avatar className="h-8 w-8">
          <AvatarImage src={message.sender?.avatar_url || undefined} />
          <AvatarFallback className="text-xs">{userInitials}</AvatarFallback>
        </Avatar>
      )}
      {!showAvatar && <div className="w-8" />}

      <div className={cn('flex-1 max-w-lg relative')}>
        <button
          type="button"
          className={cn(
            'rounded-lg px-3 py-2 transition-colors group-hover:bg-muted/50 group-focus-within:bg-muted/50 relative text-left w-full',
            isOwn && 'text-primary-foreground',
          )}
          aria-label={accessibleLabel}
          onClick={() => {
            setShowTimestamp(true);
            setTimeout(() => setShowTimestamp(false), 3000);
          }}
          onBlur={() => setShowTimestamp(false)}
        >
          <div className="text-sm whitespace-pre-wrap break-words">
            <Linkify
              options={{
                target: '_blank',
                rel: 'noopener noreferrer',
                className:
                  'text-accent hover:text-accent/80 underline underline-offset-2',
              }}
            >
              {message.content}
            </Linkify>
          </div>
        </button>

        {/* Timestamp on hover, focus, or long press */}
        {formattedTime && (
          <div
            className={cn(
              'absolute top-1/2 -translate-y-1/2 text-xs text-muted-foreground bg-background/80 backdrop-blur-sm px-2 py-1 rounded pointer-events-none transition-opacity whitespace-nowrap',
              'opacity-0 group-hover:opacity-100 group-focus-within:opacity-100',
              showTimestamp && 'opacity-100',
              isOwn ? 'right-full mr-2' : 'left-full ml-2',
            )}
          >
            {formattedTime}
          </div>
        )}
      </div>
    </div>
  );
}
