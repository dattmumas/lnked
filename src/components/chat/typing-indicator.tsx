'use client';

import type { TypingIndicator as TypingType } from '@/lib/chat/types';

interface TypingIndicatorProps {
  typingUsers: TypingType[];
}

export function TypingIndicator({ typingUsers }: TypingIndicatorProps) {
  if (typingUsers.length === 0) return null;

  const getTypingText = () => {
    if (typingUsers.length === 1) {
      return 'Someone is typing...';
    } else if (typingUsers.length === 2) {
      return '2 people are typing...';
    } else {
      return `${typingUsers.length} people are typing...`;
    }
  };

  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
      <div className="flex space-x-1">
        <div className="flex space-x-1">
          <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce [animation-delay:-0.3s]"></div>
          <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce [animation-delay:-0.15s]"></div>
          <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"></div>
        </div>
      </div>
      <span>{getTypingText()}</span>
    </div>
  );
}
