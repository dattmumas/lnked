'use client';

import clsx from 'clsx';
import { useEffect, useReducer, useRef, useCallback } from 'react';

import { useToast } from '@/hooks/useToast';
import { useTypingStatus } from '@/hooks/useTypingStatus';
import { useUser } from '@/hooks/useUser';

import { AttachmentIcon } from './icons/AttachmentIcon';
import { LoadingSpinner } from './icons/LoadingSpinner';

import type { MessageWithSender as Message } from '@/lib/chat/types';

// Constants to replace magic numbers
const MAX_TEXTAREA_HEIGHT = 120;
const ERROR_TIMEOUT_MS = 5000;
const BLOB_CLEANUP_DELAY_MS = 1000;
const MAX_FILE_SIZE_MB = 25;
const BYTES_PER_KB = 1024;
const KB_PER_MB = 1024;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * KB_PER_MB * BYTES_PER_KB;
// Constants for fallback ID generation
const FALLBACK_RADIX = 36;
const FALLBACK_START_INDEX = 2;
const FALLBACK_LENGTH = 9;

// Generate temporary ID for optimistic updates (client-side only, not security-sensitive)
const generateTempId = (): string => {
  if (
    typeof crypto !== 'undefined' &&
    crypto.randomUUID !== null &&
    crypto.randomUUID !== undefined
  ) {
    return `temp-${Date.now()}-${crypto.randomUUID()}`;
  }
  // Fallback for environments without crypto.randomUUID (temp IDs only)
  return `temp-${Date.now()}-${Math.random().toString(FALLBACK_RADIX).substr(FALLBACK_START_INDEX, FALLBACK_LENGTH)}`;
};
const CONTENT_PREVIEW_LENGTH = 50;

// Discriminated union for message metadata
interface FileMetadata {
  type: 'file';
  url: string;
  filename: string;
  size: number;
  mimeType: string;
}

interface ImageMetadata {
  type: 'image';
  url: string;
  filename: string;
  size: number;
  mimeType: string;
  width?: number;
  height?: number;
}

interface TextMetadata {
  type: 'text';
}

type MessageMetadata = FileMetadata | ImageMetadata | TextMetadata;

// Shared interface to avoid shape drift with useUser
interface AuthUser {
  id: string;
  full_name?: string | null;
  username?: string | null;
  avatar_url?: string | null;
}

// State management with useReducer
interface MessageInputState {
  text: string;
  sending: boolean;
  uploading: boolean;
  error: string | null;
}

