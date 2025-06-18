'use client';

import { useQueryClient } from '@tanstack/react-query';
import clsx from 'clsx';
import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { VariableSizeList as List } from 'react-window';

import { useUser } from '@/hooks/useUser';
import { selectAdapter } from '@/lib/chat/realtime-adapter';
import { createSupabaseBrowserClient } from '@/lib/supabase/browser';

import { MessageInput } from './message-input';
import { MessageRow } from './message-row';

import type {
  MessageWithSender as Message,
  TypingIndicator,
} from '@/lib/chat/types';

const realTime = selectAdapter();

interface Props {
  channelId?: string;
  className?: string;
}

export function ConversationPanel({ channelId, className }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [typingUsers, setTypingUsers] = useState<TypingIndicator[]>([]);
  const [unread, setUnread] = useState(0);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [replyTarget, setReplyTarget] = useState<Message | null>(null);
  const [emojiPickerTarget, setEmojiPickerTarget] = useState<string | null>(
    null,
  );
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [lastReadAt, setLastReadAt] = useState<string | null>(null);
  const [hasScrolledToLastRead, setHasScrolledToLastRead] = useState(false);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const listRef = useRef<List>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  const { user } = useUser();

  // Message height cache for virtualization
  const itemHeights = useRef<{ [key: number]: number }>({});
  const getItemSize = useCallback(
    (index: number) => {
      // Default height estimate: 80px for new group, 40px for same group
      const msg = messages[index];
      if (!msg) return 80;

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

      // Check if this is the first unread message (adds extra height)
      const isFirstUnread =
        lastReadAt &&
        msg.created_at &&
        new Date(msg.created_at).getTime() > new Date(lastReadAt).getTime() &&
        (!prev ||
          !prev.created_at ||
          new Date(prev.created_at).getTime() <=
            new Date(lastReadAt).getTime());

      const baseHeight = newGroup ? 80 : 40;
      const unreadIndicatorHeight = isFirstUnread ? 60 : 0;

      return itemHeights.current[index] || baseHeight + unreadIndicatorHeight;
    },
    [messages, lastReadAt],
  );

  const setItemSize = useCallback((index: number, size: number) => {
    itemHeights.current[index] = size;
    if (listRef.current) {
      listRef.current.resetAfterIndex(index);
    }
  }, []);

  // Common emojis for quick picker
  const quickEmojis = ['👍', '❤️', '😂', '😊', '🔥', '👏', '😢', '🎉'];

  // Helper to aggregate reactions by emoji
  const getReactionCounts = (message: any) => {
    const reactions = message.message_reactions || [];
    const counts = new Map<
      string,
      { emoji: string; count: number; userIds: string[] }
    >();

    reactions.forEach((r: any) => {
      const existing = counts.get(r.emoji);
      if (existing) {
        existing.count++;
        existing.userIds.push(r.user_id);
      } else {
        counts.set(r.emoji, {
          emoji: r.emoji,
          count: 1,
          userIds: [r.user_id],
        });
      }
    });

    return Array.from(counts.values()).sort((a, b) => {
      // Sort by count descending, then by emoji for consistency
      if (b.count !== a.count) return b.count - a.count;
      return a.emoji.localeCompare(b.emoji);
    });
  };

  // Helper to keep scroll at bottom when user near bottom
  const scrollToBottom = useCallback(() => {
    if (listRef.current && messages.length > 0) {
      listRef.current.scrollToItem(messages.length - 1, 'end');
    }
  }, [messages.length]);

  // Helper to determine if user is near bottom (within 100px)
  const isNearBottom = (): boolean => {
    if (!containerRef.current) return true;
    const container = containerRef.current;
    const threshold = 100;
    return (
      container.scrollHeight - container.scrollTop - container.clientHeight <
      threshold
    );
  };

  // Initial fetch
  useEffect((): void => {
    if (!channelId) return;
    (async () => {
      try {
        // First, fetch the last_read_at timestamp
        if (user?.id) {
          const supabase = createSupabaseBrowserClient();
          const { data: participant } = await supabase
            .from('conversation_participants')
            .select('last_read_at')
            .eq('conversation_id', channelId)
            .eq('user_id', user.id)
            .single();

          if (participant?.last_read_at) {
            setLastReadAt(participant.last_read_at);
          }
        }

        const res = await fetch(`/api/chat/${channelId}/messages?limit=50`);
        if (!res.ok) throw new Error('Failed to fetch messages');
        const data: Message[] = await res.json();
        // Messages come from API in descending order, reverse to show oldest first
        setMessages(data.reverse());
        // Cache in React Query for quick channel switching
        queryClient.setQueryData(['channel-messages', channelId], data);

        // Don't immediately scroll to bottom if we have a last read position
        if (!lastReadAt) {
          scrollToBottom();
        }

        // Mark messages as read when conversation is loaded
        await markMessagesAsRead(channelId);
      } catch (err: unknown) {
        console.error(err);
      }
    })();
  }, [channelId, queryClient, scrollToBottom, user?.id]);

  // Helper function to mark messages as read
  const markMessagesAsRead = async (conversationId: string) => {
    if (!user?.id) return;

    try {
      const supabase = createSupabaseBrowserClient();
      const newLastReadAt = new Date().toISOString();
      const { error } = await supabase
        .from('conversation_participants')
        .update({ last_read_at: newLastReadAt })
        .eq('conversation_id', conversationId)
        .eq('user_id', user.id);

      if (!error) {
        // Update local state to remove the "New messages" indicator
        setLastReadAt(newLastReadAt);
      }
    } catch (error: unknown) {
      console.error('Failed to mark messages as read:', error);
    }
  };

  // Subscribe to new messages
  useEffect((): void => {
    if (!channelId) return;

    const handleNewMessage = (msg: Message) => {
      setMessages((prev) => {
        // Check if message already exists
        if (prev.some((m) => m.id === msg.id)) {
          return prev;
        }
        return [...prev, msg];
      });

      // Auto-scroll to bottom if user is near bottom
      if (isNearBottom()) {
        // Use requestAnimationFrame to ensure the list has updated
        requestAnimationFrame(() => {
          if (listRef.current && messages.length > 0) {
            listRef.current.scrollToItem(messages.length, 'end');
          }
        });
      } else {
        setUnread((prev) => prev + 1);
      }

      // Mark messages as read if user is at bottom
      if (isNearBottom()) {
        void markMessagesAsRead(channelId);
      }
    };

    const unsubPromise = realTime.subscribe(channelId, {
      onMessage: handleNewMessage,
      onMessageUpdate: (updated: Message) => {
        setMessages((prev) =>
          prev.map((m) => (m.id === updated.id ? updated : m)),
        );
      },
      onMessageDelete: (deletedId: string) => {
        setMessages((prev) => prev.filter((m) => m.id !== deletedId));
      },
      onTyping: (typing: TypingIndicator[]) => {
        setTypingUsers(typing);
      },
    } as any);
    return () => {
      void unsubPromise.then((unsub) => unsub?.());
    };
  }, [channelId, scrollToBottom, user?.id]);

  // Load older on scroll top
  useEffect((): void => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      // Check if we should show the scroll to bottom button
      const nearBottom = isNearBottom();
      setShowScrollToBottom(!nearBottom && messages.length > 0);

      if (container.scrollTop === 0 && messages.length && !loadingOlder) {
        setLoadingOlder(true);
        void (async () => {
          const oldest = messages[0].created_at;
          if (!oldest) return;
          try {
            const res = await fetch(
              `/api/chat/${channelId}/messages?before=${encodeURIComponent(oldest)}&limit=50`,
            );
            if (!res.ok) return;
            const older: Message[] = await res.json();
            if (older.length) {
              setMessages((prev) => {
                // Create a Set of existing message IDs for efficient lookup
                const existingIds = new Set(prev.map((m) => m.id));
                // Filter out any messages that already exist
                const uniqueOlder = older.filter((m) => !existingIds.has(m.id));
                // Reverse the older messages (they come in desc order) and prepend
                return [...uniqueOlder.reverse(), ...prev];
              });
              // maintain scroll position after prepending
              const prevHeight = container.scrollHeight;
              requestAnimationFrame(() => {
                const heightDiff = container.scrollHeight - prevHeight;
                container.scrollTop = heightDiff;
              });
            }
          } catch (err: unknown) {
            console.error(err);
          } finally {
            setLoadingOlder(false);
          }
        })();
      }

      // Clear unread when user scrolls to bottom
      if (nearBottom) {
        if (unread) setUnread(0);
        // Also mark messages as read when scrolling to bottom
        if (channelId) {
          void markMessagesAsRead(channelId);
        }
      }
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [messages, channelId, unread, loadingOlder]);

  // Effect to handle scrolling to last read indicator
  useEffect((): void => {
    if (
      lastReadAt &&
      messages.length > 0 &&
      !hasScrolledToLastRead &&
      listRef.current
    ) {
      // Find the index of the first unread message
      const firstUnreadIndex = messages.findIndex((msg) => {
        return (
          msg.created_at &&
          new Date(msg.created_at).getTime() > new Date(lastReadAt).getTime()
        );
      });

      if (firstUnreadIndex >= 0) {
        // Scroll to the first unread message
        listRef.current.scrollToItem(firstUnreadIndex, 'center');
        setHasScrolledToLastRead(true);
      }
    }
  }, [messages, lastReadAt, hasScrolledToLastRead]);

  // Update the virtualized list when container resizes
  const [containerHeight, setContainerHeight] = useState(600);
  const [containerWidth, setContainerWidth] = useState(800);

  useEffect((): void => {
    const updateSize = () => {
      if (containerRef.current) {
        setContainerHeight(containerRef.current.clientHeight);
        setContainerWidth(containerRef.current.clientWidth);
      }
    };

    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  // Handle adding a reaction
  const handleAddReaction = async (messageId: string, emoji: string) => {
    try {
      const res = await fetch(
        `/api/chat/${channelId}/messages/${messageId}/reactions`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ emoji }),
        },
      );

      if (!res.ok) throw new Error('Failed to add reaction');

      // Optimistically update the UI
      setMessages((prev) =>
        prev.map((msg) => {
          if (msg.id === messageId) {
            const reactions = (msg as any).message_reactions || [];
            return {
              ...msg,
              message_reactions: [
                ...reactions,
                { emoji, user_id: user?.id || '' },
              ],
            } as any;
          }
          return msg;
        }),
      );

      setEmojiPickerTarget(null);
    } catch (err: unknown) {
      console.error('Failed to add reaction:', err);
    }
  };

  // Handle removing a reaction
  const handleRemoveReaction = async (messageId: string, emoji: string) => {
    try {
      const res = await fetch(
        `/api/chat/${channelId}/messages/${messageId}/reactions?emoji=${encodeURIComponent(emoji)}`,
        {
          method: 'DELETE',
        },
      );

      if (!res.ok) throw new Error('Failed to remove reaction');

      // Optimistically update the UI
      setMessages((prev) =>
        prev.map((msg) => {
          if (msg.id === messageId) {
            const reactions = ((msg as any).message_reactions || []).filter(
              (r: any) => !(r.emoji === emoji && r.user_id === user?.id),
            );
            return {
              ...msg,
              message_reactions: reactions,
            } as any;
          }
          return msg;
        }),
      );
    } catch (err: unknown) {
      console.error('Failed to remove reaction:', err);
    }
  };

  // Handle starting edit
  const startEditing = (msg: Message) => {
    setEditingId(msg.id);
    setEditText(msg.content || '');
  };

  // Handle saving edit
  const handleSaveEdit = async (messageId: string, newContent: string) => {
    try {
      const res = await fetch(`/api/chat/${channelId}/messages/${messageId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newContent }),
      });

      if (!res.ok) throw new Error('Failed to update message');

      const updated = await res.json();

      // Optimistically update the UI
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === messageId
            ? { ...msg, content: newContent, edited_at: updated.edited_at }
            : msg,
        ),
      );

      setEditingId(null);
      setEditText('');
    } catch (err: unknown) {
      console.error('Failed to update message:', err);
    }
  };

  // Handle deleting message
  const handleDelete = async (messageId: string) => {
    if (!confirm('Are you sure you want to delete this message?')) return;

    try {
      const res = await fetch(`/api/chat/${channelId}/messages/${messageId}`, {
        method: 'DELETE',
      });

      if (!res.ok) throw new Error('Failed to delete message');

      // Remove the message from the UI entirely
      setMessages((prev) => prev.filter((msg) => msg.id !== messageId));
    } catch (err: unknown) {
      console.error('Failed to delete message:', err);
    }
  };

  // Add helper function for file size formatting
  function formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  }

  // Reset scroll state when channel changes
  useEffect((): void => {
    setHasScrolledToLastRead(false);
    setLastReadAt(undefined);
  }, [channelId]);

  // Memoize the data object for MessageRow to prevent unnecessary re-renders
  const messageRowData = useMemo(
    () => ({
      messages,
      lastReadAt,
      user,
      onStartEdit: startEditing,
      onDelete: handleDelete,
      onReply: setReplyTarget,
      onAddReaction: handleAddReaction,
      onRemoveReaction: handleRemoveReaction,
      onEmojiPicker: setEmojiPickerTarget,
      editingId,
      editText,
      onEditTextChange: setEditText,
      onSaveEdit: handleSaveEdit,
      onCancelEdit: () => {
        setEditingId(undefined);
        setEditText('');
      },
      getReactionCounts,
      formatFileSize,
      setItemSize,
    }),
    [messages, lastReadAt, user, editingId, editText, setItemSize],
  );

  return (
    <div className={clsx('flex flex-col h-full', className)}>
      <div className="flex-1 flex flex-col relative overflow-hidden">
        <div ref={containerRef} className="flex-1 overflow-y-auto">
          {messages.length > 0 && (
            <List
              ref={listRef}
              height={containerHeight}
              width={containerWidth}
              itemCount={messages.length}
              itemSize={getItemSize}
              itemData={messageRowData}
              overscanCount={5}
              onScroll={({ scrollOffset, scrollDirection }) => {
                // Handle scroll events if needed
              }}
            >
              {MessageRow}
            </List>
          )}
        </div>

        {unread > 0 && (
          <button
            type="button"
            onClick={() => {
              scrollToBottom();
              setUnread(0);
            }}
            className="absolute bottom-20 left-1/2 transform -translate-x-1/2 rounded-full bg-primary px-4 py-2 text-sm text-primary-foreground shadow-lg hover:bg-primary/80 z-20 transition-all"
          >
            {unread} new message{unread > 1 ? 's' : ''} ↓
          </button>
        )}

        {/* Scroll to bottom button when scrolled up */}
        {showScrollToBottom && !unread && (
          <button
            type="button"
            onClick={scrollToBottom}
            className="absolute bottom-20 right-4 rounded-full bg-background/80 backdrop-blur-sm p-3 shadow-lg hover:bg-background/90 z-20 transition-all"
            aria-label="Scroll to bottom"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
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

        {typingUsers.length > 0 && (
          <div className="absolute bottom-14 left-0 right-0 px-4 py-1 text-xs text-muted-foreground bg-background/80 backdrop-blur">
            {typingUsers
              .map(
                (t) => t.username ?? t.full_name ?? t.user_id.substring(0, 6),
              )
              .join(', ')}{' '}
            {typingUsers.length === 1 ? 'is' : 'are'} typing…
          </div>
        )}
      </div>

      <div className="shrink-0 px-2 py-2">
        <MessageInput
          channelId={channelId!}
          className="rounded-lg"
          replyTarget={replyTarget}
          onClearReply={() => setReplyTarget(undefined)}
          onSent={(optimistic) => {
            setMessages((prev) => [...prev, optimistic]);
            scrollToBottom();
          }}
        />
      </div>

      {/* Emoji picker popup */}
      {emojiPickerTarget && (
        <div
          className="fixed inset-0 z-50"
          onClick={() => setEmojiPickerTarget(null)}
        >
          <div
            className="absolute bg-background rounded-lg shadow-lg p-2"
            style={{
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="grid grid-cols-4 gap-1">
              {quickEmojis.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => void handleAddReaction(emojiPickerTarget, emoji)}
                  className="text-2xl p-2 hover:bg-muted rounded transition-colors"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
