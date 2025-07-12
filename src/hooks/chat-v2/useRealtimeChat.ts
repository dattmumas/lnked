'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

import { chatRealtimeService } from '@/lib/chat-v2/realtime-service';

import type {
  ChatMessage,
  PresenceState,
  PresenceStateRecord,
  PresenceEntry,
} from '@/types/chat-v2';

interface UseRealtimeChatProps {
  conversationId: string | null;
  enabled: boolean;
  onNewMessage?: (message: ChatMessage) => void;
  onMessageUpdate?: (message: ChatMessage) => void;
  onPresenceSync?: (state: PresenceStateRecord) => void;
  onPresenceJoin?: (key: string, newPresences: PresenceEntry[]) => void;
  onPresenceLeave?: (key: string, leftPresences: PresenceEntry[]) => void;
  onTypingStart?: (userId: string) => void;
  onTypingStop?: (userId: string) => void;
  onError?: (error: Error) => void;
}

export function useRealtimeChat({
  conversationId,
  enabled,
  onNewMessage,
  onMessageUpdate,
  onPresenceSync,
  onPresenceJoin,
  onPresenceLeave,
  onTypingStart,
  onTypingStop,
  onError,
}: UseRealtimeChatProps) {
  const [presence, setPresence] = useState<{ [userId: string]: PresenceState }>(
    {},
  );
  const [typingUsers, setTypingUsers] = useState<{
    [userId: string]: { timestamp: number };
  }>({});
  const isSubscribedRef = useRef(false);
  const isSubscribingRef = useRef(false);

  // Store callbacks in ref to prevent re-subscription on callback changes
  const callbacksRef = useRef({
    onNewMessage,
    onMessageUpdate,
    onPresenceSync,
    onPresenceJoin,
    onPresenceLeave,
    onTypingStart,
    onTypingStop,
    onError,
  });

  // Update callbacks ref when props change
  useEffect(() => {
    callbacksRef.current = {
      onNewMessage,
      onMessageUpdate,
      onPresenceSync,
      onPresenceJoin,
      onPresenceLeave,
      onTypingStart,
      onTypingStop,
      onError,
    };
  }, [
    onNewMessage,
    onMessageUpdate,
    onPresenceSync,
    onPresenceJoin,
    onPresenceLeave,
    onTypingStart,
    onTypingStop,
    onError,
  ]);

  // Clean up expired typing indicators
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setTypingUsers((prev) => {
        const updated = { ...prev };
        let hasChanges = false;

        Object.keys(updated).forEach((userId) => {
          const userTyping = updated[userId];
          if (userTyping && now - userTyping.timestamp > 5000) {
            // 5 second timeout
            delete updated[userId];
            hasChanges = true;
          }
        });

        return hasChanges ? updated : prev;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Combine presence and typing state
  const combinedPresence = useCallback(() => {
    const combined = { ...presence };

    // Add typing state to presence
    Object.keys(typingUsers).forEach((userId) => {
      const existingPresence = combined[userId];
      if (existingPresence) {
        combined[userId] = {
          ...existingPresence,
          typing: true,
        };
      } else {
        // Create minimal presence for typing-only users
        combined[userId] = {
          user_id: userId,
          online_at: new Date().toISOString(),
          typing: true,
        };
      }
    });

    return combined;
  }, [presence, typingUsers]);

  // Subscription effect - only depends on conversationId and enabled
  useEffect(() => {
    if (!conversationId || !enabled || isSubscribingRef.current) {
      return;
    }

    isSubscribingRef.current = true;

    const handleNewMessage = (message: ChatMessage) => {
      console.log('📨 [useRealtimeChat] Received message:', message.id);
      callbacksRef.current.onNewMessage?.(message);
    };

    const handlePresenceSync = (state: PresenceStateRecord) => {
      console.log(
        '👥 [useRealtimeChat] Presence sync:',
        Object.keys(state).length,
        'users',
      );
      setPresence(state);
      callbacksRef.current.onPresenceSync?.(state);
    };

    const handlePresenceJoin = (key: string, newPresences: PresenceEntry[]) => {
      console.log('👋 [useRealtimeChat] User joined:', key);
      callbacksRef.current.onPresenceJoin?.(key, newPresences);
    };

    const handlePresenceLeave = (
      key: string,
      leftPresences: PresenceEntry[],
    ) => {
      console.log('👋 [useRealtimeChat] User left:', key);
      callbacksRef.current.onPresenceLeave?.(key, leftPresences);
    };

    const handleTypingStart = (userId: string) => {
      console.log('🔤 [useRealtimeChat] User started typing:', userId);
      setTypingUsers((prev) => ({
        ...prev,
        [userId]: { timestamp: Date.now() },
      }));
      callbacksRef.current.onTypingStart?.(userId);
    };

    const handleTypingStop = (userId: string) => {
      console.log('🔤 [useRealtimeChat] User stopped typing:', userId);
      setTypingUsers((prev) => {
        const updated = { ...prev };
        delete updated[userId];
        return updated;
      });
      callbacksRef.current.onTypingStop?.(userId);
    };

    const handleError = (error: Error) => {
      console.error('❌ [useRealtimeChat] Error:', error);
      callbacksRef.current.onError?.(error);
    };

    chatRealtimeService
      .subscribe(conversationId, {
        onNewMessage: handleNewMessage,
        onPresenceSync: handlePresenceSync,
        onPresenceJoin: handlePresenceJoin,
        onPresenceLeave: handlePresenceLeave,
        onTypingStart: handleTypingStart,
        onTypingStop: handleTypingStop,
        onError: handleError,
      })
      .then(() => {
        console.log('✅ [useRealtimeChat] Subscription successful');
        isSubscribedRef.current = true;
      })
      .catch((error: unknown) => {
        console.error('❌ [useRealtimeChat] Subscription failed:', error);
        handleError(error instanceof Error ? error : new Error(String(error)));
      })
      .finally(() => {
        isSubscribingRef.current = false;
      });

    // Cleanup function
    return () => {
      chatRealtimeService.unsubscribe().catch(console.error);
      isSubscribedRef.current = false;
      setPresence({});
      setTypingUsers({});
    };
  }, [conversationId, enabled]);

  // Broadcast new message
  const broadcastMessage = useCallback(async (message: ChatMessage) => {
    try {
      await chatRealtimeService.broadcastNewMessage(message);
    } catch (error) {
      console.error('Failed to broadcast message:', error);
      // Don't show error toast as this is just a broadcast failure
      // The message was still saved to the database
    }
  }, []);

  // Send typing indicator
  const sendTypingIndicator = useCallback(async (isTyping: boolean) => {
    try {
      await chatRealtimeService.sendTypingIndicator(isTyping);
    } catch (error) {
      console.error('Failed to send typing indicator:', error);
      // Silently fail for typing indicators
    }
  }, []);

  return {
    presence: combinedPresence(),
    isSubscribed: isSubscribedRef.current,
    isConnected: chatRealtimeService.isConnected(),
    broadcastMessage,
    sendTypingIndicator,
  };
}
