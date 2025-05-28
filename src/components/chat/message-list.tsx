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
    <div className="space-y-3">
      {messages.map((message, index) => {
        const isOwnMessage = message.sender_id === currentUserId;
        const showAvatar =
          !isOwnMessage &&
          (index === 0 || messages[index - 1].sender_id !== message.sender_id);
        const isOnline = message.sender
          ? isUserOnline(message.sender.id)
          : false;

        // Removed senderName as it's no longer displayed
        const isConsecutive =
          index > 0 && messages[index - 1].sender_id === message.sender_id;

        return (
          <div
            key={message.id}
            className={cn(
              'flex gap-2 group',
              isOwnMessage ? 'flex-row-reverse' : 'flex-row',
              isConsecutive && !showAvatar && 'mt-1',
            )}
          >
            {/* Avatar */}
            <div
              className={cn('flex-shrink-0', isOwnMessage ? 'ml-2' : 'mr-2')}
            >
              {showAvatar ? (
                <div className="relative">
                  <Avatar className="h-7 w-7">
                    <AvatarImage
                      src={message.sender?.avatar_url || undefined}
                    />
                    <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                      {getUserInitials(message.sender)}
                    </AvatarFallback>
                  </Avatar>
                  {isOnline && (
                    <div className="absolute -bottom-0.5 -right-0.5 h-2 w-2 bg-green-500 rounded-full border border-background" />
                  )}
                </div>
              ) : (
                <div className="w-7 h-7" />
              )}
            </div>

            {/* Message content */}
            <div
              className={cn(
                'flex-1 max-w-[70%]',
                isOwnMessage ? 'items-end' : 'items-start',
              )}
            >
              {/* Sender name and time - only show for first message in a group */}
              {showAvatar && !isOwnMessage && (
                <div className="flex items-baseline gap-2 mb-0.5 px-1">
                  {/* Removed sender name display */}
                  <span className="text-[10px] text-foreground/50">
                    {formatChatTime(message.created_at)}
                  </span>
                </div>
              )}

              {/* Reply preview */}
              {message.reply_to && (
                <div className="">
                  <div className="text-xs font-medium text-foreground/80">
                    {getDisplayName(message.sender)}
                  </div>
                  <div className="truncate text-foreground/50">
                    {message.reply_to.content}
                  </div>
                </div>
              )}

              {/* Message bubble */}
              <div
                className={cn(
                  'relative rounded-2xl px-3 py-1.5 text-sm',
                  'border border-transparent',
                  isOwnMessage
                    ? 'bg-primary text-primary-foreground border-primary/20'
                    : 'bg-muted text-foreground border-border/50',
                )}
              >
                <div className="break-words leading-relaxed">
                  {message.content}
                </div>

                {/* Time for own messages */}
                {isOwnMessage && (
                  <div className="text-[10px] opacity-70 mt-0.5">
                    {formatChatTime(message.created_at)}
                  </div>
                )}

                {/* Message actions */}
                <div
                  className={cn(
                    'absolute top-0 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity',
                    isOwnMessage ? '-left-16' : '-right-16',
                  )}
                >
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onReply(message)}
                    className="h-6 w-6 p-0 bg-background/80 backdrop-blur-sm shadow-sm hover:bg-background"
                  >
                    <Reply className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onAddReaction(message.id, '👍')}
                    className="h-6 w-6 p-0 bg-background/80 backdrop-blur-sm shadow-sm hover:bg-background text-xs"
                  >
                    👍
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 bg-background/80 backdrop-blur-sm shadow-sm hover:bg-background"
                  >
                    <MoreVertical className="h-3 w-3" />
                  </Button>
                </div>
              </div>

              {/* Reactions */}
              {message.reactions && message.reactions.length > 0 && (
                <div className="flex flex-wrap gap-0.5 mt-0.5 px-1">
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
                      className="text-[11px] bg-muted/60 hover:bg-muted rounded-full px-1.5 py-0.5 flex items-center gap-0.5 border border-border/30"
                    >
                      <span>{emoji}</span>
                      <span className="text-foreground/60">{count}</span>
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
