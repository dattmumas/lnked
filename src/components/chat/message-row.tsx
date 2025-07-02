'use client';

import clsx from 'clsx';
import Image from 'next/image';
import {
  memo,
  CSSProperties,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

import { MessageEditForm } from './message-edit-form';

import type { MessageWithSender as Message } from '@/lib/chat/types';

// Define OptimisticMessage type locally since useOptimisticMessages is deprecated
interface OptimisticMessage extends Message {
  isOptimistic: boolean;
  sendStatus?: 'sending' | 'sent' | 'failed';
  tempId?: string;
}

// Constants to avoid magic numbers
const MESSAGE_GROUP_TIME_THRESHOLD_MINUTES = 5;
const MESSAGE_GROUP_TIME_THRESHOLD_SECONDS = 60;
const MILLISECONDS_PER_SECOND = 1000;
const MESSAGE_GROUP_TIME_THRESHOLD_MS =
  MESSAGE_GROUP_TIME_THRESHOLD_MINUTES *
  MESSAGE_GROUP_TIME_THRESHOLD_SECONDS *
  MILLISECONDS_PER_SECOND;
const CONTENT_PREVIEW_LENGTH = 50;
const AVATAR_SIZE = 32;
const THUMBNAIL_SIZE = 80;

// Type definitions for message metadata
interface EmbedMetadata {
  embed: {
    title?: string;
    description?: string;
    url?: string;
    image?: string;
  };
}

interface ImageMetadata {
  url: string;
  alt?: string;
}

interface FileMetadata {
  url: string;
  filename?: string;
  size?: number;
}

// User type for better type safety
interface User {
  id: string;
  username?: string | null;
  full_name?: string | null;
  avatar_url?: string | null;
}

interface ReactionCount {
  emoji: string;
  count: number;
  userIds: string[];
}

// Optimized props interface for better memo performance
interface MessageRowProps {
  index: number;
  style: CSSProperties;
  message: Message | OptimisticMessage;
  previousMessage?: Message | null;
  lastReadAt: string | null;
  user: User | null;
  editingId: string | null;
  reactions: ReactionCount[];
  onStartEdit: (msg: Message) => void;
  onDelete: (messageId: string) => void;
  onReply: (msg: Message) => void;
  onAddReaction: (messageId: string, emoji: string) => void;
  onRemoveReaction: (messageId: string, emoji: string) => void;
  onEmojiPicker: (messageId: string) => void;
  onSaveEdit: (messageId: string, content: string) => void;
  onCancelEdit: () => void;
  onRetryMessage?: (tempId: string) => void;
  formatFileSize: (bytes: number) => string;
  setItemSize?: (index: number, size: number) => void;
}

// Type guards
function isEmbedMetadata(metadata: unknown): metadata is EmbedMetadata {
  return (
    typeof metadata === 'object' &&
    metadata !== null &&
    'embed' in metadata &&
    typeof (metadata as EmbedMetadata).embed === 'object'
  );
}

function isImageMetadata(metadata: unknown): metadata is ImageMetadata {
  return (
    typeof metadata === 'object' &&
    metadata !== null &&
    'url' in metadata &&
    typeof (metadata as ImageMetadata).url === 'string'
  );
}

function isFileMetadata(metadata: unknown): metadata is FileMetadata {
  return (
    typeof metadata === 'object' &&
    metadata !== null &&
    'url' in metadata &&
    typeof (metadata as FileMetadata).url === 'string'
  );
}

// Extracted FileIcon component
const FileIcon = memo(
  (): React.JSX.Element => (
    <svg
      className="w-4 h-4 text-muted-foreground"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
      />
    </svg>
  ),
);

FileIcon.displayName = 'FileIcon';

// Extracted ImageAttachment component
interface ImageAttachmentProps {
  metadata: ImageMetadata;
  onImageClick: (url: string) => void;
}

const ImageAttachment = memo<ImageAttachmentProps>(
  ({ metadata, onImageClick }): React.JSX.Element => {
    const handleImageClick = useCallback((): void => {
      onImageClick(metadata.url);
    }, [onImageClick, metadata.url]);

    return (
      <div className="mt-2">
        <button
          type="button"
          onClick={handleImageClick}
          className="block max-w-sm rounded-lg cursor-pointer hover:opacity-90 transition-opacity focus:outline-none focus:ring-2 focus:ring-primary"
          aria-label={`View full image: ${metadata.alt ?? 'Image attachment'}`}
        >
          <Image
            src={metadata.url}
            alt={metadata.alt ?? 'Image attachment'}
            width={400}
            height={300}
            className="rounded-lg object-cover"
          />
        </button>
      </div>
    );
  },
);

ImageAttachment.displayName = 'ImageAttachment';

// Extracted FileAttachment component
interface FileAttachmentProps {
  metadata: FileMetadata;
  formatFileSize: (bytes: number) => string;
}

const FileAttachment = memo<FileAttachmentProps>(
  ({ metadata, formatFileSize }): React.JSX.Element => (
    <div className="mt-2 inline-flex items-center gap-2 px-3 py-2 bg-muted/50 rounded-md">
      <FileIcon />
      <a
        href={metadata.url}
        download={metadata.filename ?? 'file'}
        className="text-sm hover:underline"
      >
        {metadata.filename ?? 'Download file'}
      </a>
      {typeof metadata.size === 'number' && (
        <span className="text-xs text-muted-foreground">
          ({formatFileSize(metadata.size)})
        </span>
      )}
    </div>
  ),
);

FileAttachment.displayName = 'FileAttachment';

// Individual Reaction Button component
interface ReactionButtonProps {
  reaction: ReactionCount;
  userId: string | null;
  messageId: string;
  onAddReaction: (messageId: string, emoji: string) => void;
  onRemoveReaction: (messageId: string, emoji: string) => void;
}

const ReactionButton = memo<ReactionButtonProps>(
  ({
    reaction,
    userId,
    messageId,
    onAddReaction,
    onRemoveReaction,
  }): React.JSX.Element => {
    const handleClick = useCallback((): void => {
      if (typeof userId !== 'string') return;

      const hasReacted = reaction.userIds.includes(userId);
      if (hasReacted) {
        onRemoveReaction(messageId, reaction.emoji);
      } else {
        onAddReaction(messageId, reaction.emoji);
      }
    }, [
      userId,
      messageId,
      reaction.userIds,
      reaction.emoji,
      onAddReaction,
      onRemoveReaction,
    ]);

    const handleKeyDown = useCallback(
      (e: React.KeyboardEvent): void => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleClick();
        }
      },
      [handleClick],
    );

    return (
      <button
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full bg-muted hover:bg-muted/80 transition-colors focus:outline-none focus:ring-2 focus:ring-primary"
        aria-label={`${reaction.emoji} reaction, ${reaction.count} ${reaction.count === 1 ? 'person' : 'people'}`}
        tabIndex={0}
      >
        <span>{reaction.emoji}</span>
        <span className="text-muted-foreground">{reaction.count}</span>
      </button>
    );
  },
);

