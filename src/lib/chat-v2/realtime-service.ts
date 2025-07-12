'use client';

import { RealtimeChannel } from '@supabase/supabase-js';

import supabase from '@/lib/supabase/browser';
import {
  ChatMessage,
  PresenceStateRecord,
  PresenceEntry,
} from '@/types/chat-v2';

export interface RealtimeServiceCallbacks {
  onNewMessage?: (message: ChatMessage) => void;
  onTypingStart?: (userId: string) => void;
  onTypingStop?: (userId: string) => void;
  onError?: (error: Error) => void;
  onChannelStateChange?: (state: string) => void;
  onPresenceSync?: (state: PresenceStateRecord) => void;
  onPresenceJoin?: (key: string, newPresences: PresenceEntry[]) => void;
  onPresenceLeave?: (key: string, leftPresences: PresenceEntry[]) => void;
}

export class ChatRealtimeService {
  private channel: RealtimeChannel | null = null;
  private conversationId: string | null = null;
  private userId: string | null = null;
  private callbacks: RealtimeServiceCallbacks = {};

  // Track presence state locally
  private presenceState: PresenceStateRecord = {};

  // Guard against duplicate subscriptions
  private isSubscribing = false;
  private isSubscribed = false;

  // Auto-reconnection state
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private baseReconnectDelay = 1000; // 1 second
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private shouldReconnect = true;

  constructor() {
    // Get current user ID from Supabase auth
    this.initializeUserId();
  }

  private async initializeUserId(): Promise<void> {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    this.userId = user?.id || null;
  }

  /**
   * Subscribe to a conversation channel
   */
  async subscribe(
    conversationId: string,
    callbacks: RealtimeServiceCallbacks,
  ): Promise<void> {
    console.log('🔌 [RealtimeService] Subscribing to:', conversationId);

    // Treat duplicate subscribe calls as no-op instead of throwing
    if (this.isSubscribing) {
      console.log(
        '⚠️ [RealtimeService] Already subscribing, treating as no-op',
      );
      return;
    }

    // Harden: if already subscribed to the same conversation, it's a no-op
    if (
      this.channel?.topic === `conversation:${conversationId}` &&
      this.isSubscribed
    ) {
      console.log(
        '✅ [RealtimeService] Already subscribed to this conversation',
      );
      return;
    }

    this.isSubscribing = true;
    this.shouldReconnect = true; // Re-enable reconnection when subscribing

    try {
      // If we have a different channel, unsubscribe first
      if (
        this.channel &&
        this.channel.topic !== `conversation:${conversationId}`
      ) {
        await this.unsubscribe();
      }

      // Store callbacks and conversation ID
      this.callbacks = callbacks;
      this.conversationId = conversationId;

      // Get user ID for presence tracking
      const user = await supabase.auth.getUser();
      if (!user.data.user?.id) {
        throw new Error('User not authenticated');
      }
      this.userId = user.data.user.id;

      // Create and configure the channel
      this.channel = supabase.channel(`conversation:${conversationId}`, {
        config: { presence: { key: this.userId } },
      });

      // Set up all event listeners
      this.setupEventListeners();

      // Subscribe to the channel
      const subscriptionPromise = new Promise<void>((resolve, reject) => {
        if (!this.channel) {
          reject(new Error('Channel not initialized'));
          return;
        }

        this.channel.subscribe((status) => {
          const statusString = String(status);
          if (statusString === 'SUBSCRIBED') {
            console.log('✅ [RealtimeService] Successfully subscribed');
            this.isSubscribed = true;
            this.isSubscribing = false;

            // Track presence
            this.channel?.track({
              user_id: this.userId,
              online_at: new Date().toISOString(),
            });

            resolve();
          } else if (statusString === 'CHANNEL_ERROR') {
            console.error('❌ [RealtimeService] Subscription failed');
            this.isSubscribing = false;
            reject(new Error('Failed to subscribe to channel'));
          }
        });
      });

      await subscriptionPromise;
      console.log(
        '🎉 [RealtimeService] Successfully subscribed to conversation:',
        conversationId,
      );
    } catch (error) {
      this.isSubscribing = false;
      console.error('❌ [RealtimeService] Subscription error:', error);
      throw error;
    }
  }

