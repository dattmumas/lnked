'use client';


import supabase from '@/lib/supabase/browser';

import { chatSecurity } from './security';

import type { MessageWithSender, BroadcastMessage, TypingIndicator } from './types';
import type { RealtimeChannel, RealtimePostgresChangesPayload, User } from '@supabase/supabase-js';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

// eslint-disable-next-line no-magic-numbers
export const TYPING_STOP_DELAY_MS = 3000 as const;

// eslint-disable-next-line no-magic-numbers
export const TYPING_EXPIRY_MS = 5000 as const;

// eslint-disable-next-line no-magic-numbers
export const CHANNEL_RETRY_DELAY_MS = 3000 as const;

// eslint-disable-next-line no-magic-numbers
export const TIMEOUT_RETRY_DELAY_MS = 2000 as const;

// Supabase channel states as constants
const CHANNEL_STATES = {
  SUBSCRIBED: 'SUBSCRIBED',
  CHANNEL_ERROR: 'CHANNEL_ERROR', 
  TIMED_OUT: 'TIMED_OUT',
  CLOSED: 'CLOSED',
  JOINED: 'joined',
  CLOSED_LOWERCASE: 'closed',
} as const;

/**
 * Real-time service following Supabase's official patterns with enhanced security
 * Based on: https://supabase.com/docs/guides/realtime/broadcast
 * and: https://supabase.com/docs/guides/realtime/postgres-changes
 */

export class RealtimeService {
  private supabase = supabase;
  private channels: Map<string, RealtimeChannel> = new Map();
  private messageHandlers: Map<string, (_message: MessageWithSender) => void> = new Map();
  private typingHandlers: Map<string, (_typing: TypingIndicator[]) => void> = new Map();
  private typingTimeout: Map<string, NodeJS.Timeout> = new Map();
  private subscriptionDebounce: Map<string, NodeJS.Timeout> = new Map();
  private pendingSubscriptions: Set<string> = new Set();
  private recentlyUnsubscribed: Map<string, number> = new Map();

