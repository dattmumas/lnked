'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Reply, MoreVertical } from 'lucide-react';
import {
  getDisplayName,
  getUserInitials,
  formatChatTime,
} from '@/lib/chat/utils';
import type { MessageWithSender } from '@/lib/chat/types';

interface MessageListProps {
  messages: MessageWithSender[];
  currentUserId: string;
  onReply: (message: MessageWithSender) => void;
  onAddReaction: (messageId: string, emoji: string) => Promise<void>;
  onRemoveReaction: (messageId: string, emoji: string) => Promise<void>;
  isUserOnline: (userId: string) => boolean;
}

export function MessageList({
  messages,
  currentUserId,
  onReply,
  onAddReaction,
  onRemoveReaction,
  isUserOnline,
}: MessageListProps) {
  // Using utility function for time formatting

  // Using utility function for initials

  if (messages.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-muted-foreground">
        <p className="text-sm">No messages yet. Start the conversation!</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {messages.map((message, index) => {
        const isOwnMessage = message.sender_id === currentUserId;
        const showAvatar =
          !isOwnMessage &&
          (index === 0 || messages[index - 1].sender_id !== message.sender_id);
        const isOnline = message.sender
          ? isUserOnline(message.sender.id)
          : false;

        return (
          <div
            key={message.id}
            className={cn(
              'flex gap-3 group',
              isOwnMessage ? 'flex-row-reverse' : 'flex-row',
            )}
          >
            {/* Avatar */}
            <div
              className={cn('flex-shrink-0', isOwnMessage ? 'ml-3' : 'mr-3')}
            >
              {showAvatar ? (
                <div className="relative">
                  <Avatar className="h-8 w-8">
                    <AvatarImage
                      src={message.sender?.avatar_url || undefined}
                    />
                    <AvatarFallback className="text-xs">
                      {getUserInitials(message.sender)}
                    </AvatarFallback>
                  </Avatar>
                  {isOnline && (
                    <div className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 bg-green-500 rounded-full border border-background" />
                  )}
                </div>
              ) : (
                <div className="w-8 h-8" />
              )}
            </div>

            {/* Message content */}
            <div
              className={cn(
                'flex-1 max-w-[70%]',
                isOwnMessage ? 'items-end' : 'items-start',
              )}
            >
              {/* Sender name and time */}
              {showAvatar && !isOwnMessage && (
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium">
                    {getDisplayName(message.sender)}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {formatChatTime(message.created_at)}
                  </span>
                </div>
              )}

              {/* Reply preview */}
              {message.reply_to && (
                <div className="mb-2 p-2 bg-muted/50 rounded border-l-2 border-primary text-xs">
                  <div className="font-medium text-muted-foreground mb-1">
                    {getDisplayName(message.reply_to.sender)}
                  </div>
                  <div className="truncate">{message.reply_to.content}</div>
                </div>
              )}

              {/* Message bubble */}
              <div
                className={cn(
                  'relative rounded-2xl px-4 py-2 text-sm',
                  isOwnMessage
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-foreground',
                )}
              >
                <div className="break-words">{message.content}</div>

                {/* Time for own messages */}
                {isOwnMessage && (
                  <div className="text-xs opacity-70 mt-1">
                    {formatChatTime(message.created_at)}
                  </div>
                )}

                {/* Message actions */}
                <div
                  className={cn(
                    'absolute top-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity',
                    isOwnMessage ? '-left-20' : '-right-20',
                  )}
                >
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onReply(message)}
                    className="h-6 w-6 p-0 bg-background shadow-sm"
                  >
                    <Reply className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onAddReaction(message.id, '👍')}
                    className="h-6 w-6 p-0 bg-background shadow-sm"
                  >
                    👍
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 bg-background shadow-sm"
                  >
                    <MoreVertical className="h-3 w-3" />
                  </Button>
                </div>
              </div>

              {/* Reactions */}
              {message.reactions && message.reactions.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {Object.entries(
                    message.reactions.reduce(
                      (acc, reaction) => {
                        acc[reaction.emoji] = (acc[reaction.emoji] || 0) + 1;
                        return acc;
                      },
                      {} as Record<string, number>,
                    ),
                  ).map(([emoji, count]) => (
                    <button
                      key={emoji}
                      onClick={() => onRemoveReaction(message.id, emoji)}
                      className="text-xs bg-muted hover:bg-muted/80 rounded-full px-2 py-1 flex items-center gap-1"
                    >
                      <span>{emoji}</span>
                      <span>{count}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
