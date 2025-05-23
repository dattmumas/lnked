'use client';

import { useState, useEffect, useRef } from 'react';
import { MessageList } from './message-list';
import { MessageInput } from './message-input';
import { TypingIndicator } from './typing-indicator';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { Json } from '@/lib/database.types';
import type {
  MessageWithSender,
  TypingIndicator as TypingType,
} from '@/lib/chat/types';

interface ChatWindowProps {
  conversationId: string;
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

  const clearReply = () => {
    setReplyToMessage(null);
  };

  return (
    <div className="flex flex-col h-full">
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
          replyToMessage={replyToMessage}
          onClearReply={clearReply}
          placeholder="Type a message..."
        />
      </div>
    </div>
  );
}