ReactionButton.displayName = 'ReactionButton';

// Extracted ReactionBar component
interface ReactionBarProps {
  reactions: ReactionCount[];
  userId: string | null;
  messageId: string;
  onAddReaction: (messageId: string, emoji: string) => void;
  onRemoveReaction: (messageId: string, emoji: string) => void;
}

const ReactionBar = memo<ReactionBarProps>(
  ({
    reactions,
    userId,
    messageId,
    onAddReaction,
    onRemoveReaction,
  }): React.JSX.Element | null => {
    if (reactions.length === 0) return null;

    return (
      <div
        className="flex flex-wrap gap-1 mt-1"
        role="group"
        aria-label="Message reactions"
      >
        {reactions.map((reaction) => (
          <ReactionButton
            key={reaction.emoji}
            reaction={reaction}
            userId={userId}
            messageId={messageId}
            onAddReaction={onAddReaction}
            onRemoveReaction={onRemoveReaction}
          />
        ))}
      </div>
    );
  },
);

ReactionBar.displayName = 'ReactionBar';

// Extracted components to prevent re-renders
const MarkdownParagraph = (
  props: React.HTMLProps<HTMLParagraphElement>,
): React.JSX.Element => (
  <p
    {...props}
    className="whitespace-pre-wrap break-words text-foreground my-0 text-[15px] leading-relaxed font-normal max-w-full overflow-hidden"
  >
    {props.children}
  </p>
);

