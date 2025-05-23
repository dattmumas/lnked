'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { MessageSquare, Users, Hash, User } from 'lucide-react';
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
  const formatDistanceToNow = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return 'now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h`;
    if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)}d`;
    return `${Math.floor(diffInSeconds / 2592000)}mo`;
  };

  const getConversationTitle = (conversation: ConversationWithParticipants) => {
    if (conversation.title) return conversation.title;

    if (conversation.type === 'direct') {
      // For direct messages, show the other participant's name
      const otherParticipant = conversation.participants.find(
        (p) => p.user_id !== currentUserId,
      );
      return (
        otherParticipant?.user.full_name ||
        otherParticipant?.user.username ||
        'Unknown User'
      );
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
      return otherParticipant?.user.avatar_url;
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

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((word) => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (conversations.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-muted-foreground">
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
                'w-full p-3 rounded-lg text-left hover:bg-muted/50 transition-colors',
                'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
                isActive && 'bg-muted',
              )}
            >
              <div className="flex items-start gap-3">
                {/* Avatar */}
                <div className="relative">
                  {conversation.type === 'direct' ? (
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={avatarUrl || undefined} />
                      <AvatarFallback className="text-xs">
                        {getInitials(title)}
                      </AvatarFallback>
                    </Avatar>
                  ) : (
                    <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                      <Icon className="h-5 w-5 text-muted-foreground" />
                    </div>
                  )}

                  {/* Online indicator for direct messages */}
                  {conversation.type === 'direct' && hasOnlineUser && (
                    <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 bg-green-500 rounded-full border-2 border-background" />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h3
                      className={cn(
                        'font-medium truncate',
                        unreadCount > 0 && 'font-semibold',
                      )}
                    >
                      {title}
                    </h3>

                    {/* Timestamp and unread badge */}
                    <div className="flex items-center gap-2 ml-2">
                      {conversation.last_message_at && (
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(conversation.last_message_at)}
                        </span>
                      )}

                      {unreadCount > 0 && (
                        <Badge
                          variant="default"
                          className="h-5 min-w-5 text-xs px-1.5"
                        >
                          {unreadCount > 99 ? '99+' : unreadCount}
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Last message preview */}
                  {conversation.last_message && (
                    <p className="text-sm text-muted-foreground truncate">
                      {conversation.last_message.content}
                    </p>
                  )}

                  {/* Participants count for group chats */}
                  {conversation.type !== 'direct' && (
                    <p className="text-xs text-muted-foreground mt-1">
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
