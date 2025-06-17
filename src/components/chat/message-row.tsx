'use client';

import clsx from 'clsx';
import { memo, CSSProperties, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

import type { MessageWithSender as Message } from '@/lib/chat/types';

interface MessageRowProps {
  index: number;
  style: CSSProperties;
  data: {
    messages: Message[];
    lastReadAt: string | null;
    user: any;
    onStartEdit: (msg: Message) => void;
    onDelete: (messageId: string) => void;
    onReply: (msg: Message) => void;
    onAddReaction: (messageId: string, emoji: string) => void;
    onRemoveReaction: (messageId: string, emoji: string) => void;
    onEmojiPicker: (messageId: string) => void;
    editingId: string | null;
    editText: string;
    onEditTextChange: (text: string) => void;
    onSaveEdit: (messageId: string, content: string) => void;
    onCancelEdit: () => void;
    getReactionCounts: (message: any) => Array<{
      emoji: string;
      count: number;
      userIds: string[];
    }>;
    formatFileSize: (bytes: number) => string;
    setItemSize?: (index: number, size: number) => void;
  };
}

export const MessageRow = memo<MessageRowProps>(({ index, style, data }) => {
  const {
    messages,
    lastReadAt,
    user,
    onStartEdit,
    onDelete,
    onReply,
    onAddReaction,
    onRemoveReaction,
    onEmojiPicker,
    editingId,
    editText,
    onEditTextChange,
    onSaveEdit,
    onCancelEdit,
    getReactionCounts,
    formatFileSize,
    setItemSize,
  } = data;

  const rowRef = useRef<HTMLDivElement>(null);
  const msg = messages[index];

  // Measure the actual height of the row
  useEffect(() => {
    if (rowRef.current && setItemSize) {
      const {height} = rowRef.current.getBoundingClientRect();
      setItemSize(index, height);
    }
  }, [index, setItemSize, msg.content, msg.metadata, editingId]);

  if (!msg) return null;

  const prev = index > 0 ? messages[index - 1] : null;
  const sameSender = prev && prev.sender_id === msg.sender_id;
  let withinFiveMin = false;
  if (prev && prev.created_at && msg.created_at && sameSender) {
    withinFiveMin =
      Math.abs(
        new Date(msg.created_at).getTime() -
          new Date(prev.created_at).getTime(),
      ) <
      5 * 60 * 1000;
  }
  const newGroup = !sameSender || !withinFiveMin;

  const isDeleted = Boolean(msg.deleted_at);
  const isEdited = Boolean(msg.edited_at);

  // Check if this is the first unread message
  const isFirstUnread =
    lastReadAt &&
    msg.created_at &&
    new Date(msg.created_at).getTime() > new Date(lastReadAt).getTime() &&
    (!prev ||
      !prev.created_at ||
      new Date(prev.created_at).getTime() <= new Date(lastReadAt).getTime());

  return (
    <div ref={rowRef} style={style}>
      {/* Last read indicator */}
      {isFirstUnread && (
        <div
          id="last-read-indicator"
          className="relative flex items-center gap-3 my-6 px-4"
        >
          <div className="flex-1 h-[1px] bg-gradient-to-r from-transparent via-primary/20 to-primary/20" />
          <span className="text-xs text-primary font-medium px-3 py-1 bg-primary/10 rounded-full whitespace-nowrap">
            New messages
          </span>
          <div className="flex-1 h-[1px] bg-gradient-to-l from-transparent via-primary/20 to-primary/20" />
        </div>
      )}

      <div
        className={clsx(
          'flex gap-2 relative group px-4',
          newGroup ? 'mt-3' : '',
        )}
      >
        {/* Avatar column */}
        {newGroup ? (
          <img
            src={msg.sender?.avatar_url ?? '/avatar-placeholder.png'}
            alt="avatar"
            className="mt-1 h-8 w-8 rounded-full object-cover"
          />
        ) : (
          <span className="w-8" />
        )}

        {/* Content column */}
        <div className="flex-1 min-w-0 text-sm">
          {newGroup && (
            <div className="flex items-baseline gap-2">
              <span className="font-medium">
                {msg.sender?.username ?? 'Anon'}
              </span>
              <span className="text-xs text-muted-foreground">
                {new Date(msg.created_at ?? '').toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>
          )}

          {/* Reply preview if this message is replying to another */}
          {msg.reply_to_id && msg.reply_to && (
            <div className="mb-1 ml-2 pl-2 border-l-2 border-border/50 text-xs text-muted-foreground">
              Replying to{' '}
              <span className="font-medium">
                @
                {msg.reply_to.sender?.username ??
                  msg.reply_to.sender?.full_name ??
                  'Unknown'}
              </span>
              : "
              {msg.reply_to.deleted_at
                ? 'This message was deleted'
                : msg.reply_to.content?.substring(0, 50) || ''}
              {!msg.reply_to.deleted_at &&
              msg.reply_to.content &&
              msg.reply_to.content.length > 50
                ? '...'
                : ''}
              "
            </div>
          )}

          {isDeleted ? (
            <em className="italic text-xs text-muted-foreground">
              This message was deleted
            </em>
          ) : editingId === msg.id ? (
            // Edit mode
            <form
              onSubmit={(e) => {
                e.preventDefault();
                onSaveEdit(msg.id, editText);
              }}
              className="flex flex-col gap-2"
            >
              <textarea
                value={editText}
                onChange={(e) => onEditTextChange(e.target.value)}
                className="w-full p-2 text-sm bg-muted rounded-md focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                rows={3}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    onCancelEdit();
                  }
                }}
              />
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="text-sm bg-primary text-primary-foreground px-4 py-1.5 rounded-md hover:bg-primary/90 transition-colors font-medium"
                  disabled={!editText.trim()}
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={onCancelEdit}
                  className="text-sm text-muted-foreground px-4 py-1.5 rounded-md hover:bg-muted transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <div className="prose prose-sm dark:prose-invert break-words max-w-none">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  p: ({ children }) => (
                    <p className="whitespace-pre-wrap break-words text-foreground my-0 text-[15px] leading-relaxed font-normal">
                      {children}
                    </p>
                  ),
                  a: ({ children, href }) => (
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      {children}
                    </a>
                  ),
                  code: ({ children, className }) => {
                    const isInline = !className;
                    return isInline ? (
                      <code className="bg-muted px-1 py-0.5 rounded text-sm font-mono">
                        {children}
                      </code>
                    ) : (
                      <code className={className}>{children}</code>
                    );
                  },
                  pre: ({ children }) => (
                    <pre className="bg-muted p-3 rounded-md overflow-x-auto my-2 font-mono text-sm">
                      {children}
                    </pre>
                  ),
                }}
              >
                {msg.content}
              </ReactMarkdown>
              {isEdited && (
                <span className="text-xs text-muted-foreground ml-1">
                  (edited)
                </span>
              )}
            </div>
          )}

          {/* Link preview if available */}
          {msg.metadata &&
            typeof msg.metadata === 'object' &&
            'embed' in msg.metadata && (
              <div className="mt-2 rounded-lg p-3 bg-muted/20">
                <div className="flex gap-3">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-sm truncate">
                      {(msg.metadata as any).embed.title}
                    </h4>
                    {(msg.metadata as any).embed.description && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {(msg.metadata as any).embed.description}
                      </p>
                    )}
                    <a
                      href={(msg.metadata as any).embed.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary hover:underline mt-1 block truncate"
                    >
                      {(msg.metadata as any).embed.url}
                    </a>
                  </div>
                  {(msg.metadata as any).embed.image && (
                    <img
                      src={(msg.metadata as any).embed.image}
                      alt=""
                      className="w-20 h-20 object-cover rounded"
                    />
                  )}
                </div>
              </div>
            )}

          {/* Image attachment */}
          {msg.message_type === 'image' &&
            msg.metadata &&
            typeof msg.metadata === 'object' &&
            'url' in msg.metadata && (
              <div className="mt-2">
                <img
                  src={(msg.metadata as any).url}
                  alt={(msg.metadata as any).alt || 'Image'}
                  className="max-w-sm rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                  onClick={() =>
                    window.open((msg.metadata as any).url, '_blank')
                  }
                />
              </div>
            )}

          {/* File attachment */}
          {msg.message_type === 'file' &&
            msg.metadata &&
            typeof msg.metadata === 'object' &&
            'url' in msg.metadata && (
              <div className="mt-2 inline-flex items-center gap-2 px-3 py-2 bg-muted/50 rounded-md">
                <svg
                  className="w-4 h-4 text-muted-foreground"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                <a
                  href={(msg.metadata as any).url}
                  download={(msg.metadata as any).filename || 'file'}
                  className="text-sm hover:underline"
                >
                  {(msg.metadata as any).filename || 'Download file'}
                </a>
                {(msg.metadata as any).size && (
                  <span className="text-xs text-muted-foreground">
                    ({formatFileSize((msg.metadata as any).size)})
                  </span>
                )}
              </div>
            )}

          {/* Reactions display */}
          {(() => {
            const reactions = getReactionCounts(msg);
            if (reactions.length === 0) return null;

            return (
              <div className="flex flex-wrap gap-1 mt-1">
                {reactions.map((reaction) => (
                  <button
                    key={reaction.emoji}
                    onClick={() => {
                      const hasReacted = reaction.userIds.includes(
                        user?.id || '',
                      );
                      if (hasReacted) {
                        onRemoveReaction(msg.id, reaction.emoji);
                      } else {
                        onAddReaction(msg.id, reaction.emoji);
                      }
                    }}
                    className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full bg-muted hover:bg-muted/80 transition-colors"
                  >
                    <span>{reaction.emoji}</span>
                    <span className="text-muted-foreground">
                      {reaction.count}
                    </span>
                  </button>
                ))}
              </div>
            );
          })()}
        </div>

        {/* Action buttons column */}
        <div className="absolute -top-3 right-4 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 bg-background/95 backdrop-blur-sm rounded-md shadow-sm p-1">
          <button
            type="button"
            onClick={() => onEmojiPicker(msg.id)}
            className="text-xs p-1 hover:bg-muted rounded transition-colors px-2"
            title="Add reaction"
          >
            React
          </button>
          <button
            type="button"
            onClick={() => onReply(msg)}
            className="text-xs italic text-muted-foreground hover:text-foreground transition-colors px-2"
            title="Reply to this message"
          >
            Reply
          </button>
          {msg.sender_id === user?.id && !isDeleted && (
            <>
              <button
                type="button"
                onClick={() => onStartEdit(msg)}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors px-2"
                title="Edit message"
              >
                Edit
              </button>
              <button
                type="button"
                onClick={() => onDelete(msg.id)}
                className="text-xs text-destructive hover:text-destructive/80 transition-colors px-2"
                title="Delete message"
              >
                Delete
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
});

MessageRow.displayName = 'MessageRow';