type MessageInputAction =
  | { type: 'SET_TEXT'; payload: string }
  | { type: 'SET_SENDING'; payload: boolean }
  | { type: 'SET_UPLOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'RESET_TEXT' }
  | { type: 'RESET_ERROR' };

const initialState: MessageInputState = {
  text: '',
  sending: false,
  uploading: false,
  error: null,
};

function messageInputReducer(
  state: MessageInputState,
  action: MessageInputAction,
): MessageInputState {
  switch (action.type) {
    case 'SET_TEXT':
      return { ...state, text: action.payload };
    case 'SET_SENDING':
      return { ...state, sending: action.payload };
    case 'SET_UPLOADING':
      return { ...state, uploading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    case 'RESET_TEXT':
      return { ...state, text: '' };
    case 'RESET_ERROR':
      return { ...state, error: null };
    default:
      return state;
  }
}

interface Props {
  channelId: string;
  className?: string;
  onSent?: (msg: Message) => void;
  replyTarget?: Message | null;
  onClearReply?: () => void;
  onSendError?: (tempId: string) => void;
  _pendingIds?: Set<string>;
}

export function MessageInput({
  channelId,
  className,
  onSent,
  replyTarget,
  onClearReply,
  onSendError,
  _pendingIds,
}: Props): React.JSX.Element {
  const [state, dispatch] = useReducer(messageInputReducer, initialState);
  const { text, sending, uploading, error } = state;
  const lastSentRef = useRef<number>(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const blobUrlsRef = useRef<Set<string>>(new Set());
  const isActiveRef = useRef<boolean>(true);
  const resizeTimeoutRef = useRef<number | null>(null);
  const { user } = useUser();
  const { registerKeystroke } = useTypingStatus(channelId);
  const { error: showToastError } = useToast();

  // Auto-resize textarea with optimized reflow batching
  useEffect((): void => {
    const textarea = textareaRef.current;
    if (textarea === null) return;

    // Cancel any pending resize
    if (resizeTimeoutRef.current !== null) {
      cancelAnimationFrame(resizeTimeoutRef.current);
    }

    // Batch resize in next animation frame to prevent multiple reflows
    resizeTimeoutRef.current = requestAnimationFrame(() => {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, MAX_TEXTAREA_HEIGHT)}px`;
      resizeTimeoutRef.current = null;
    });
  }, [text]);

  // Clear error after timeout (now using toast instead)
  useEffect((): (() => void) | void => {
    if (error !== null && error !== undefined && error !== '') {
      showToastError(error);
      const timeout = setTimeout(() => {
        dispatch({ type: 'RESET_ERROR' });
      }, ERROR_TIMEOUT_MS);
      return () => {
        clearTimeout(timeout);
      };
    }
    return undefined;
  }, [error, showToastError]);

  // Cleanup blob URLs on unmount and set inactive flag
  useEffect((): (() => void) => {
    const blobUrls = blobUrlsRef.current;
    return () => {
      isActiveRef.current = false;

      // Cancel any pending resize operations
      if (resizeTimeoutRef.current !== null) {
        cancelAnimationFrame(resizeTimeoutRef.current);
      }

      // Revoke all blob URLs to prevent memory leaks
      blobUrls.forEach((url) => {
        URL.revokeObjectURL(url);
      });
      blobUrls.clear();
    };
  }, []);

  const handleSend = useCallback(
    async (
      messageType: 'text' | 'image' | 'file' = 'text',
      content?: string,
      metadata?: MessageMetadata,
    ): Promise<void> => {
      const messageContent = content ?? text.trim();
      if (
        (messageContent === null ||
          messageContent === undefined ||
          messageContent === '') &&
        messageType === 'text'
      )
        return;
      if (sending) return; // Prevent double sends

      const originalText = text; // Save for restoration on error
      const tempId = generateTempId();

      if (messageType === 'text') {
        dispatch({ type: 'RESET_TEXT' });
      }
      if (!isActiveRef.current) return;
      dispatch({ type: 'SET_SENDING', payload: true });
      dispatch({ type: 'RESET_ERROR' });

      try {
        // Optimistic echo
        if (user !== null && user !== undefined && onSent !== undefined) {
          const typedUser = user as AuthUser;
          const optimistic: Message = {
            id: tempId,
            conversation_id: channelId,
            sender_id: typedUser.id,
            content: messageContent,
            message_type: messageType,
            metadata: (metadata ?? {
              type: 'text' as const,
            }) as unknown as Message['metadata'],
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            edited_at: null,
            deleted_at: null,
            reply_to_id: replyTarget?.id ?? null,
            sender: {
              id: typedUser.id,
              full_name: typedUser.full_name ?? null,
              username: typedUser.username ?? null,
              avatar_url: typedUser.avatar_url ?? null,
            },
            reply_to: replyTarget ?? null,
          } as Message;
          onSent(optimistic);
        }

        const body = {
          content: messageContent,
          message_type: messageType,
          metadata: metadata ?? { type: 'text' as const },
          ...(replyTarget !== null && replyTarget !== undefined
            ? { reply_to_id: replyTarget.id }
            : {}),
        };

        const res = await fetch(`/api/chat/${channelId}/message`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });

        if (!res.ok) {
          throw new Error('Failed to send message');
        }

        lastSentRef.current = Date.now();

        // Clear reply target after sending
        if (onClearReply !== undefined) {
          onClearReply();
        }
      } catch (err: unknown) {
        console.error('Failed to send message', err);

        if (!isActiveRef.current) return;
        dispatch({
          type: 'SET_ERROR',
          payload: 'Failed to send message. Please try again.',
        });

        // Restore the text so user can retry
        if (messageType === 'text') {
          dispatch({ type: 'SET_TEXT', payload: originalText });
        }

        // Remove the optimistic message from the UI
        if (onSendError !== undefined) {
          onSendError(tempId);
        }
      } finally {
        if (isActiveRef.current) {
          dispatch({ type: 'SET_SENDING', payload: false });
        }
      }
    },
    [
      text,
      sending,
      user,
      onSent,
      channelId,
      replyTarget,
      onClearReply,
      onSendError,
      dispatch,
    ],
  );

  const handleFileSelectAsync = useCallback(
    async (file: File): Promise<void> => {
      if (!isActiveRef.current) return;

      // File size validation
      if (file.size > MAX_FILE_SIZE_BYTES) {
        showToastError(
          `File size too large. Maximum size is ${MAX_FILE_SIZE_MB}MB.`,
        );
        return;
      }

      dispatch({ type: 'SET_UPLOADING', payload: true });
      try {
        // For now, we'll just show a placeholder message
        // In a real implementation, you'd upload to Supabase Storage or similar
        const isImage = file.type.startsWith('image/');

        // Create a local URL for preview (in real app, upload to storage)
        const localUrl = URL.createObjectURL(file);

        // Track blob URL for cleanup
        blobUrlsRef.current.add(localUrl);

        try {
          const metadata: MessageMetadata = isImage
            ? {
                type: 'image' as const,
                url: localUrl,
                filename: file.name,
                size: file.size,
                mimeType: file.type,
              }
            : {
                type: 'file' as const,
                url: localUrl,
                filename: file.name,
                size: file.size,
                mimeType: file.type,
              };

          await handleSend(isImage ? 'image' : 'file', file.name, metadata);

          // On successful send, we can revoke the URL after a short delay
          // to allow the message to be rendered
          setTimeout(() => {
            URL.revokeObjectURL(localUrl);
            blobUrlsRef.current.delete(localUrl);
          }, BLOB_CLEANUP_DELAY_MS);
        } catch (uploadError: unknown) {
          // On error, immediately revoke the URL
          URL.revokeObjectURL(localUrl);
          blobUrlsRef.current.delete(localUrl);
          throw uploadError;
        }

        // Note: In production, you'd upload to storage and use the real URL
        console.warn('File upload not implemented yet. Would upload:', file);
      } catch (err: unknown) {
        console.error('Failed to upload file:', err);
        if (isActiveRef.current) {
          showToastError('Failed to upload file. Please try again.');
        }
      } finally {
        if (isActiveRef.current) {
          dispatch({ type: 'SET_UPLOADING', payload: false });
          if (fileInputRef.current !== null) {
            fileInputRef.current.value = '';
          }
        }
      }
    },
    [handleSend, showToastError, dispatch],
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>): void => {
      const file = e.target.files?.[0];
      if (file === null || file === undefined) return;
      void handleFileSelectAsync(file);
    },
    [handleFileSelectAsync],
  );

  const handleTextChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>): void => {
      dispatch({ type: 'SET_TEXT', payload: e.target.value });
      registerKeystroke();
    },
    [registerKeystroke],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>): void => {
      if (e.key === 'Enter' && !e.shiftKey && !sending) {
        e.preventDefault();
        void handleSend('text');
      }
    },
    [sending, handleSend],
  );

  const handleAttachmentClick = useCallback((): void => {
    fileInputRef.current?.click();
  }, []);

  const handleSendClick = useCallback((): void => {
    void handleSend('text');
  }, [handleSend]);

  const handleClearReplyClick = useCallback((): void => {
    if (onClearReply !== undefined) {
      onClearReply();
    }
  }, [onClearReply]);

  return (
    <div className="flex flex-col gap-1">
      {/* Reply preview with simplified optional chaining */}
      {replyTarget && (
        <div className="mx-2 px-3 py-2 bg-muted/50 rounded-md flex items-center justify-between text-xs">
          <div className="flex-1 min-w-0">
            <span className="text-muted-foreground">Replying to </span>
            <span className="font-medium">
              @
              {replyTarget.sender?.username ??
                replyTarget.sender?.full_name ??
                'Anonymous'}
            </span>
            <span className="text-muted-foreground">: </span>
            <span className="truncate">
              &quot;
              {replyTarget.content?.substring(0, CONTENT_PREVIEW_LENGTH) ?? ''}
              {(replyTarget.content?.length ?? 0) > CONTENT_PREVIEW_LENGTH
                ? '...'
                : ''}
              &quot;
            </span>
          </div>
          <button
            type="button"
            onClick={handleClearReplyClick}
            className="ml-2 p-1 hover:bg-muted rounded transition-colors"
            title="Cancel reply"
            aria-label="Cancel reply"
          >
            ✕
          </button>
        </div>
      )}

      {/* Message input */}
      <div
        className={clsx(
          'composer-container group flex items-center gap-2 p-2 bg-background',
          className,
        )}
      >
        <textarea
          ref={textareaRef}
          value={text}
          onChange={handleTextChange}
          placeholder="Type a message..."
          className="flex-1 bg-transparent px-3 py-2 placeholder:text-muted-foreground focus:outline-none resize-none min-h-[40px] max-h-[120px] text-[15px] leading-relaxed font-normal"
          rows={1}
          onKeyDown={handleKeyDown}
          disabled={sending}
          aria-label="Message input"
        />

        {/* File input (hidden) - Disabled until cloud storage is implemented */}
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={handleFileSelect}
          accept="image/*,video/*,.pdf,.doc,.docx,.txt,.zip,.rar"
          aria-label="File upload input"
          disabled
        />

        {/* Attachment button - Disabled until cloud storage is implemented */}
        <button
          type="button"
          onClick={handleAttachmentClick}
          className="p-2 text-muted-foreground/50 cursor-not-allowed opacity-50"
          title="File uploads coming soon"
          aria-label="File uploads coming soon"
          disabled
        >
          <AttachmentIcon />
        </button>

        <button
          type="button"
          onClick={handleSendClick}
          className="rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground hover:bg-primary/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors min-w-[70px]"
          disabled={text.trim() === '' || uploading || sending}
          aria-busy={sending}
          aria-label={sending ? 'Sending message' : 'Send message'}
        >
          {sending ? (
            <span className="flex items-center gap-1">
              <LoadingSpinner />
              Sending
            </span>
          ) : uploading ? (
            'Uploading...'
          ) : (
            'Send'
          )}
        </button>
      </div>
    </div>
  );
}
