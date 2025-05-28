'use client';

import { createSupabaseBrowserClient } from '@/lib/supabase/browser';
import type { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import type { MessageWithSender, BroadcastMessage, TypingIndicator } from './types';
import { chatSecurity } from './security';

/**
 * Real-time service following Supabase's official patterns with enhanced security
 * Based on: https://supabase.com/docs/guides/realtime/broadcast
 * and: https://supabase.com/docs/guides/realtime/postgres-changes
 */

export class RealtimeService {
  private supabase = createSupabaseBrowserClient();
  private channels: Map<string, RealtimeChannel> = new Map();
  private messageHandlers: Map<string, (message: MessageWithSender) => void> = new Map();
  private typingHandlers: Map<string, (typing: TypingIndicator[]) => void> = new Map();
  private typingTimeout: Map<string, NodeJS.Timeout> = new Map();

  /**
   * Subscribe to a conversation channel following Supabase broadcast patterns with security checks
   */
  async subscribeToConversation(
    conversationId: string,
    callbacks: {
      onMessage?: (message: MessageWithSender) => void;
      onTyping?: (typing: TypingIndicator[]) => void;
      onMessageUpdate?: (message: MessageWithSender) => void;
      onMessageDelete?: (messageId: string) => void;
      onUserJoin?: (userId: string) => void;
      onUserLeave?: (userId: string) => void;
    }
  ) {
    const channelName = `conversation:${conversationId}`;
    
    // Security check: Verify user can access this conversation
    const user = await this.getCurrentUser();
    if (!user) {
      console.error('User not authenticated for real-time subscription');
      return null;
    }

    const canView = await chatSecurity.canViewConversation(conversationId, user.id);
    if (!canView) {
      await chatSecurity.logSecurityEvent({
        action: 'realtime_subscription_denied',
        userId: user.id,
        conversationId: conversationId,
        success: false,
        details: { reason: 'User not authorized to subscribe to this conversation' },
      });
      console.error('User not authorized to subscribe to conversation:', conversationId);
      return null;
    }
    
    // Remove existing channel if it exists
    this.unsubscribeFromConversation(conversationId);

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
        async (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
          if (payload.new && callbacks.onMessage) {
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

            if (message) {
              callbacks.onMessage(message as unknown as MessageWithSender);
            }
          }
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
        async (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
          if (payload.new && callbacks.onMessageUpdate) {
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

            if (message) {
              callbacks.onMessageUpdate(message as unknown as MessageWithSender);
            }
          }
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
          if (payload.new && callbacks.onMessageDelete) {
            const deletedMessage = payload.new as { id: string; deleted_at?: string };
            if (deletedMessage.deleted_at) {
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
          this.handleTypingStart(conversationId, payload.payload, callbacks.onTyping);
        }
      )
      
      .on(
        'broadcast',
        { event: 'typing_stop' },
        (payload: BroadcastMessage) => {
          this.handleTypingStop(conversationId, payload.payload, callbacks.onTyping);
        }
      )
      
      // Listen for user presence changes
      .on(
        'broadcast',
        { event: 'user_join' },
        (payload: BroadcastMessage) => {
          if (payload.payload.user_id && callbacks.onUserJoin) {
            callbacks.onUserJoin(payload.payload.user_id);
          }
        }
      )
      
      .on(
        'broadcast',
        { event: 'user_leave' },
        (payload: BroadcastMessage) => {
          if (payload.payload.user_id && callbacks.onUserLeave) {
            callbacks.onUserLeave(payload.payload.user_id);
          }
        }
      );

    // Subscribe to the channel (keeping original API since receive doesn't exist)
    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
      console.log(`Subscribed to conversation ${conversationId}`);
      
      // Announce user joining
      if (callbacks.onUserJoin) {
        this.broadcastUserJoin(conversationId);
        }
      } else if (status === 'CHANNEL_ERROR') {
        console.error(`Channel error for conversation ${conversationId}`);
      } else if (status === 'TIMED_OUT') {
        console.error(`Subscription timeout for conversation ${conversationId}`);
      } else if (status === 'CLOSED') {
        console.warn(`Channel closed for conversation ${conversationId}`);
      } else {
        console.error(`Failed to subscribe to conversation ${conversationId}:`, status);
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
  unsubscribeFromConversation(conversationId: string) {
    const channel = this.channels.get(conversationId);
    if (channel) {
      // Announce user leaving before unsubscribing (only if channel is active)
      if (channel.state === 'joined') {
      this.broadcastUserLeave(conversationId);
      }
      
      // Only unsubscribe if channel is not already closed
      if (channel.state !== 'closed') {
      channel.unsubscribe();
      }
      
      this.channels.delete(conversationId);
      this.messageHandlers.delete(conversationId);
      this.typingHandlers.delete(conversationId);
      
      // Clear typing timeout
      const timeout = this.typingTimeout.get(conversationId);
      if (timeout) {
        clearTimeout(timeout);
        this.typingTimeout.delete(conversationId);
      }
    }
  }

  /**
   * Unsubscribe from all conversations
   */
  unsubscribeFromAll() {
    this.channels.forEach((channel, conversationId) => {
      this.unsubscribeFromConversation(conversationId);
    });
  }

  /**
   * Broadcast typing start event following Supabase patterns
   */
  async broadcastTypingStart(conversationId: string) {
    const channel = this.channels.get(conversationId);
    if (!channel) return;

    const user = await this.getCurrentUser();
    if (!user) return;

    await channel.send({
      type: 'broadcast',
      event: 'typing_start',
      payload: {
        user_id: user.id,
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
        this.broadcastTypingStop(conversationId);
      }, 3000)
    );
  }

  /**
   * Broadcast typing stop event
   */
  async broadcastTypingStop(conversationId: string) {
    const channel = this.channels.get(conversationId);
    if (!channel) return;

    const user = await this.getCurrentUser();
    if (!user) return;

    await channel.send({
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
  private async broadcastUserJoin(conversationId: string) {
    const channel = this.channels.get(conversationId);
    if (!channel) return;

    const user = await this.getCurrentUser();
    if (!user) return;

    await channel.send({
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
  private async broadcastUserLeave(conversationId: string) {
    const channel = this.channels.get(conversationId);
    if (!channel) return;

    const user = await this.getCurrentUser();
    if (!user) return;

    await channel.send({
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
    onTyping?: (typing: TypingIndicator[]) => void
  ) {
    if (!payload.user_id || !onTyping) return;

    const currentTyping = this.getTypingUsers(conversationId);
    
    // Add or update typing user
    const existingIndex = currentTyping.findIndex(t => t.user_id === payload.user_id);
    const typingIndicator: TypingIndicator = {
      user_id: payload.user_id,
      conversation_id: conversationId,
      timestamp: payload.timestamp || Date.now(),
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
    onTyping?: (typing: TypingIndicator[]) => void
  ) {
    if (!payload.user_id || !onTyping) return;

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
    if (!stored) return [];
    
    try {
      const typing: TypingIndicator[] = JSON.parse(stored);
      // Filter out stale typing indicators (older than 5 seconds)
      const now = Date.now();
      return typing.filter(t => now - t.timestamp < 5000);
    } catch {
      return [];
    }
  }

  /**
   * Set typing users for a conversation
   */
  private setTypingUsers(conversationId: string, typing: TypingIndicator[]) {
    localStorage.setItem(`typing:${conversationId}`, JSON.stringify(typing));
  }

  /**
   * Get current authenticated user
   */
  private async getCurrentUser() {
    const { data: { user } } = await this.supabase.auth.getUser();
    return user;
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