  /**
   * Subscribe to a conversation channel following Supabase broadcast patterns with security checks
   */
  async subscribeToConversation(
    conversationId: string,
    callbacks: {
      onMessage?: (_message: MessageWithSender) => void;
      onTyping?: (_typing: TypingIndicator[]) => void;
      onMessageUpdate?: (_message: MessageWithSender) => void;
      onMessageDelete?: (_messageId: string) => void;
      onUserJoin?: (_userId: string) => void;
      onUserLeave?: (_userId: string) => void;
    }
  ): Promise<RealtimeChannel | undefined> {
    const channelName = `conversation:${conversationId}`;
    
    // Prevent multiple simultaneous subscriptions to the same conversation
    if (this.pendingSubscriptions.has(conversationId)) {
      return this.channels.get(conversationId);
    }
    
    // Check if this conversation was recently unsubscribed (React StrictMode protection)
    const lastUnsubscribe = this.recentlyUnsubscribed.get(conversationId);
    if (lastUnsubscribe && Date.now() - lastUnsubscribe < 100) {
      // Wait a bit before allowing re-subscription
      return new Promise((resolve) => {
        setTimeout(() => {
          void this.subscribeToConversation(conversationId, callbacks).then(resolve);
        }, 100);
      });
    }
    
    // Debounce rapid subscription attempts
    const existingDebounce = this.subscriptionDebounce.get(conversationId);
    if (existingDebounce) {
      clearTimeout(existingDebounce);
    }

    // If there's already an active channel, reuse it if it's in a good state
    const existingChannel = this.channels.get(conversationId);
    if (existingChannel) {
      const state = String(existingChannel.state);
      if (state === CHANNEL_STATES.JOINED || state === CHANNEL_STATES.SUBSCRIBED) {
        return existingChannel;
      }
    }
    
    // Security check: Verify user can access this conversation
    const user = await this.getCurrentUser();
    if (!user) {
      console.error('User not authenticated for real-time subscription');
      return undefined;
    }

    const canView = await chatSecurity.canViewConversation(conversationId, user.id);
    if (!canView) {
      chatSecurity.logSecurityEvent({
        action: 'realtime_subscription_denied',
        userId: user.id,
        conversationId,
        success: false,
        details: { reason: 'User not authorized to subscribe to this conversation' },
      });
      console.error('User not authorized to subscribe to conversation:', conversationId);
      return undefined;
    }
    
    // Remove existing channel if it exists
    this.unsubscribeFromConversation(conversationId);

    // Mark subscription as pending
    this.pendingSubscriptions.add(conversationId);

    // Create new channel following Supabase patterns
    const channel = this.supabase
      .channel(channelName, {
        config: {
          broadcast: { self: false }, // Don't broadcast to self
          presence: { key: conversationId }, // Track presence in this conversation
        },
      })
      
      // Listen for new messages via Postgres Changes
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
          void (async () => {
            if (payload.new !== undefined && typeof callbacks.onMessage === 'function') {
              // Fetch full message with sender info
              const newMessage = payload.new as { id: string };
      
              const { data: message } = await this.supabase
                .from('messages')
                .select(`
                  *,
                  sender:users!messages_sender_id_fkey(id, full_name, username, avatar_url),
                  reply_to:messages(
                    *,
                    sender:users!messages_sender_id_fkey(id, full_name, username, avatar_url)
                  )
                `)
                .eq('id', newMessage.id)
                .single();

              if (message !== null && message !== undefined) {
                callbacks.onMessage(message as unknown as MessageWithSender);
              }
            }
          })().catch(console.error);
        }
      )
      
      // Listen for message updates via Postgres Changes
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
          void (async () => {
            if (payload.new !== undefined && typeof callbacks.onMessageUpdate === 'function') {
              // Fetch updated message with sender info
              const updatedMessage = payload.new as { id: string };
              const { data: message } = await this.supabase
                .from('messages')
                .select(`
                  *,
                  sender:users!messages_sender_id_fkey(id, full_name, username, avatar_url),
                  reply_to:messages(
                    *,
                    sender:users!messages_sender_id_fkey(id, full_name, username, avatar_url)
                  )
                `)
                .eq('id', updatedMessage.id)
                .single();

              if (message !== null && message !== undefined) {
                callbacks.onMessageUpdate(message as unknown as MessageWithSender);
              }
            }
          })().catch(console.error);
        }
      )
      
      // Listen for message deletions via Postgres Changes
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
          if (payload.new !== undefined && typeof callbacks.onMessageDelete === 'function') {
            const deletedMessage = payload.new as { id: string; deleted_at?: string | null | undefined };
            if (typeof deletedMessage.deleted_at === 'string' && deletedMessage.deleted_at.length > 0) {
              callbacks.onMessageDelete(deletedMessage.id);
            }
          }
        }
      )
      
      // Listen for typing indicators via Broadcast
      .on(
        'broadcast',
        { event: 'typing_start' },
        (payload: BroadcastMessage) => {
          if (typeof payload.payload.user_id === 'string' && payload.payload.user_id !== '' && typeof callbacks.onTyping === 'function') {
            this.handleTypingStart(conversationId, payload.payload, callbacks.onTyping);
          }
        }
      )
      
      .on(
        'broadcast',
        { event: 'typing_stop' },
        (payload: BroadcastMessage) => {
          if (typeof payload.payload.user_id === 'string' && payload.payload.user_id !== '' && typeof callbacks.onTyping === 'function') {
            this.handleTypingStop(conversationId, payload.payload, callbacks.onTyping);
          }
        }
      )
      
      // Listen for user presence changes
      .on(
        'broadcast',
        { event: 'user_join' },
        (payload: BroadcastMessage) => {
          if (typeof payload.payload.user_id === 'string' && payload.payload.user_id !== '' && typeof callbacks.onUserJoin === 'function') {
            callbacks.onUserJoin(payload.payload.user_id);
          }
        }
      )
      
      .on(
        'broadcast',
        { event: 'user_leave' },
        (payload: BroadcastMessage) => {
          if (typeof payload.payload.user_id === 'string' && payload.payload.user_id !== '' && typeof callbacks.onUserLeave === 'function') {
            callbacks.onUserLeave(payload.payload.user_id);
          }
        }
      );

    // Subscribe to the channel with enhanced error handling
    channel.subscribe((status) => {
      // Type-safe status checking
      const statusString = String(status);
      
      switch (statusString) {
        case CHANNEL_STATES.SUBSCRIBED:
          this.pendingSubscriptions.delete(conversationId);
          if (typeof callbacks.onUserJoin === 'function') {
            void this.broadcastUserJoin(conversationId);
          }
          break;
        case CHANNEL_STATES.CHANNEL_ERROR:
          console.error(`❌ Channel error for conversation ${conversationId}`);
          this.pendingSubscriptions.delete(conversationId);
          // Auto-retry after a delay to prevent infinite retry loops
          setTimeout(() => {
            if (this.channels.has(conversationId)) {
              console.warn(`🔄 Retrying subscription to conversation ${conversationId}`);
              void this.subscribeToConversation(conversationId, callbacks);
            }
          }, CHANNEL_RETRY_DELAY_MS);
          break;
        case CHANNEL_STATES.TIMED_OUT:
          console.error(`⏰ Subscription timeout for conversation ${conversationId}`);
          this.pendingSubscriptions.delete(conversationId);
          // Clean up and retry
          this.channels.delete(conversationId);
          setTimeout(() => {
            console.warn(`🔄 Retrying subscription after timeout: ${conversationId}`);
            void this.subscribeToConversation(conversationId, callbacks);
          }, TIMEOUT_RETRY_DELAY_MS);
          break;
        case CHANNEL_STATES.CLOSED:
          this.pendingSubscriptions.delete(conversationId);
          this.channels.delete(conversationId);
          break;
        default:
          console.error(`❓ Unknown subscription status for conversation ${conversationId}:`, status);
          this.pendingSubscriptions.delete(conversationId);
      }
    });

    this.channels.set(conversationId, channel);
    
    // Store callbacks for cleanup
    if (callbacks.onMessage) {
      this.messageHandlers.set(conversationId, callbacks.onMessage);
    }
    if (callbacks.onTyping) {
      this.typingHandlers.set(conversationId, callbacks.onTyping);
    }

    return channel;
  }

  /**
   * Unsubscribe from a conversation
   */
  unsubscribeFromConversation(conversationId: string): void {
    const channel = this.channels.get(conversationId);
    if (channel) {
      // Immediately remove from channels map to prevent reuse
      this.channels.delete(conversationId);
      
      // Mark as recently unsubscribed for StrictMode protection
      this.recentlyUnsubscribed.set(conversationId, Date.now());
      
      // Clean up old entries (older than 1 second)
      const now = Date.now();
      for (const [id, time] of this.recentlyUnsubscribed.entries()) {
        if (now - time > 1000) {
          this.recentlyUnsubscribed.delete(id);
        }
      }
      
      // Announce user leaving before unsubscribing (only if channel is active)
      const channelState = String(channel.state);
      if (channelState === CHANNEL_STATES.JOINED) {
        void this.broadcastUserLeave(conversationId);
      }
      
      // Only unsubscribe if channel is not already closed
      if (channelState !== CHANNEL_STATES.CLOSED_LOWERCASE) {
        void channel.unsubscribe();
      }
      
      this.messageHandlers.delete(conversationId);
      this.typingHandlers.delete(conversationId);
      this.pendingSubscriptions.delete(conversationId);
      
      // Clear typing timeout
      const timeout = this.typingTimeout.get(conversationId);
      if (timeout) {
        clearTimeout(timeout);
        this.typingTimeout.delete(conversationId);
      }

      // Clear subscription debounce timeout
      const debounceTimeout = this.subscriptionDebounce.get(conversationId);
      if (debounceTimeout) {
        clearTimeout(debounceTimeout);
        this.subscriptionDebounce.delete(conversationId);
      }
    } else {
      // Still clean up pending state even if no channel exists
      this.pendingSubscriptions.delete(conversationId);
    }
  }

  /**
   * Unsubscribe from all conversations
   */
  unsubscribeFromAll(): void {
    this.channels.forEach((channel, conversationId) => {
      this.unsubscribeFromConversation(conversationId);
    });
  }

  /**
   * Broadcast typing start event following Supabase patterns
   */
  async broadcastTypingStart(conversationId: string): Promise<void> {
    const channel = this.channels.get(conversationId);
    if (!channel) return;

    const user = await this.getCurrentUser();
    if (!user) return;

    void channel.send({
      type: 'broadcast',
      event: 'typing_start',
      payload: {
        user_id: user.id,
        username: (user.user_metadata as Record<string, unknown>)?.username as string | null ?? null,
        full_name: (user.user_metadata as Record<string, unknown>)?.full_name as string | null ?? null,
        conversation_id: conversationId,
        timestamp: Date.now(),
      },
    });

    // Auto-stop typing after 3 seconds of inactivity
    const timeout = this.typingTimeout.get(conversationId);
    if (timeout) clearTimeout(timeout);
    
    this.typingTimeout.set(
      conversationId,
      setTimeout(() => {
        void this.broadcastTypingStop(conversationId);
      }, TYPING_STOP_DELAY_MS)
    );
  }

  /**
   * Broadcast typing stop event
   */
  async broadcastTypingStop(conversationId: string): Promise<void> {
    const channel = this.channels.get(conversationId);
    if (!channel) return;

    const user = await this.getCurrentUser();
    if (!user) return;

    void channel.send({
      type: 'broadcast',
      event: 'typing_stop',
      payload: {
        user_id: user.id,
        conversation_id: conversationId,
        timestamp: Date.now(),
      },
    });

    // Clear timeout
    const timeout = this.typingTimeout.get(conversationId);
    if (timeout) {
      clearTimeout(timeout);
      this.typingTimeout.delete(conversationId);
    }
  }

  /**
   * Broadcast user join event
   */
  private async broadcastUserJoin(conversationId: string): Promise<void> {
    const channel = this.channels.get(conversationId);
    if (!channel) return;

    const user = await this.getCurrentUser();
    if (!user) return;

    void channel.send({
      type: 'broadcast',
      event: 'user_join',
      payload: {
        user_id: user.id,
        conversation_id: conversationId,
        timestamp: Date.now(),
      },
    });
  }

  /**
   * Broadcast user leave event
   */
  private async broadcastUserLeave(conversationId: string): Promise<void> {
    const channel = this.channels.get(conversationId);
    if (!channel) return;

    const user = await this.getCurrentUser();
    if (!user) return;

    void channel.send({
      type: 'broadcast',
      event: 'user_leave',
      payload: {
        user_id: user.id,
        conversation_id: conversationId,
        timestamp: Date.now(),
      },
    });
  }

  /**
   * Handle typing start event
   */
  private handleTypingStart(
    conversationId: string,
    payload: BroadcastMessage['payload'],
    onTyping?: (_typing: TypingIndicator[]) => void
  ): void {
    if (typeof payload.user_id !== 'string' || payload.user_id === '' || typeof onTyping !== 'function') {
      return;
    }

    const currentTyping = this.getTypingUsers(conversationId);
    
    // Add or update typing user
    const existingIndex = currentTyping.findIndex(t => t.user_id === payload.user_id);
    const typingIndicator: TypingIndicator = {
      user_id: payload.user_id,
      username: (payload as Record<string, unknown>).username as string | null ?? null,
      full_name: (payload as Record<string, unknown>).full_name as string | null ?? null,
      conversation_id: conversationId,
      timestamp: payload.timestamp ?? Date.now(),
    };

    if (existingIndex >= 0) {
      currentTyping[existingIndex] = typingIndicator;
    } else {
      currentTyping.push(typingIndicator);
    }

    // Store and notify
    this.setTypingUsers(conversationId, currentTyping);
    onTyping(currentTyping);
  }

  /**
   * Handle typing stop event
   */
  private handleTypingStop(
    conversationId: string,
    payload: BroadcastMessage['payload'],
    onTyping?: (_typing: TypingIndicator[]) => void
  ): void {
    if (typeof payload.user_id !== 'string' || payload.user_id === '' || typeof onTyping !== 'function') {
      return;
    }

    const currentTyping = this.getTypingUsers(conversationId);
    const filteredTyping = currentTyping.filter(t => t.user_id !== payload.user_id);
    
    this.setTypingUsers(conversationId, filteredTyping);
    onTyping(filteredTyping);
  }

  /**
   * Get typing users for a conversation
   */
  private getTypingUsers(conversationId: string): TypingIndicator[] {
    const stored = localStorage.getItem(`typing:${conversationId}`);
    if (stored === null) return [];
    
    try {
      const typing = JSON.parse(stored) as unknown as TypingIndicator[];
      // Filter out stale typing indicators (older than 5 seconds)
      const now = Date.now();
      return typing.filter(
        (t) =>
          typeof t.timestamp === 'number' &&
          now - t.timestamp < TYPING_EXPIRY_MS,
      );
    } catch {
      return [];
    }
  }

  /**
   * Set typing users for a conversation
   */
  private setTypingUsers(conversationId: string, typing: TypingIndicator[]): void {
    localStorage.setItem(`typing:${conversationId}`, JSON.stringify(typing));
  }

  /**
   * Get current authenticated user
   */
  private async getCurrentUser(): Promise<User | undefined> {
    const { data: { user } } = await this.supabase.auth.getUser();
    return user ?? undefined;
  }

  /**
   * Get connection status
   */
  getChannelStatus(conversationId: string): string | undefined {
    const channel = this.channels.get(conversationId);
    return channel?.state;
  }

  /**
   * Get all active channels
   */
  getActiveChannels(): string[] {
    return Array.from(this.channels.keys());
  }
}

// Export singleton instance
export const realtimeService = new RealtimeService(); 