import { formatChatTime } from '@/lib/chat/utils';
import { cn } from '@/lib/utils';

import type { MessageWithSender } from '@/lib/chat/types';

interface SimpleMessageListProps {
  messages: MessageWithSender[];
  currentUserId: string;
}

export function SimpleMessageList({
  messages,
  currentUserId,
}: SimpleMessageListProps) {
  if (messages.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-muted-foreground">
        <p className="text-sm">No messages yet. Start the conversation!</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {messages.map((message, index) => {
        const isOwnMessage = message.sender_id === currentUserId;
        const prevMessage = index > 0 ? messages[index - 1] : null;
        const showTimestamp =
          index === 0 ||
          (prevMessage?.created_at &&
            message.created_at &&
            new Date(prevMessage.created_at).getMinutes() !==
              new Date(message.created_at).getMinutes());

        return (
          <div key={message.id}>
            {/* Show timestamp if needed */}
            {showTimestamp && message.created_at && (
              <div className="text-center my-2">
                <span className="text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                  {formatChatTime(message.created_at)}
                </span>
              </div>
            )}

            {/* Message */}
            <div
              className={cn(
                'flex',
                isOwnMessage ? 'justify-end' : 'justify-start',
              )}
            >
              <div
                className={cn(
                  'max-w-[70%] rounded-2xl px-3 py-1.5 text-sm',
                  isOwnMessage
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-foreground',
                )}
              >
                <div className="break-words">{message.content}</div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
