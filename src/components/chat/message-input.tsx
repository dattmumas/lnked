'use client';

import clsx from 'clsx';
import { useEffect, useState, useRef } from 'react';

import { useUser } from '@/hooks/useUser';
import { selectAdapter } from '@/lib/chat/realtime-adapter';

import type { MessageWithSender as Message } from '@/lib/chat/types';

const realTime = selectAdapter();

interface Props {
  channelId: string;
  className?: string;
  onSent?: (msg: Message) => void;
  replyTarget?: Message | null;
  onClearReply?: () => void;
}

export function MessageInput({
  channelId,
  className,
  onSent,
  replyTarget,
  onClearReply,
}: Props) {
  const [text, setText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);
  const lastSentRef = useRef<number>(0);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { user } = useUser();

  // Auto-resize textarea
  useEffect((): void => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    textarea.style.height = 'auto';
    textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
  }, [text]);

  // Clear error after 5 seconds
  useEffect((): void => {
    if (error) {
      const timeout = setTimeout(() => setError(undefined), 5000);
      return () => clearTimeout(timeout);
    }
  }, [error]);

  // Debounce typing stop
  useEffect((): void => {
    if (!channelId) return;
    if (isTyping) {
      Promise.resolve(realTime.broadcastTyping(channelId, true));
      const timeout = setTimeout(() => {
        setIsTyping(false);
        Promise.resolve(realTime.broadcastTyping(channelId, false)).catch(
          console.error,
        );
      }, 3000);
      return () => clearTimeout(timeout);
    }
  }, [isTyping, channelId]);

  // Clear previous timeout on each keypress
  const scheduleTypingStop = () => {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      Promise.resolve(realTime.broadcastTyping(channelId, false)).catch(
        console.error,
      );
    }, 3000);
  };

  const updateTyping = () => {
    if (!isTyping) {
      setIsTyping(true);
      Promise.resolve(realTime.broadcastTyping(channelId, true)).catch(
        console.error,
      );
    }
    scheduleTypingStop();
  };

  const handleSend = async (
    messageType: string = 'text',
    content?: string,
    metadata?: any,
  ) => {
    const messageContent = content || text.trim();
    if (!messageContent && messageType === 'text') return;
    if (sending) return; // Prevent double sends

    const originalText = text; // Save for restoration on error
    if (messageType === 'text') {
      setText('');
    }
    setIsTyping(false);
    setSending(true);
    setError(undefined);

    try {
      // Optimistic echo
      if (user && onSent) {
        const optimistic: Message = {
          id: `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          conversation_id: channelId,
          sender_id: user.id,
          content: messageContent,
          message_type: messageType,
          metadata: metadata || {},
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          edited_at: null,
          deleted_at: null,
          reply_to_id: replyTarget?.id ?? null,
          sender: {
            id: user.id,
            full_name: (user as any).full_name ?? null,
            username: (user as any).username ?? null,
            avatar_url: (user as any).avatar_url ?? null,
          },
          reply_to: replyTarget as any,
        } as any;
        onSent(optimistic);
      }

      const body = {
        content: messageContent,
        message_type: messageType,
        metadata: metadata || {},
        ...(replyTarget ? { reply_to_id: replyTarget.id } : {}),
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
      if (onClearReply) {
        onClearReply();
      }
    } catch (err: unknown) {
      console.error('Failed to send message', err);
      setError('Failed to send message. Please try again.');

      // Restore the text so user can retry
      if (messageType === 'text') {
        setText(originalText);
      }

      // TODO: Remove the optimistic message from the UI
      // This would require tracking the temp ID and a callback to remove it
    } finally {
      setSending(false);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      // For now, we'll just show a placeholder message
      // In a real implementation, you'd upload to Supabase Storage or similar
      const isImage = file.type.startsWith('image/');

      // Create a local URL for preview (in real app, upload to storage)
      const localUrl = URL.createObjectURL(file);

      await handleSend(isImage ? 'image' : 'file', file.name, {
        url: localUrl,
        filename: file.name,
        size: file.size,
        type: file.type,
      });

      // Note: In production, you'd upload to storage and use the real URL
      console.log('File upload not implemented yet. Would upload:', file);
    } catch (err: unknown) {
      console.error('Failed to upload file:', err);
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className="flex flex-col gap-1">
      {/* Error message */}
      {error && (
        <div className="mx-2 px-3 py-2 bg-destructive/10 text-destructive rounded-md text-sm flex items-center gap-2">
          <svg
            className="w-4 h-4 shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <span>{error}</span>
        </div>
      )}

      {/* Reply preview */}
      {replyTarget && (
        <div className="mx-2 px-3 py-2 bg-muted/50 rounded-md flex items-center justify-between text-xs">
          <div className="flex-1 min-w-0">
            <span className="text-muted-foreground">Replying to </span>
            <span className="font-medium">
              @{replyTarget.sender?.username ?? 'Unknown'}
            </span>
            <span className="text-muted-foreground">: </span>
            <span className="truncate">
              "{replyTarget.content?.substring(0, 50)}
              {replyTarget.content && replyTarget.content.length > 50
                ? '...'
                : ''}
              "
            </span>
          </div>
          <button
            type="button"
            onClick={onClearReply}
            className="ml-2 p-1 hover:bg-muted rounded transition-colors"
            title="Cancel reply"
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
          onChange={(e) => {
            setText(e.target.value);
            updateTyping();
          }}
          placeholder="Type a message..."
          className="flex-1 bg-transparent px-3 py-2 placeholder:text-muted-foreground focus:outline-none resize-none min-h-[40px] max-h-[120px] text-[15px] leading-relaxed font-normal"
          rows={1}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey && !sending) {
              e.preventDefault();
              void handleSend('text');
            }
          }}
          disabled={sending}
        />

        {/* File input (hidden) */}
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={handleFileSelect}
          accept="image/*,video/*,.pdf,.doc,.docx,.txt,.zip,.rar"
        />

        {/* Attachment button */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="p-2 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          title="Add attachment"
          disabled={uploading || sending}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
        </button>

        <button
          type="button"
          onClick={() => void handleSend('text')}
          className="rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground hover:bg-primary/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors min-w-[70px]"
          disabled={!text.trim() || uploading || sending}
        >
          {sending ? (
            <span className="flex items-center gap-1">
              <svg
                className="animate-spin h-3 w-3"
                viewBox="0 0 24 24"
                fill="none"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
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
