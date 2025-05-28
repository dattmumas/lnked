'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { MessageSquare, Users, Hash, User } from 'lucide-react';
import {
  getDisplayName,
  getUserInitials,
  formatRelativeTime,
} from '@/lib/chat/utils';
import type { ConversationWithParticipants } from '@/lib/chat/types';

interface ConversationListProps {
  conversations: ConversationWithParticipants[];
  activeConversation: string | null;
  onSelectConversation: (conversationId: string) => void;
  getUnreadCount: (conversationId: string) => number;
  isUserOnline: (userId: string) => boolean;
  currentUserId: string;
}

export function ConversationList({
  conversations,
  activeConversation,
  onSelectConversation,
  getUnreadCount,
  isUserOnline,
  currentUserId,
}: ConversationListProps) {
  // Using utility function for date formatting

  const getConversationTitle = (conversation: ConversationWithParticipants) => {
    if (conversation.title) return conversation.title;

    if (conversation.type === 'direct') {
      const otherParticipant = conversation.participants.find(
        (p) => p.user_id !== currentUserId,
      );
      if (otherParticipant) {
        return getDisplayName(otherParticipant.user);
      }
      // For direct messages, if we can't find the other participant,
      // try to get name from last message sender (if it's not the current user)
      if (
        conversation.last_message?.sender &&
        conversation.last_message.sender.id !== currentUserId
      ) {
        return getDisplayName(conversation.last_message.sender);
      }
      return 'Unknown User';
    }

    // For group/channel conversations, show creator as fallback
    if (conversation.created_by_user) {
      return getDisplayName(conversation.created_by_user);
    }

    return `${conversation.type === 'group' ? 'Group' : 'Channel'} Chat`;
  };

  const getConversationAvatar = (
    conversation: ConversationWithParticipants,
  ) => {
    if (conversation.type === 'direct') {
      const otherParticipant = conversation.participants.find(
        (p) => p.user_id !== currentUserId,
      );
      if (otherParticipant?.user.avatar_url)
        return otherParticipant.user.avatar_url;
      // For direct messages, try avatar from last message sender (if it's not the current user)
      if (
        conversation.last_message?.sender?.avatar_url &&
        conversation.last_message.sender.id !== currentUserId
      ) {
        return conversation.last_message.sender.avatar_url;
      }
    }
    return null;
  };

  const getConversationIcon = (type: string) => {
    switch (type) {
      case 'direct':
        return User;
      case 'group':
        return Users;
      case 'channel':
        return Hash;
      default:
        return MessageSquare;
    }
  };

  // Using utility function for initials

  if (conversations.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-foreground/60">
        <div className="text-center">
          <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No conversations yet</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto">
      <div className="p-2 space-y-1">
        {conversations.map((conversation) => {
          const unreadCount = getUnreadCount(conversation.id);
          const isActive = activeConversation === conversation.id;
          const title = getConversationTitle(conversation);
          const avatarUrl = getConversationAvatar(conversation);
          const Icon = getConversationIcon(conversation.type);

          // Get other participant for direct messages
          const otherParticipant =
            conversation.type === 'direct'
              ? conversation.participants.find(
                  (p) => p.user_id !== currentUserId,
                )
              : null;

          // Check if any participant is online (for direct messages)
          const hasOnlineUser =
            conversation.type === 'direct'
              ? conversation.participants.some(
                  (p) => p.user_id !== currentUserId && isUserOnline(p.user_id),
                )
              : false;

          return (
            <button
              key={conversation.id}
              onClick={() => onSelectConversation(conversation.id)}
              className={cn(
                'w-full p-2 rounded-lg text-left transition-all duration-200',
                'border border-transparent hover:border-border/50',
                'hover:bg-muted/30 hover:shadow-sm',
                'focus:outline-none focus:ring-1 focus:ring-ring focus:ring-offset-1',
                isActive && 'bg-muted border-border shadow-sm',
              )}
            >
              <div className="flex items-center gap-2.5">
                {/* Avatar */}
                <div className="relative flex-shrink-0">
                  {conversation.type === 'direct' ? (
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={avatarUrl || undefined} />
                      <AvatarFallback className="text-xs bg-primary/10 text-primary">
                        {getUserInitials(
                          otherParticipant?.user ||
                            (conversation.last_message?.sender?.id !==
                            currentUserId
                              ? conversation.last_message?.sender
                              : null) || { full_name: 'Unknown User' },
                        )}
                      </AvatarFallback>
                    </Avatar>
                  ) : (
                    <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center">
                      <Icon className="h-4 w-4 text-foreground/60" />
                    </div>
                  )}

                  {/* Online indicator for direct messages */}
                  {conversation.type === 'direct' && hasOnlineUser && (
                    <div className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 bg-green-500 rounded-full border-2 border-background" />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h3
                      className={cn(
                        'font-medium text-sm truncate',
                        unreadCount > 0 && 'font-semibold text-foreground',
                      )}
                    >
                      {title}
                    </h3>

                    {/* Timestamp */}
                    {conversation.last_message_at && (
                      <span className="text-xs text-foreground/50 ml-2">
                        {formatRelativeTime(conversation.last_message_at)}
                      </span>
                    )}
                  </div>

                  {/* Last message preview and unread badge */}
                  <div className="flex items-center justify-between mt-0.5">
                    {conversation.last_message ? (
                      <p className="text-xs text-foreground/60 truncate pr-2">
                        {conversation.last_message.content}
                      </p>
                    ) : (
                      <p className="text-xs text-foreground/50 italic">
                        No messages yet
                      </p>
                    )}

                    {unreadCount > 0 && (
                      <Badge
                        variant="default"
                        className="h-4 min-w-4 text-[10px] px-1 flex-shrink-0"
                      >
                        {unreadCount > 99 ? '99+' : unreadCount}
                      </Badge>
                    )}
                  </div>

                  {/* Participants count for group chats */}
                  {conversation.type !== 'direct' && (
                    <p className="text-[10px] text-foreground/40 mt-0.5">
                      {conversation.participants.length} members
                    </p>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