  /**
   * Unsubscribe from the current channel
   */
  async unsubscribe(): Promise<void> {
    console.log('🔌 [RealtimeService] Unsubscribe called:', {
      hasChannel: Boolean(this.channel),
      channelTopic: this.channel?.topic,
      isSubscribed: this.isSubscribed,
      isSubscribing: this.isSubscribing,
    });

    this.shouldReconnect = false; // Disable reconnection when explicitly unsubscribing

    if (this.channel) {
      try {
        console.log(
          '🔓 [RealtimeService] Unsubscribing from channel:',
          this.channel.topic,
        );
        await this.channel.unsubscribe();
        console.log(
          '✅ [RealtimeService] Successfully unsubscribed from channel',
        );
      } catch (error) {
        console.error(
          '❌ [RealtimeService] Error unsubscribing from channel:',
          error,
        );
        // Don't throw - we want cleanup to continue
      }

      this.channel = null;
    }

    // Reset state
    this.isSubscribed = false;
    this.isSubscribing = false;
    this.conversationId = null;
    this.callbacks = {};

    // Clear any pending reconnection
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    this.reconnectAttempts = 0;

    console.log('🧹 [RealtimeService] Cleanup completed');
  }

  /**
   * Send a new message broadcast
   */
  async broadcastNewMessage(message: ChatMessage): Promise<void> {
    const sendTimestamp = Date.now();
    console.log('📤 [RealtimeService] Broadcasting message:', {
      messageId: message.id,
      conversationId: message.conversation_id,
      sendTimestamp,
      hasChannel: Boolean(this.channel),
      channelTopic: this.channel?.topic,
      isSubscribed: this.isSubscribed,
      isConnected: this.isConnected(),
    });

    if (!this.channel) {
      console.error(
        '❌ [RealtimeService] Cannot broadcast - not subscribed to any channel',
      );
      throw new Error('Not subscribed to any channel');
    }

    try {
      console.log('📡 [RealtimeService] Sending broadcast...');
      await this.channel.send({
        type: 'broadcast',
        event: 'new_message',
        payload: { message },
      });
      const broadcastDuration = Date.now() - sendTimestamp;
      console.log(
        '✅ [RealtimeService] Message broadcast sent successfully in',
        broadcastDuration,
        'ms',
      );
    } catch (error) {
      console.error('💥 [RealtimeService] Failed to broadcast message:', error);
      throw error;
    }
  }

  /**
   * Send typing indicator
   */
  async sendTypingIndicator(isTyping: boolean): Promise<void> {
    if (!this.channel || !this.userId || !this.conversationId) {
      return;
    }

    await this.channel.send({
      type: 'broadcast',
      event: isTyping ? 'typing_start' : 'typing_stop',
      payload: {
        user_id: this.userId,
        conversation_id: this.conversationId,
      },
    });
  }

