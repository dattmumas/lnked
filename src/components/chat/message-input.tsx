'use client';

import { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Send, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getDisplayName } from '@/lib/chat/utils';
import type { MessageWithSender } from '@/lib/chat/types';

interface MessageInputProps {
  onSendMessage: (content: string) => Promise<void>;
  onStartTyping: () => void;
  onStopTyping: () => void;
  replyToMessage?: MessageWithSender | null;
  onClearReply?: () => void;
  placeholder?: string;
  disabled?: boolean;
}

export function MessageInput({
  onSendMessage,
  onStartTyping,
  onStopTyping,
  replyToMessage,
  onClearReply,
  placeholder = 'Type a message...',
  disabled = false,
}: MessageInputProps) {
  const [content, setContent] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Handle typing indicators
  const handleTypingStart = useCallback(() => {
    if (!isTyping) {
      setIsTyping(true);
      onStartTyping();
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set new timeout to stop typing
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      onStopTyping();
    }, 1000);
  }, [isTyping, onStartTyping, onStopTyping]);

  const handleStopTyping = useCallback(() => {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    setIsTyping(false);
    onStopTyping();
  }, [onStopTyping]);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setContent(value);

    if (value.trim()) {
      handleTypingStart();
    } else {
      handleStopTyping();
    }

    // Auto-resize textarea
    const textarea = e.target;
    textarea.style.height = 'auto';
    textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleSendMessage = async () => {
    if (!content.trim() || disabled) return;

    const messageContent = content.trim();
    setContent('');
    handleStopTyping();

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    try {
      await onSendMessage(messageContent);
    } catch (error) {
      // Restore content on error
      setContent(messageContent);
      console.error('Failed to send message:', error);
    }
  };

  return (
    <div className="p-4">
      {/* Reply preview */}
      {replyToMessage && (
        <div className="mb-2 p-2 bg-muted rounded-lg border-l-4 border-primary">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground mb-1">
                Replying to {getDisplayName(replyToMessage.sender)}
              </p>
              <p className="text-sm truncate">{replyToMessage.content}</p>
            </div>
            {onClearReply && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onClearReply}
                className="h-6 w-6 p-0 ml-2"
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Input area */}
      <div className="flex items-end gap-2">
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={content}
            onChange={handleInputChange}
            onKeyPress={handleKeyPress}
            placeholder={placeholder}
            disabled={disabled}
            rows={1}
            className={cn(
              'w-full resize-none border border-input bg-background px-3 py-2 text-sm ring-offset-background',
              'placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
              'disabled:cursor-not-allowed disabled:opacity-50 rounded-lg',
              'min-h-[40px] max-h-[120px] overflow-y-auto',
            )}
          />
        </div>

        <Button
          onClick={handleSendMessage}
          disabled={!content.trim() || disabled}
          size="sm"
          className="h-10 w-10 p-0"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>

      {/* Character count or other info */}
      {content.length > 0 && (
        <div className="mt-1 text-xs text-muted-foreground text-right">
          {content.length} characters
        </div>
      )}
    </div>
  );
}
