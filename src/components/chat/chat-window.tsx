'use client';

import { useState, useEffect, useRef } from 'react';
import { MessageList } from './message-list';
import { MessageInput } from './message-input';
import { TypingIndicator } from './typing-indicator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MoreVertical, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getDisplayName, getUserInitials } from '@/lib/chat/utils';
import type { Json } from '@/lib/database.types';
import type {
  MessageWithSender,
  TypingIndicator as TypingType,
  ConversationWithParticipants,
} from '@/lib/chat/types';

interface ChatWindowProps {
  conversationId: string;
  conversation?: ConversationWithParticipants;
  messages: MessageWithSender[];
  typingUsers: TypingType[];
  onSendMessage: (data: {
    conversation_id: string;
    content: string;
    message_type?: 'text' | 'image' | 'file' | 'system';
    reply_to_id?: string;
    metadata?: Json;
  }) => Promise<MessageWithSender | null>;
  onStartTyping: () => void;
  onStopTyping: () => void;
  onAddReaction: (messageId: string, emoji: string) => Promise<void>;
  onRemoveReaction: (messageId: string, emoji: string) => Promise<void>;
  currentUserId: string;
  isUserOnline: (userId: string) => boolean;
}

export function ChatWindow({
  conversationId,
  conversation,
  messages,
  typingUsers,
  onSendMessage,
  onStartTyping,
  onStopTyping,
  onAddReaction,
  onRemoveReaction,
  currentUserId,
  isUserOnline,
}: ChatWindowProps) {
  const [replyToMessage, setReplyToMessage] =
    useState<MessageWithSender | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const [isNearBottom, setIsNearBottom] = useState(true);

  // Get conversation title and participant info
  const getConversationTitle = () => {
    if (!conversation) return 'Chat';

    if (conversation.title) return conversation.title;

    if (conversation.type === 'direct') {
      const otherParticipant = conversation.participants.find(
        (p) => p.user_id !== currentUserId,
      );
      if (otherParticipant) {
        return getDisplayName(otherParticipant.user);
      }
      if (conversation.created_by_user) {
        return getDisplayName(conversation.created_by_user);
      }
      if (conversation.last_message?.sender) {
        return getDisplayName(conversation.last_message.sender);
      }
      return 'Unknown';
    }

    return `${conversation.type === 'group' ? 'Group' : 'Channel'} Chat`;
  };

  const getConversationSubtitle = () => {
    if (!conversation) return '';

    if (conversation.type === 'direct') {
      const otherParticipant = conversation.participants.find(
        (p) => p.user_id !== currentUserId,
      );
      const isOnline = otherParticipant
        ? isUserOnline(otherParticipant.user_id)
        : false;
      return isOnline ? 'Online' : 'Offline';
    }

    return `${conversation.participants.length} members`;
  };

  const getConversationAvatar = () => {
    if (!conversation || conversation.type !== 'direct') return null;

    const otherParticipant = conversation.participants.find(
      (p) => p.user_id !== currentUserId,
    );
    if (otherParticipant?.user) return otherParticipant.user;
    if (conversation.created_by_user) return conversation.created_by_user;
    if (conversation.last_message?.sender)
      return conversation.last_message.sender;
    return null;
  };

  // Auto-scroll to bottom when new messages arrive (if user is near bottom)
  useEffect(() => {
    if (isNearBottom && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isNearBottom]);

  // Handle scroll to detect if user is near bottom
  const handleScroll = (event: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = event.currentTarget;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
    setIsNearBottom(distanceFromBottom < 100);
  };

  const handleSendMessage = async (content: string) => {
    if (!content.trim()) return;

    await onSendMessage({
      conversation_id: conversationId,
      content: content.trim(),
      reply_to_id: replyToMessage?.id,
    });

    // Clear reply after sending
    setReplyToMessage(null);
  };

  const handleReply = (message: MessageWithSender) => {
    setReplyToMessage(message);
  };

  const conversationTitle = getConversationTitle();
  const conversationSubtitle = getConversationSubtitle();
  const avatarUser = getConversationAvatar();

  return (
    <div className="flex flex-col h-full">
      {/* Chat header */}
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex items-center justify-between px-4 py-2">
          <div className="flex items-center gap-3">
            {conversation?.type === 'direct' ? (
              <Avatar className="h-9 w-9">
                <AvatarImage src={avatarUser?.avatar_url || undefined} />
                <AvatarFallback className="text-xs bg-primary/10 text-primary">
                  {getUserInitials(avatarUser)}
                </AvatarFallback>
              </Avatar>
            ) : (
              <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center">
                <Users className="h-4 w-4 text-foreground/60" />
              </div>
            )}

            <div>
              <h3 className="font-medium text-sm">{conversationTitle}</h3>
              <p className="text-xs text-foreground/60">
                {conversationSubtitle}
              </p>
            </div>
          </div>

          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Messages area */}
      <div className="flex-1 min-h-0 relative">
        <ScrollArea
          ref={scrollAreaRef}
          className="h-full px-4"
          onScrollCapture={handleScroll}
        >
          <div className="py-4 space-y-4">
            <MessageList
              messages={messages}
              currentUserId={currentUserId}
              onReply={handleReply}
              onAddReaction={onAddReaction}
              onRemoveReaction={onRemoveReaction}
              isUserOnline={isUserOnline}
            />

            {/* Typing indicator */}
            {typingUsers.length > 0 && (
              <TypingIndicator typingUsers={typingUsers} />
            )}

            {/* Scroll anchor */}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* Scroll to bottom button */}
        {!isNearBottom && (
          <button
            onClick={() => {
              messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
            }}
            className="absolute bottom-4 right-4 bg-primary text-primary-foreground rounded-full p-2 shadow-lg hover:bg-primary/90 transition-colors"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 14l-7 7m0 0l-7-7m7 7V3"
              />
            </svg>
          </button>
        )}
      </div>

      {/* Message input */}
      <div className="border-t bg-background">
        <MessageInput
          onSendMessage={handleSendMessage}
          onStartTyping={onStartTyping}
          onStopTyping={onStopTyping}
          placeholder="Type a message..."
        />
      </div>
    </div>
  );
}