const MarkdownLink = (
  props: React.HTMLProps<HTMLAnchorElement>,
): React.JSX.Element => (
  <a
    {...props}
    target="_blank"
    rel="noopener noreferrer"
    className="text-primary hover:underline"
  >
    {props.children}
  </a>
);

const MarkdownCode = (
  props: React.HTMLProps<HTMLElement>,
): React.JSX.Element => {
  const isInline = typeof props.className !== 'string';
  return isInline ? (
    <code className="bg-muted px-1 py-0.5 rounded text-sm font-mono">
      {props.children}
    </code>
  ) : (
    <code {...props}>{props.children}</code>
  );
};

const MarkdownPre = (
  props: React.HTMLProps<HTMLPreElement>,
): React.JSX.Element => (
  <pre
    {...props}
    className="bg-muted p-3 rounded-md overflow-x-auto my-2 font-mono text-sm"
  >
    {props.children}
  </pre>
);

// Helper functions moved outside component
function formatTimestamp(date: string): string {
  return new Date(date).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function truncateContent(content: string, maxLength: number): string {
  if (content.length <= maxLength) return content;
  return `${content.substring(0, maxLength)}...`;
}

function getUserDisplayName(sender: Message['sender']): string {
  if (sender === null || sender === undefined) return 'Anonymous';
  return sender.username ?? sender.full_name ?? 'Anonymous';
}

// Memoized grouping logic
function useMessageGrouping(
  message: Message,
  previousMessage?: Message | null,
): boolean {
  return useMemo(() => {
    const sameSender = Boolean(
      previousMessage?.sender_id === message.sender_id,
    );
    let withinTimeThreshold = false;

    if (
      typeof previousMessage?.created_at === 'string' &&
      typeof message.created_at === 'string' &&
      sameSender
    ) {
      const timeDiff = Math.abs(
        new Date(message.created_at).getTime() -
          new Date(previousMessage.created_at).getTime(),
      );
      withinTimeThreshold = timeDiff < MESSAGE_GROUP_TIME_THRESHOLD_MS;
    }

    return !sameSender || !withinTimeThreshold;
  }, [message.sender_id, message.created_at, previousMessage]);
}

// Optimized height measurement with ResizeObserver
function useResizeObserver(
  ref: React.RefObject<HTMLElement | null>,
  index: number,
  setItemSize?: (index: number, size: number) => void,
): void {
  const observerRef = useRef<ResizeObserver | null>(null);
  const lastHeightRef = useRef<number>(0);

  useEffect(() => {
    const element = ref.current;
    if (element === null || setItemSize === undefined) {
      return undefined;
    }

    observerRef.current = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const newHeight = entry.contentRect.height;
        // Only update if height actually changed
        if (newHeight !== lastHeightRef.current) {
          lastHeightRef.current = newHeight;
          requestAnimationFrame(() => {
            setItemSize(index, newHeight);
          });
        }
      }
    });

    observerRef.current.observe(element);

    return (): void => {
      if (observerRef.current !== null) {
        observerRef.current.disconnect();
      }
    };
  }, [ref, index, setItemSize]);
}

