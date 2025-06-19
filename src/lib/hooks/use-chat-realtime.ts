import { RealtimeChannel } from '@supabase/supabase-js';
import { useEffect, useRef, useCallback } from 'react';

const RECONNECT_DELAY_MS = 5_000;

import { createSupabaseBrowserClient } from '@/lib/supabase/browser';

import type { Message } from '@/lib/chat/types';

interface BatchedUpdate {
  messages: Array<{
    action: 'created' | 'updated' | 'deleted';
    message?: Message;
    messageId?: string;
    changes?: Partial<Message>;
  }>;
  reads: Array<{
    userId: string;
    messageId: string;
    readAt: string;
  }>;
  reactions: Array<{
    action: 'added' | 'removed';
    messageId: string;
    userId: string;
    reaction: string;
  }>;
  typing: {
    typingUsers: Array<{
      userId: string;
      username: string;
    }>;
  } | null;
}

interface UseChatRealtimeOptions {
  conversationId?: string;
  onMessageUpdate: (updates: BatchedUpdate['messages']) => void;
  onReadUpdate: (updates: BatchedUpdate['reads']) => void;
  onReactionUpdate: (updates: BatchedUpdate['reactions']) => void;
  onTypingUpdate: (typingUsers: Array<{ userId: string; username: string }>) => void;
  onUnreadCountUpdate?: (conversationId: string, count: number) => void;
  enabled?: boolean;
}

export function useChatRealtime({
  conversationId,
  onMessageUpdate,
  onReadUpdate,
  onReactionUpdate,
  onTypingUpdate,
  onUnreadCountUpdate,
  enabled = true,
}: UseChatRealtimeOptions): { sendTypingIndicator: (isTyping: boolean) => Promise<void> } {
  const channelRef = useRef<RealtimeChannel | null>(null);
  const supabase = createSupabaseBrowserClient();
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const updateQueueRef = useRef<BatchedUpdate[]>([]);
  const processingRef = useRef(false);

  // Process batched updates efficiently
  const processBatchedUpdates = useCallback((): void => {
    if (processingRef.current || updateQueueRef.current.length === 0) {
      return;
    }

    processingRef.current = true;
    const updates = [...updateQueueRef.current];
    updateQueueRef.current = [];

    try {
      // Merge all updates into a single batch
      const mergedUpdate: BatchedUpdate = {
        messages: [],
        reads: [],
        reactions: [],
        typing: null,
      };

      for (const update of updates) {
        mergedUpdate.messages.push(...update.messages);
        mergedUpdate.reads.push(...update.reads);
        mergedUpdate.reactions.push(...update.reactions);
        if (update.typing) {
          mergedUpdate.typing = update.typing;
        }
      }

      // Apply updates in the correct order
      if (mergedUpdate.messages.length > 0) {
        // Deduplicate message updates
        const messageMap = new Map<string, BatchedUpdate['messages'][0]>();
        for (const msg of mergedUpdate.messages) {
          const key = msg.messageId ?? msg.message?.id;
          if (key !== undefined && key !== null && key !== '') {
            const existing = messageMap.get(key);
            if (!existing || msg.action === 'deleted') {
              messageMap.set(key, msg);
            } else if (existing.action === 'updated' && msg.action === 'updated') {
              // Merge changes
              existing.changes = { ...existing.changes, ...msg.changes };
            }
          }
        }
        onMessageUpdate(Array.from(messageMap.values()));
      }

      if (mergedUpdate.reads.length > 0) {
        onReadUpdate(mergedUpdate.reads);
      }

      if (mergedUpdate.reactions.length > 0) {
        onReactionUpdate(mergedUpdate.reactions);
      }

      if (mergedUpdate.typing) {
        onTypingUpdate(mergedUpdate.typing.typingUsers);
      }
    } finally {
      processingRef.current = false;
      
      // Process any updates that came in while we were processing
      if (updateQueueRef.current.length > 0) {
        requestAnimationFrame(() => processBatchedUpdates());
      }
    }
  }, [onMessageUpdate, onReadUpdate, onReactionUpdate, onTypingUpdate]);

  // Handle batched updates from server
  const handleBatchUpdate = useCallback((payload: { payload: BatchedUpdate }): void => {
    updateQueueRef.current.push(payload.payload);
    processBatchedUpdates();
  }, [processBatchedUpdates]);

  // Handle unread count updates
  const handleUnreadCountUpdate = useCallback((payload: {
    payload: { conversationId: string; unreadCount: number };
  }): void => {
    if (onUnreadCountUpdate) {
      onUnreadCountUpdate(payload.payload.conversationId, payload.payload.unreadCount);
    }
  }, [onUnreadCountUpdate]);

  // Setup real-time subscription
  useEffect(() => {
    if (!enabled) {
      return undefined;
    }

    const setupChannel = async (): Promise<void> => {
      try {
        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        if (user === null) {
          return;
        }

        // Clean up existing channel
        if (channelRef.current !== null) {
          await supabase.removeChannel(channelRef.current);
        }

        // Create new channel
        const channelName =
          conversationId !== undefined
            ? `chat:${user.id}:${conversationId}`
            : `chat:${user.id}`;

        const channel = supabase
          .channel(channelName)
          .on('broadcast', { event: 'batch_update' }, handleBatchUpdate)
          .on('broadcast', { event: 'unread_count' }, handleUnreadCountUpdate)
          .subscribe((status: 'SUBSCRIBED' | 'CHANNEL_ERROR' | 'TIMED_OUT' | 'CLOSED') => {
            if (status === 'SUBSCRIBED') {
              console.warn('Real-time subscription active');
            } else if (status === 'CHANNEL_ERROR') {
              console.error('Real-time subscription error');
              // Retry after delay
              reconnectTimeoutRef.current = setTimeout(() => {
                void setupChannel();
              }, RECONNECT_DELAY_MS);
            }
          });

        channelRef.current = channel;
      } catch (error) {
        console.error('Failed to setup real-time channel:', error);
      }
    };

    void setupChannel();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (channelRef.current !== null) {
        void supabase.removeChannel(channelRef.current);
      }
    };
  }, [enabled, conversationId, supabase, handleBatchUpdate, handleUnreadCountUpdate]);

  // Send typing indicator
  const sendTypingIndicator = useCallback(async (isTyping: boolean): Promise<void> => {
    if (channelRef.current === null || conversationId === undefined) {
      return;
    }

    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError !== null && authError !== undefined) {
        console.error('Failed to fetch current user:', authError);
        return;
      }
      if (user === null) {
        return;
      }

      await channelRef.current.track({
        userId: user.id,
        isTyping,
        timestamp: new Date().toISOString(),
      });
    } catch (err: unknown) {
      console.error('Failed to send typing indicator:', err);
    }
  }, [conversationId, supabase]);

  return {
    sendTypingIndicator,
  };
}