  /**
   * Set up event listeners for the channel
   */
  private setupEventListeners(): void {
    if (!this.channel) return;

    // Presence listeners
    this.channel.on('presence', { event: 'sync' }, () => {
      if (!this.channel) return;
      const newState = this.channel.presenceState();
      this.presenceState = newState as unknown as PresenceStateRecord;
      this.callbacks.onPresenceSync?.(
        newState as unknown as PresenceStateRecord,
      );
    });

    this.channel.on('presence', { event: 'join' }, ({ key, newPresences }) => {
      this.callbacks.onPresenceJoin?.(
        key,
        newPresences as unknown as PresenceEntry[],
      );
    });

    this.channel.on(
      'presence',
      { event: 'leave' },
      ({ key, leftPresences }) => {
        this.callbacks.onPresenceLeave?.(
          key,
          leftPresences as unknown as PresenceEntry[],
        );
      },
    );

    // Listen for new messages via postgres_changes (reliable fallback)
    this.channel.on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${this.conversationId}`,
      },
      (payload) => {
        const messageId = payload.new?.['id'];
        if (messageId) {
          console.log(
            '📨 [RealtimeService] New message via postgres_changes:',
            messageId,
          );
          this.callbacks.onNewMessage?.(payload.new as ChatMessage);
        }
      },
    );

    // Listen for broadcast messages (faster delivery)
    this.channel.on('broadcast', { event: 'new_message' }, (payload) => {
      const payloadData = payload as { payload?: { message?: ChatMessage } };
      const message = payloadData.payload?.message;
      const timestamp = Date.now();

      console.log('📨 [RealtimeService] Broadcast received:', {
        messageId: message?.id,
        timestamp,
        payloadStructure: Object.keys(payloadData.payload || {}),
        hasMessage: Boolean(message),
        messageCreatedAt: message?.created_at,
        timeSinceCreation: message?.created_at
          ? timestamp - new Date(message.created_at).getTime()
          : 'unknown',
      });

      if (message) {
        console.log(
          '✅ [RealtimeService] Calling onNewMessage with broadcast data',
        );
        this.callbacks.onNewMessage?.(message);
      } else {
        console.warn(
          '⚠️ [RealtimeService] No message in broadcast payload:',
          payloadData,
        );
      }
    });

    // Listen for typing indicators
    this.channel.on('broadcast', { event: 'typing_start' }, (payload) => {
      const typingPayload = payload as { payload?: { user_id?: string } };
      const userId = typingPayload.payload?.user_id;
      if (userId && userId !== this.userId) {
        this.callbacks.onTypingStart?.(userId);
      }
    });

    this.channel.on('broadcast', { event: 'typing_stop' }, (payload) => {
      const typingPayload = payload as { payload?: { user_id?: string } };
      const userId = typingPayload.payload?.user_id;
      if (userId && userId !== this.userId) {
        this.callbacks.onTypingStop?.(userId);
      }
    });

    console.log('✅ [RealtimeService] Event listeners configured');
  }

  /**
   * Check if service is connected
   */
  isConnected(): boolean {
    return String(this.channel?.state) === 'joined';
  }

  /**
   * Track user's presence state
   */
  private async trackPresence(): Promise<void> {
    if (!this.userId || !this.channel) {
      console.warn('Cannot track presence: missing userId or channel');
      return;
    }

    await this.channel.track({
      user_id: this.userId,
      online_at: new Date().toISOString(),
      // Add more state as needed, e.g. status: 'online'
    });
  }

  /**
   * Untrack user's presence
   */
  private async untrackPresence(): Promise<void> {
    if (!this.channel) {
      console.warn('Cannot untrack presence: no active channel');
      return;
    }
    await this.channel.untrack();
  }

  /**
   * Schedule reconnection with exponential backoff
   */
  private scheduleReconnect(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }

    const delay = this.baseReconnectDelay * Math.pow(2, this.reconnectAttempts);
    const jitter = Math.random() * 0.1 * delay; // Add 10% jitter
    const totalDelay = delay + jitter;

    console.log(
      `Scheduling reconnect attempt ${this.reconnectAttempts + 1} in ${Math.round(totalDelay)}ms`,
    );

    this.reconnectTimeout = setTimeout(() => {
      this.reconnectAttempts++;
      this.attemptReconnect();
    }, totalDelay);
  }

  /**
   * Attempt to reconnect to the channel
   */
  private async attemptReconnect(): Promise<void> {
    if (!this.conversationId || !this.shouldReconnect) {
      return;
    }

    console.log(
      `Attempting reconnection ${this.reconnectAttempts}/${this.maxReconnectAttempts}`,
    );

    try {
      // Reset state and try to subscribe again
      this.isSubscribing = false;
      this.isSubscribed = false;
      await this.subscribe(this.conversationId, this.callbacks);
    } catch (error) {
      console.error('Reconnection attempt failed:', error);

      if (this.reconnectAttempts < this.maxReconnectAttempts) {
        this.scheduleReconnect();
      } else {
        console.error('Max reconnection attempts reached');
        this.callbacks.onError?.(
          new Error('Failed to reconnect after maximum attempts'),
        );
      }
    }
  }

  /**
   * Get current presence state
   */
  getPresenceState(): PresenceStateRecord {
    return { ...this.presenceState };
  }
}

// Export singleton instance
export const chatRealtimeService = new ChatRealtimeService();