export const MessageRow = memo<MessageRowProps>(
  ({
    index,
    style,
    message,
    previousMessage,
    lastReadAt,
    user,
    editingId,
    reactions,
    onStartEdit,
    onDelete,
    onReply,
    onAddReaction,
    onRemoveReaction,
    onEmojiPicker,
    onSaveEdit,
    onCancelEdit,
    onRetryMessage,
    formatFileSize,
    setItemSize,
  }): React.JSX.Element => {
    const rowRef = useRef<HTMLDivElement>(null);

    // Use ResizeObserver for better performance
    useResizeObserver(rowRef, index, setItemSize);

    // Memoized grouping logic
    const isNewGroup = useMessageGrouping(message, previousMessage);

    // Check if this is an optimistic message
    const optimisticMessage = message as OptimisticMessage;
    const isOptimistic = optimisticMessage.isOptimistic === true;
    const sendStatus = optimisticMessage.sendStatus || 'sent';
    const isFailed = sendStatus === 'failed';
    const isSending = sendStatus === 'sending';

    const handleImageClick = useCallback((url: string): void => {
      window.open(url, '_blank');
    }, []);

    const handleStartEdit = useCallback((): void => {
      onStartEdit(message);
    }, [onStartEdit, message]);

    const handleDelete = useCallback((): void => {
      onDelete(message.id);
    }, [onDelete, message.id]);

    const handleReply = useCallback((): void => {
      onReply(message);
    }, [onReply, message]);

    const handleEmojiPicker = useCallback((): void => {
      onEmojiPicker(message.id);
    }, [onEmojiPicker, message.id]);

    const handleRetry = useCallback((): void => {
      if (
        optimisticMessage.tempId !== undefined &&
        optimisticMessage.tempId !== null &&
        optimisticMessage.tempId !== '' &&
        onRetryMessage !== undefined
      ) {
        onRetryMessage(optimisticMessage.tempId);
      }
    }, [optimisticMessage.tempId, onRetryMessage]);

    // Memoized computed values
    const isDeleted = Boolean(message.deleted_at);
    const isEdited = Boolean(message.edited_at);
    const isEditing = editingId === message.id;

    // Check if this is the first unread message
    const isFirstUnread = useMemo(() => {
      return Boolean(
        typeof lastReadAt === 'string' &&
          typeof message.created_at === 'string' &&
          new Date(message.created_at).getTime() >
            new Date(lastReadAt).getTime() &&
          (typeof previousMessage?.created_at !== 'string' ||
            new Date(previousMessage.created_at).getTime() <=
              new Date(lastReadAt).getTime()),
      );
    }, [lastReadAt, message.created_at, previousMessage?.created_at]);

    // Generate unique ID for accessibility
    const unreadIndicatorId = `unread-indicator-${message.id}`;

    return (
      <div ref={rowRef} style={style}>
        {/* Last read indicator */}
        {isFirstUnread && (
          <div
            id={unreadIndicatorId}
            className="relative flex items-center gap-3 my-6 px-4"
            role="separator"
            aria-label="New messages"
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
            isNewGroup ? 'mt-3' : '',
          )}
        >
          {/* Avatar column */}
          {isNewGroup ? (
            <Image
              src={message.sender?.avatar_url ?? '/avatar-placeholder.png'}
              alt={`${getUserDisplayName(message.sender)} avatar`}
              width={AVATAR_SIZE}
              height={AVATAR_SIZE}
              className="mt-1 rounded-full object-cover"
            />
          ) : (
            <span className="w-8" aria-hidden="true" />
          )}

          {/* Content column */}
          <div className="flex-1 min-w-0 text-sm word-break-break-word">
            {isNewGroup && (
              <div className="flex items-baseline gap-2">
                <span className="font-medium">
                  {getUserDisplayName(message.sender)}
                </span>
                {typeof message.created_at === 'string' && (
                  <span className="text-xs text-muted-foreground">
                    {formatTimestamp(message.created_at)}
                  </span>
                )}
              </div>
            )}

            {/* Reply preview if this message is replying to another */}
            {message.reply_to_id !== null &&
              message.reply_to !== null &&
              message.reply_to !== undefined && (
                <div className="mb-1 ml-2 pl-2 border-l-2 border-border/50 text-xs text-muted-foreground">
                  Replying to{' '}
                  <span className="font-medium">
                    @{getUserDisplayName(message.reply_to.sender)}
                  </span>
                  : &quot;
                  {message.reply_to.deleted_at !== null
                    ? 'This message was deleted'
                    : typeof message.reply_to.content === 'string'
                      ? truncateContent(
                          message.reply_to.content,
                          CONTENT_PREVIEW_LENGTH,
                        )
                      : ''}
                  &quot;
                </div>
              )}

            {isDeleted ? (
              <em className="italic text-xs text-muted-foreground">
                This message was deleted
              </em>
            ) : isEditing ? (
              // Edit mode with isolated form component
              <MessageEditForm
                messageId={message.id}
                initialContent={message.content ?? ''}
                onSave={onSaveEdit}
                onCancel={onCancelEdit}
              />
            ) : (
              <div
                className={`prose prose-sm dark:prose-invert break-words max-w-none ${
                  isFailed ? 'opacity-60' : isSending ? 'opacity-80' : ''
                }`}
              >
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    p: MarkdownParagraph,
                    a: MarkdownLink,
                    code: MarkdownCode,
                    pre: MarkdownPre,
                  }}
                >
                  {message.content ?? ''}
                </ReactMarkdown>

                {/* Message status indicators */}
                <div className="flex items-center gap-2 mt-1">
                  {isEdited && !isOptimistic && (
                    <span className="text-xs text-muted-foreground">
                      (edited)
                    </span>
                  )}
                  {isSending && (
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <div className="w-3 h-3 animate-spin rounded-full border border-current border-t-transparent" />
                      Sending...
                    </span>
                  )}
                  {isFailed && (
                    <button
                      onClick={handleRetry}
                      className="text-xs text-destructive hover:text-destructive/80 flex items-center gap-1 transition-colors"
                      title="Click to retry sending"
                    >
                      ⚠️ Failed to send - Click to retry
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Link preview if available */}
            {message.metadata !== null && isEmbedMetadata(message.metadata) && (
              <div className="mt-2 rounded-lg p-3 bg-muted/20">
                <div className="flex gap-3">
                  <div className="flex-1 min-w-0">
                    {typeof message.metadata.embed.title === 'string' && (
                      <h4 className="font-medium text-sm truncate">
                        {message.metadata.embed.title}
                      </h4>
                    )}
                    {typeof message.metadata.embed.description === 'string' && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {message.metadata.embed.description}
                      </p>
                    )}
                    {typeof message.metadata.embed.url === 'string' && (
                      <a
                        href={message.metadata.embed.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-primary hover:underline mt-1 block truncate"
                      >
                        {message.metadata.embed.url}
                      </a>
                    )}
                  </div>
                  {typeof message.metadata.embed.image === 'string' && (
                    <Image
                      src={message.metadata.embed.image}
                      alt="Link preview"
                      width={THUMBNAIL_SIZE}
                      height={THUMBNAIL_SIZE}
                      className="object-cover rounded"
                    />
                  )}
                </div>
              </div>
            )}

            {/* Image attachment */}
            {message.message_type === 'image' &&
              message.metadata !== null &&
              isImageMetadata(message.metadata) && (
                <ImageAttachment
                  metadata={message.metadata}
                  onImageClick={handleImageClick}
                />
              )}

            {/* File attachment */}
            {message.message_type === 'file' &&
              message.metadata !== null &&
              isFileMetadata(message.metadata) && (
                <FileAttachment
                  metadata={message.metadata}
                  formatFileSize={formatFileSize}
                />
              )}

            {/* Reactions display */}
            <ReactionBar
              reactions={reactions}
              userId={user?.id ?? null}
              messageId={message.id}
              onAddReaction={onAddReaction}
              onRemoveReaction={onRemoveReaction}
            />
          </div>

          {/* Action buttons column */}
          <div className="absolute -top-3 right-4 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 bg-background/95 backdrop-blur-sm rounded-md shadow-sm p-1">
            <button
              type="button"
              onClick={handleEmojiPicker}
              className="text-xs p-1 hover:bg-muted rounded transition-colors px-2 focus:outline-none focus:ring-2 focus:ring-primary"
              title="Add reaction"
            >
              React
            </button>
            <button
              type="button"
              onClick={handleReply}
              className="text-xs italic text-muted-foreground hover:text-foreground transition-colors px-2 focus:outline-none focus:ring-2 focus:ring-primary"
              title="Reply to this message"
            >
              Reply
            </button>
            {message.sender_id === user?.id && !isDeleted && (
              <>
                <button
                  type="button"
                  onClick={handleStartEdit}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors px-2 focus:outline-none focus:ring-2 focus:ring-primary"
                  title="Edit message"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  className="text-xs text-destructive hover:text-destructive/80 transition-colors px-2 focus:outline-none focus:ring-2 focus:ring-primary"
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
  },
);

MessageRow.displayName = 'MessageRow';

// Legacy props interface for backward compatibility
interface LegacyMessageRowProps {
  index: number;
  style: CSSProperties;
  data: {
    messages: (Message | OptimisticMessage)[];
    lastReadAt: string | null;
    user: User | null;
    onStartEdit: (msg: Message) => void;
    onDelete: (messageId: string) => void;
    onReply: (msg: Message) => void;
    onAddReaction: (messageId: string, emoji: string) => void;
    onRemoveReaction: (messageId: string, emoji: string) => void;
    onEmojiPicker: (messageId: string) => void;
    editingId: string | null;
    onSaveEdit: (messageId: string, content: string) => void;
    onCancelEdit: () => void;
    onRetryMessage?: (tempId: string) => void;
    getReactionCounts: (
      message: Message | OptimisticMessage,
    ) => ReactionCount[];
    formatFileSize: (bytes: number) => string;
    setItemSize?: (index: number, size: number) => void;
  };
}

// Wrapper component for backward compatibility with virtual list
export const MessageRowLegacy = memo<LegacyMessageRowProps>(
  ({ index, style, data }): React.JSX.Element | null => {
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
      onSaveEdit,
      onCancelEdit,
      onRetryMessage,
      getReactionCounts,
      formatFileSize,
      setItemSize,
    } = data;

    const message = messages[index];
    // Fix: ensure previousMessage is never undefined - only Message or null
    const previousMessage = index > 0 ? (messages[index - 1] ?? null) : null;

    // Pre-compute reactions to avoid recalculation on every render
    // Must be called before early return to comply with hooks rules
    const reactions = useMemo(
      () =>
        typeof message === 'object' && message !== null
          ? getReactionCounts(message)
          : [],
      [getReactionCounts, message],
    );

    if (typeof message !== 'object' || message === null) return null;

    return (
      <MessageRow
        index={index}
        style={style}
        message={message}
        previousMessage={previousMessage}
        lastReadAt={lastReadAt}
        user={user}
        editingId={editingId}
        reactions={reactions}
        onStartEdit={onStartEdit}
        onDelete={onDelete}
        onReply={onReply}
        onAddReaction={onAddReaction}
        onRemoveReaction={onRemoveReaction}
        onEmojiPicker={onEmojiPicker}
        onSaveEdit={onSaveEdit}
        onCancelEdit={onCancelEdit}
        formatFileSize={formatFileSize}
        {...(onRetryMessage ? { onRetryMessage } : {})}
        {...(setItemSize ? { setItemSize } : {})}
      />
    );
  },
);

MessageRowLegacy.displayName = 'MessageRowLegacy';
