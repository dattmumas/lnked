'use client';

import { useChatUIStore } from '@/lib/stores/chat-ui-store';
import supabase from '@/lib/supabase/browser';

import { chatSecurity } from './security';

import type {
  MessageWithSender,
  BroadcastMessage,
  TypingIndicator,
} from './types';
import type {
  User,
  RealtimeChannel,
  RealtimePostgresChangesPayload,
} from '@supabase/supabase-js';

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

// Throttle: refuse new join attempts if the same channel joined <1s ago
export const MIN_JOIN_INTERVAL_MS = 1000 as const;

// Back-off settings for quota errors
export const BACKOFF_INITIAL_MS = 2000 as const;
export const BACKOFF_MAX_MS = 30000 as const;

// Debug logging configuration
// To enable verbose logging, set REALTIME_DEBUG=true in your environment
const DEBUG_LOGGING = {
  // Reduce verbose logging to prevent performance issues
  ENABLED:
    process.env.NODE_ENV === 'development' &&
    process.env['REALTIME_DEBUG'] === 'true',
  // Log only critical events by default
  CRITICAL_ONLY: process.env.NODE_ENV === 'development',
};

// Helper function for conditional logging
function debugLog(
  level: 'critical' | 'verbose',
  message: string,
  ...args: unknown[]
): void {
  if (level === 'critical' && DEBUG_LOGGING.CRITICAL_ONLY) {
    console.log(message, ...args);
  } else if (level === 'verbose' && DEBUG_LOGGING.ENABLED) {
    console.log(message, ...args);
  }
}

// Supabase channel states as constants
const CHANNEL_STATES = {
  SUBSCRIBED: 'SUBSCRIBED',
  CHANNEL_ERROR: 'CHANNEL_ERROR',
  TIMED_OUT: 'TIMED_OUT',
  CLOSED: 'CLOSED',
  JOINED: 'joined',
  CLOSED_LOWERCASE: 'closed',
} as const;

// Treat these as "alive" – never call .subscribe() again on them
const GOOD_STATES = new Set([
  'joining',
  'joined',
  'leaving',
  // Supabase v2 Phoenix adapter returns upper-case status strings after the
  // initial handshake. Treat them as healthy as well.
  'SUBSCRIBED',
  'JOINED',
] as const);

/**
 * Real-time service following Supabase's official patterns with enhanced security
 * Based on: https://supabase.com/docs/guides/realtime/broadcast
 * and: https://supabase.com/docs/guides/realtime/postgres-changes
 */

interface VideoStatusUpdate {
  id: string;
  status: string;
  duration?: number;
  aspect_ratio?: string;
  mux_playback_id?: string;
  updated_at: string;
}

interface PostUpdate {
  id: string;
  title?: string;
  content?: string;
  status?: string;
  updated_at: string;
}

interface RealtimeErrorEvent {
  reason?: string;
  status?: string;
  message?: string;
}

export class RealtimeService {
  private supabase = supabase;
  private channels: Map<string, RealtimeChannel> = new Map();
  private messageHandlers: Map<string, (_message: MessageWithSender) => void> =
    new Map();
  private typingHandlers: Map<string, (_typing: TypingIndicator[]) => void> =
    new Map();
  private videoStatusHandlers: Map<
    string,
    (_update: VideoStatusUpdate) => void
  > = new Map();
  private postUpdateHandlers: Map<string, (_update: PostUpdate) => void> =
    new Map();
  private typingTimeout: Map<string, NodeJS.Timeout> = new Map();
  private subscriptionDebounce: Map<string, NodeJS.Timeout> = new Map();
  private pendingSubscriptions: Set<string> = new Set();
  private activeSubscriptionAttempts: Set<string> = new Set();
  private authRefreshInProgress = false;

  /**
   * Track how many React components are using the same channel so we can safely
   * unsubscribe only when the last consumer unmounts.
   */
  private channelRefCounts: Map<string, number> = new Map();

  /** Timestamp of last successful join (ms since epoch) */
  private lastJoinAt: Map<string, number> = new Map();

  /** Exponential back-off per channel (ms) */
  private backoffMs: Map<string, number> = new Map();

  /** Pending subscribe() promises keyed by channelName */
  private channelPromises: Map<string, Promise<RealtimeChannel>> = new Map();

  /** Increment reference counter for a channel */
  private addRef(channelName: string): void {
    const current = this.channelRefCounts.get(channelName) ?? 0;
    this.channelRefCounts.set(channelName, current + 1);
  }

  /**
   * Decrement reference counter and perform full cleanup when the last
   * reference is released.
   */
  private async releaseRef(channelName: string): Promise<void> {
    const current = this.channelRefCounts.get(channelName) ?? 0;
    if (current <= 1) {
      this.channelRefCounts.delete(channelName);
      const channel = this.channels.get(channelName);
      if (channel) {
        try {
          await this.supabase.removeChannel(channel);
        } catch (err) {
          console.warn('Failed to remove Supabase channel:', err);
        }
      }
      this.channels.delete(channelName);
    } else {
      this.channelRefCounts.set(channelName, current - 1);
    }
  }

  /**
   * Remove a lingering Supabase-cached channel so that subsequent calls to
   * `supabase.channel(topic)` return a brand-new instance. This prevents the
   * "subscribe can only be called a single time per channel instance" error
   * when Fast-Refresh kept the internal Supabase Channel alive while our own
   * maps dropped it.
   */
  private cleanupCachedChannel(topic: string): void {
    const cached = this.supabase.getChannels().find((c) => c.topic === topic);
    if (cached !== undefined) {
      try {
        // The `removeChannel` signature is intentionally broad; ignore types.

        void this.supabase.removeChannel(cached);
      } catch {
        /* Swallow – channel might have been removed already. */
      }
    }

    // In development, also clean up any stale channels with the same topic pattern
    if (process.env.NODE_ENV === 'development') {
      const allChannels = this.supabase.getChannels();
      const topicPrefix = topic.split(':')[0];
      const staleChannels = allChannels.filter(
        (c) =>
          topicPrefix &&
          c.topic.includes(topicPrefix) &&
          (String(c.state) === 'closed' || String(c.state) === 'errored'),
      );

      staleChannels.forEach((staleChannel) => {
        try {
          void this.supabase.removeChannel(staleChannel);
        } catch {
          /* Swallow errors */
        }
      });
    }
  }

  constructor() {
    this.setupAuthRefreshHandler();

    // DEV helper: log raw phoenix replies to spot quota errors
    // Attach PHX reply logger (types may not expose APIs – ignore TS for dev aid)
    if (process.env.NODE_ENV === 'development') {
      // @ts-expect-error onOpen not typed in supabase-js
      this.supabase.realtime.onOpen?.(() => {
        this.supabase.getChannels().forEach((ch) => {
          // @ts-expect-error phx_reply event not typed
          ch.on('phx_reply', {}, (msg: unknown) => {
            // eslint-disable-next-line no-console
            console.debug('[PHX_REPLY]', msg);
          });
        });
      });
    }
  }

  /**
   * Set up auth state change handler to refresh channels on token refresh
   */
  private setupAuthRefreshHandler(): void {
    this.supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT') {
        console.log('🔒 User signed out, cleaning up all subscriptions');
        this.unsubscribeFromAll();
        // Reset the chat UI store to clear all state
        useChatUIStore.getState().reset();
      } else if (event === 'TOKEN_REFRESHED') {
        console.log('🔄 Token refreshed, re-subscribing to channels');
        await this.refreshAllChannels();
      }
    });
  }

  /**
   * Refresh all active channels after auth token refresh
   */
  private async refreshAllChannels(): Promise<void> {
    if (this.authRefreshInProgress) return;

    this.authRefreshInProgress = true;

    try {
      const activeConversations = Array.from(this.channels.keys());
      const handlers = new Map<
        string,
        {
          onMessage?: (_message: MessageWithSender) => void;
          onTyping?: (_typing: TypingIndicator[]) => void;
        }
      >();

      // Store current handlers without introducing undefined properties for
      // `exactOptionalPropertyTypes` compatibility.
      for (const conversationId of activeConversations) {
        const handlerObj: {
          onMessage?: (_message: MessageWithSender) => void;
          onTyping?: (_typing: TypingIndicator[]) => void;
        } = {};

        const onMessageHandler = this.messageHandlers.get(conversationId);
        if (onMessageHandler !== undefined) {
          handlerObj.onMessage = onMessageHandler;
        }

        const onTypingHandler = this.typingHandlers.get(conversationId);
        if (onTypingHandler !== undefined) {
          handlerObj.onTyping = onTypingHandler;
        }

        handlers.set(conversationId, handlerObj);
      }

      // Unsubscribe from all
      this.unsubscribeFromAll();

      // Wait a bit for cleanup
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Re-subscribe with fresh tokens
      for (const [conversationId, handler] of handlers) {
        if (handler.onMessage !== undefined || handler.onTyping !== undefined) {
          await this.subscribeToConversation(conversationId, handler);
        }
      }
    } finally {
      this.authRefreshInProgress = false;
    }
  }

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
    },
  ): Promise<RealtimeChannel | undefined> {
    const channelName = `conversation:${conversationId}`;
    // Ensure no orphaned Supabase channel remains from a previous Fast-Refresh.
    this.cleanupCachedChannel(channelName);

    console.log(`🔍 [ENTER] subscribeToConversation(${conversationId})`);
    console.log(
      '  pendingSubscriptions:',
      Array.from(this.pendingSubscriptions),
    );
    console.log(
      '  activeSubscriptionAttempts:',
      Array.from(this.activeSubscriptionAttempts),
    );
    console.log('  channels:', Array.from(this.channels.keys()));

    // Prevent multiple simultaneous subscriptions to the same conversation
    if (
      this.pendingSubscriptions.has(conversationId) ||
      this.activeSubscriptionAttempts.has(conversationId)
    ) {
      console.log(
        `⏳ [GUARD] Subscription already pending or in progress for ${conversationId}`,
      );
      return this.channels.get(conversationId);
    }

    // Mark this subscription attempt as active
    this.activeSubscriptionAttempts.add(conversationId);

    // Create the subscription
    const subscriptionPromise = this.performSubscription(
      conversationId,
      callbacks,
    );

    try {
      const result = await subscriptionPromise;
      return result;
    } finally {
      // Note: We DON'T delete the singleton here - it stays until explicitly cleared
      this.activeSubscriptionAttempts.delete(conversationId);
      console.log(`🔚 [EXIT] subscribeToConversation(${conversationId})`);
      console.log(
        '  pendingSubscriptions:',
        Array.from(this.pendingSubscriptions),
      );
      console.log(
        '  activeSubscriptionAttempts:',
        Array.from(this.activeSubscriptionAttempts),
      );
      console.log('  channels:', Array.from(this.channels.keys()));
    }
  }

  private async performSubscription(
    conversationId: string,
    callbacks: {
      onMessage?: (_message: MessageWithSender) => void;
      onTyping?: (_typing: TypingIndicator[]) => void;
      onMessageUpdate?: (_message: MessageWithSender) => void;
      onMessageDelete?: (_messageId: string) => void;
      onUserJoin?: (_userId: string) => void;
      onUserLeave?: (_userId: string) => void;
    },
  ): Promise<RealtimeChannel | undefined> {
    const channelName = `conversation:${conversationId}`;

    try {
      // Debounce rapid subscription attempts (especially during Fast Refresh in development)
      const existingDebounce = this.subscriptionDebounce.get(conversationId);
      if (existingDebounce) {
        clearTimeout(existingDebounce);
      }

      // In development, add a small delay to prevent race conditions during Fast Refresh
      if (process.env.NODE_ENV === 'development') {
        await new Promise((resolve) => {
          const timeout = setTimeout(resolve, 100);
          this.subscriptionDebounce.set(conversationId, timeout);
        });
        this.subscriptionDebounce.delete(conversationId);
      }

      // If there's already an active channel, reuse it if it's in a good state
      const existingChannel = this.channels.get(conversationId);
      if (existingChannel) {
        const s = String(existingChannel.state);
        console.log(
          `🔍 [REUSE] Found existing channel for ${conversationId} in state: ${s}`,
        );
        if (GOOD_STATES.has(s as never)) {
          // channel already live (or closing) → reuse, don't resubscribe
          // refresh handler references
          console.log(
            `♻️ [REUSE] Reusing existing channel for ${conversationId}`,
          );
          if (callbacks.onMessage)
            this.messageHandlers.set(conversationId, callbacks.onMessage);
          if (callbacks.onTyping)
            this.typingHandlers.set(conversationId, callbacks.onTyping);
          return existingChannel;
        }
        // if it's fully closed we can drop it
        if (
          s === String(CHANNEL_STATES.CLOSED) ||
          s === String(CHANNEL_STATES.CLOSED_LOWERCASE)
        ) {
          console.log(
            `🗑️ [DROP] Removing closed channel for ${conversationId}`,
          );
          this.channels.delete(conversationId);
        }
      }

      // Security check: Verify user can access this conversation
      const user = await this.getCurrentUser();
      if (!user) {
        console.error(
          '[ERROR] User not authenticated for real-time subscription',
        );
        return undefined;
      }

      const canView = await chatSecurity.canViewConversation(
        conversationId,
        user.id,
      );
      if (!canView) {
        chatSecurity.logSecurityEvent({
          action: 'realtime_subscription_denied',
          userId: user.id,
          conversationId,
          success: false,
          details: {
            reason: 'User not authorized to subscribe to this conversation',
          },
        });
        console.error(
          '[ERROR] User not authorized to subscribe to conversation:',
          conversationId,
        );
        return undefined;
      }

      // Mark subscription as pending
      this.pendingSubscriptions.add(conversationId);
      console.log(
        `📝 [PENDING] Marked ${conversationId} as pending subscription`,
      );

      // Create new channel following Supabase patterns
      console.log(`🆕 [CREATE] Creating new channel for ${conversationId}`);
      const channel = this.supabase
        .channel(channelName, {
          config: {
            broadcast: { self: false }, // Don't broadcast to self
            presence: { key: user.id }, // Track presence using user ID for accurate presence tracking
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
          (
            payload: RealtimePostgresChangesPayload<Record<string, unknown>>,
          ) => {
            void (async () => {
              if (
                payload.new !== undefined &&
                typeof callbacks.onMessage === 'function'
              ) {
                // Fetch full message with sender info
                const newMessage = payload.new as { id: string };

                const { data: message } = await this.supabase
                  .from('messages')
                  .select(
                    `
                    *,
                    sender:users!messages_sender_id_fkey(id, full_name, username, avatar_url),
                    reply_to:messages(
                      *,
                      sender:users!messages_sender_id_fkey(id, full_name, username, avatar_url)
                    )
                  `,
                  )
                  .eq('id', newMessage.id)
                  .single();

                if (message !== null && message !== undefined) {
                  callbacks.onMessage(message as unknown as MessageWithSender);
                }
              }
            })().catch(console.error);
          },
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
          (
            payload: RealtimePostgresChangesPayload<Record<string, unknown>>,
          ) => {
            void (async () => {
              if (
                payload.new !== undefined &&
                typeof callbacks.onMessageUpdate === 'function'
              ) {
                // Fetch updated message with sender info
                const updatedMessage = payload.new as { id: string };
                const { data: message } = await this.supabase
                  .from('messages')
                  .select(
                    `
                    *,
                    sender:users!messages_sender_id_fkey(id, full_name, username, avatar_url),
                    reply_to:messages(
                      *,
                      sender:users!messages_sender_id_fkey(id, full_name, username, avatar_url)
                    )
                  `,
                  )
                  .eq('id', updatedMessage.id)
                  .single();

                if (message !== null && message !== undefined) {
                  callbacks.onMessageUpdate(
                    message as unknown as MessageWithSender,
                  );
                }
              }
            })().catch(console.error);
          },
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
          (
            payload: RealtimePostgresChangesPayload<Record<string, unknown>>,
          ) => {
            if (
              payload.new !== undefined &&
              typeof callbacks.onMessageDelete === 'function'
            ) {
              const deletedMessage = payload.new as {
                id: string;
                deleted_at?: string | null | undefined;
              };
              if (
                typeof deletedMessage.deleted_at === 'string' &&
                deletedMessage.deleted_at.length > 0
              ) {
                callbacks.onMessageDelete(deletedMessage.id);
              }
            }
          },
        )

        // Listen for typing indicators via Broadcast
        .on(
          'broadcast',
          { event: 'typing_start' },
          (payload: BroadcastMessage) => {
            if (
              typeof payload.payload.user_id === 'string' &&
              payload.payload.user_id !== '' &&
              typeof callbacks.onTyping === 'function'
            ) {
              this.handleTypingStart(
                conversationId,
                payload.payload,
                callbacks.onTyping,
              );
            }
          },
        )

        .on(
          'broadcast',
          { event: 'typing_stop' },
          (payload: BroadcastMessage) => {
            if (
              typeof payload.payload.user_id === 'string' &&
              payload.payload.user_id !== '' &&
              typeof callbacks.onTyping === 'function'
            ) {
              this.handleTypingStop(
                conversationId,
                payload.payload,
                callbacks.onTyping,
              );
            }
          },
        )

        // Listen for user presence changes
        .on(
          'broadcast',
          { event: 'user_join' },
          (payload: BroadcastMessage) => {
            if (
              typeof payload.payload.user_id === 'string' &&
              payload.payload.user_id !== '' &&
              typeof callbacks.onUserJoin === 'function'
            ) {
              callbacks.onUserJoin(payload.payload.user_id);
            }
          },
        )

        .on(
          'broadcast',
          { event: 'user_leave' },
          (payload: BroadcastMessage) => {
            if (
              typeof payload.payload.user_id === 'string' &&
              payload.payload.user_id !== '' &&
              typeof callbacks.onUserLeave === 'function'
            ) {
              callbacks.onUserLeave(payload.payload.user_id);
            }
          },
        )

        // Enhanced error handling - ONLY handle actual errors, not success messages
        .on('system', { event: 'error' }, (error: { reason?: string }) => {
          const reason = error?.reason ?? 'unknown';

          // Filter out success messages that are incorrectly sent to error handler
          const errorData = error as RealtimeErrorEvent;
          if (
            errorData?.status === 'ok' &&
            errorData?.message?.includes('Subscribed')
          ) {
            console.log(
              `✅ RealtimeService: Success message for ${conversationId}:`,
              errorData.message,
            );
            return;
          }

          console.error(
            `❌ RealtimeService: Channel error for ${conversationId}:`,
            error,
          );
          this.pendingSubscriptions.delete(conversationId);

          // Disable auto-retry in development to prevent Fast Refresh issues
          if (process.env.NODE_ENV !== 'development') {
            // Auto-retry with exponential backoff (production only)
            setTimeout(() => {
              if (this.channels.has(conversationId)) {
                console.warn(
                  `🔄 RealtimeService: Retrying subscription to ${conversationId} after error`,
                );
                void this.subscribeToConversation(conversationId, callbacks);
              }
            }, CHANNEL_RETRY_DELAY_MS);
          } else {
            console.warn(
              `🚫 RealtimeService: Auto-retry disabled in development for ${conversationId}`,
            );
          }
        })

        .on('system', { event: 'close' }, () => {
          console.warn(
            `🔒 RealtimeService: Channel closed for ${conversationId}`,
          );
          this.pendingSubscriptions.delete(conversationId);
          this.channels.delete(conversationId);
          this.messageHandlers.delete(conversationId);
          this.typingHandlers.delete(conversationId);
        });

      // Subscribe to the channel with enhanced error handling
      try {
        console.log(`[CALL] channel.subscribe() for ${conversationId}`);
        await channel.subscribe((status) => {
          // Type-safe status checking
          const statusString = String(status);
          console.log(
            `📡 [STATUS] Subscription status for ${conversationId}: ${statusString}`,
          );

          switch (statusString) {
            case CHANNEL_STATES.SUBSCRIBED:
              console.log(
                `✅ RealtimeService: Successfully subscribed to ${conversationId}`,
              );
              this.pendingSubscriptions.delete(conversationId);
              if (typeof callbacks.onUserJoin === 'function') {
                void this.broadcastUserJoin(conversationId);
              }
              break;
            case CHANNEL_STATES.CHANNEL_ERROR:
              console.error(
                `❌ Channel error for conversation ${conversationId}`,
              );
              this.pendingSubscriptions.delete(conversationId);
              // Disable auto-retry in development to prevent Fast Refresh issues
              if (process.env.NODE_ENV !== 'development') {
                // Auto-retry after a delay to prevent infinite retry loops (production only)
                setTimeout(() => {
                  if (this.channels.has(conversationId)) {
                    console.warn(
                      `🔄 Retrying subscription to conversation ${conversationId}`,
                    );
                    void this.subscribeToConversation(
                      conversationId,
                      callbacks,
                    );
                  }
                }, CHANNEL_RETRY_DELAY_MS);
              } else {
                console.warn(
                  `🚫 Auto-retry disabled in development for ${conversationId}`,
                );
              }
              break;
            case CHANNEL_STATES.TIMED_OUT:
              console.error(
                `⏰ Subscription timeout for conversation ${conversationId}`,
              );
              this.pendingSubscriptions.delete(conversationId);
              // Clean up and retry
              this.channels.delete(conversationId);
              // Disable auto-retry in development to prevent Fast Refresh issues
              if (process.env.NODE_ENV !== 'development') {
                setTimeout(() => {
                  console.warn(
                    `🔄 Retrying subscription after timeout: ${conversationId}`,
                  );
                  void this.subscribeToConversation(conversationId, callbacks);
                }, TIMEOUT_RETRY_DELAY_MS);
              } else {
                console.warn(
                  `🚫 Timeout auto-retry disabled in development for ${conversationId}`,
                );
              }
              break;
            case CHANNEL_STATES.CLOSED:
            case CHANNEL_STATES.CLOSED_LOWERCASE:
              console.log(
                `🔒 RealtimeService: Channel closed for ${conversationId}`,
              );
              this.pendingSubscriptions.delete(conversationId);
              this.channels.delete(conversationId);
              this.messageHandlers.delete(conversationId);
              this.typingHandlers.delete(conversationId);
              break;
            default:
              console.error(
                `❓ Unknown subscription status for conversation ${conversationId}:`,
                status,
              );
              this.pendingSubscriptions.delete(conversationId);
          }
        });
      } catch (error) {
        console.error(
          `[ERROR] Failed to subscribe to ${conversationId}:`,
          error,
        );
        this.pendingSubscriptions.delete(conversationId);
        throw error;
      }

      this.channels.set(conversationId, channel);
      this.channelRefCounts.set(conversationId, 1);
      this.lastJoinAt.set(conversationId, Date.now());
      this.backoffMs.set(conversationId, BACKOFF_INITIAL_MS);
      console.log(`💾 [STORE] Stored channel for ${conversationId}`);

      // Store callbacks for cleanup
      if (callbacks.onMessage) {
        this.messageHandlers.set(conversationId, callbacks.onMessage);
      }
      if (callbacks.onTyping) {
        this.typingHandlers.set(conversationId, callbacks.onTyping);
      }

      return channel;
    } catch (error) {
      console.error(
        `[ERROR] Failed to perform subscription to ${conversationId}:`,
        error,
      );
      this.pendingSubscriptions.delete(conversationId);
      throw error;
    }
  }

  /**
   * Unsubscribe from a conversation
   */
  async unsubscribeFromConversation(conversationId: string): Promise<void> {
    console.log(`🔌 [ENTER] unsubscribeFromConversation(${conversationId})`);
    // Clear any active subscription attempts
    this.activeSubscriptionAttempts.delete(conversationId);

    const channel = this.channels.get(conversationId);
    if (channel) {
      console.log(
        `📤 [FOUND] Found channel to unsubscribe for ${conversationId}`,
      );
      // mark as leaving; actual removal happens in CLOSED status handler

      // Announce user leaving before unsubscribing (only if channel is active)
      const channelState = String(channel.state);
      console.log(
        `🔍 [STATE] Channel state for ${conversationId}: ${channelState}`,
      );
      if (channelState === CHANNEL_STATES.JOINED) {
        await this.broadcastUserLeave(conversationId);
      }

      // Only unsubscribe if channel is not already closed
      if (channelState !== CHANNEL_STATES.CLOSED_LOWERCASE) {
        console.log(`📤 [CALL] Calling unsubscribe for ${conversationId}`);
        // CRITICAL FIX: Await the unsubscribe to prevent race conditions
        await channel.unsubscribe();
      } else {
        console.log(
          `⏭️ [SKIP] Skipping unsubscribe for already closed channel ${conversationId}`,
        );
      }

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

      // Clean up localStorage typing data to prevent accumulation
      localStorage.removeItem(`typing:${conversationId}`);
    } else {
      console.log(
        `❌ [NOTFOUND] No channel found to unsubscribe for ${conversationId}`,
      );
      // Still clean up pending state even if no channel exists
      this.pendingSubscriptions.delete(conversationId);
    }
    console.log(`🔚 [EXIT] unsubscribeFromConversation(${conversationId})`);
    console.log(
      '  pendingSubscriptions:',
      Array.from(this.pendingSubscriptions),
    );
    console.log(
      '  activeSubscriptionAttempts:',
      Array.from(this.activeSubscriptionAttempts),
    );
    console.log('  channels:', Array.from(this.channels.keys()));
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

    // Log every outbound typing_start event for easier mount tracing
    console.log('[RealtimeService] Sending typing_start payload', {
      user_id: user.id,
      conversation_id: conversationId,
    });

    void channel.send({
      type: 'broadcast',
      event: 'typing_start',
      payload: {
        user_id: user.id,
        username:
          ((user.user_metadata as Record<string, unknown>)?.['username'] as
            | string
            | null) ?? null,
        full_name:
          ((user.user_metadata as Record<string, unknown>)?.['full_name'] as
            | string
            | null) ?? null,
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
      }, TYPING_STOP_DELAY_MS),
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

    // Log every outbound typing_stop event for easier mount tracing
    console.log('[RealtimeService] Sending typing_stop payload', {
      user_id: user.id,
      conversation_id: conversationId,
    });

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
    onTyping?: (_typing: TypingIndicator[]) => void,
  ): void {
    if (
      typeof payload.user_id !== 'string' ||
      payload.user_id === '' ||
      typeof onTyping !== 'function'
    ) {
      return;
    }

    const currentTyping = this.getTypingUsers(conversationId);

    // Add or update typing user
    const existingIndex = currentTyping.findIndex(
      (t) => t.user_id === payload.user_id,
    );
    const typingIndicator: TypingIndicator = {
      user_id: payload.user_id,
      username:
        ((payload as Record<string, unknown>)['username'] as string | null) ??
        null,
      full_name:
        ((payload as Record<string, unknown>)['full_name'] as string | null) ??
        null,
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
    onTyping?: (_typing: TypingIndicator[]) => void,
  ): void {
    if (
      typeof payload.user_id !== 'string' ||
      payload.user_id === '' ||
      typeof onTyping !== 'function'
    ) {
      return;
    }

    const currentTyping = this.getTypingUsers(conversationId);
    const filteredTyping = currentTyping.filter(
      (t) => t.user_id !== payload.user_id,
    );

    this.setTypingUsers(conversationId, filteredTyping);
    onTyping(filteredTyping);
  }

  /**
   * Get typing users for a conversation
   */
  private getTypingUsers(conversationId: string): TypingIndicator[] {
    const stored = localStorage.getItem(`typing:${conversationId}`);
    if (stored) {
      return JSON.parse(stored);
    }
    return [];
  }

  private setTypingUsers(
    conversationId: string,
    typingUsers: TypingIndicator[],
  ): void {
    localStorage.setItem(
      `typing:${conversationId}`,
      JSON.stringify(typingUsers),
    );
  }

  private async getCurrentUser(): Promise<User | null> {
    const {
      data: { session },
    } = await this.supabase.auth.getSession();
    return session?.user ?? null;
  }

  // ---------------------------------------------------------------------------
  // Post / Video update channels (feed + video processing)
  // ---------------------------------------------------------------------------

  /** Subscribe to video processing status updates for a user */
  async subscribeToVideoStatus(
    userId: string,
    callback: (_update: VideoStatusUpdate) => void,
  ): Promise<RealtimeChannel | undefined> {
    const channelName = `video_status:${userId}`;

    debugLog(
      'critical',
      `🎬 [VIDEO-STATUS] Starting subscription for ${channelName}`,
    );

    // Throttle re-joins within MIN_JOIN_INTERVAL_MS
    const last = this.lastJoinAt.get(channelName) ?? 0;
    debugLog(
      'verbose',
      `🎬 [VIDEO-STATUS] Last join for ${channelName}: ${last}, current: ${Date.now()}, diff: ${Date.now() - last}ms`,
    );
    if (Date.now() - last < MIN_JOIN_INTERVAL_MS) {
      debugLog(
        'verbose',
        `⚠️ Throttled rejoin attempt for ${channelName} – join occurred <${MIN_JOIN_INTERVAL_MS}ms ago`,
      );
      return this.channels.get(channelName);
    }

    // Guard against duplicate or concurrent subscription attempts.
    debugLog(
      'verbose',
      `🎬 [VIDEO-STATUS] Checking promises/attempts for ${channelName}:`,
      {
        hasPromise: this.channelPromises.has(channelName),
        hasAttempt: this.activeSubscriptionAttempts.has(channelName),
        hasPending: this.pendingSubscriptions.has(channelName),
      },
    );
    if (this.channelPromises.has(channelName)) {
      debugLog(
        'verbose',
        `🎬 [VIDEO-STATUS] Returning existing promise for ${channelName}`,
      );
      return this.channelPromises.get(channelName);
    }
    this.activeSubscriptionAttempts.add(channelName);
    debugLog(
      'verbose',
      `🎬 [VIDEO-STATUS] Added ${channelName} to active attempts`,
    );

    // Debounce rapid consecutive calls during Fast-Refresh / StrictMode mounts.
    const existingDebounce = this.subscriptionDebounce.get(channelName);
    debugLog(
      'verbose',
      `🎬 [VIDEO-STATUS] Debounce check for ${channelName}:`,
      Boolean(existingDebounce),
    );
    if (existingDebounce) {
      clearTimeout(existingDebounce);
      debugLog(
        'verbose',
        `🎬 [VIDEO-STATUS] Cleared existing debounce for ${channelName}`,
      );
    }
    if (process.env.NODE_ENV === 'development') {
      debugLog(
        'verbose',
        `🎬 [VIDEO-STATUS] Starting 100ms debounce for ${channelName}`,
      );
      await new Promise((resolve) => {
        const t = setTimeout(resolve, 100);
        this.subscriptionDebounce.set(channelName, t);
      });
      this.subscriptionDebounce.delete(channelName);
      debugLog(
        'verbose',
        `🎬 [VIDEO-STATUS] Debounce completed for ${channelName}`,
      );
    }

    // Re-use existing channel when alive
    const existing = this.channels.get(channelName);
    debugLog(
      'verbose',
      `🎬 [VIDEO-STATUS] Existing channel for ${channelName}:`,
      existing ? 'exists' : 'none',
    );
    if (existing && GOOD_STATES.has(String(existing.state) as never)) {
      debugLog(
        'verbose',
        `🎬 [VIDEO-STATUS] Reusing healthy existing channel for ${channelName}`,
      );
      this.videoStatusHandlers.set(userId, callback);
      this.addRef(channelName);
      return existing;
    }
    if (existing) {
      debugLog(
        'verbose',
        `🎬 [VIDEO-STATUS] Cleaning up unhealthy existing channel for ${channelName}`,
      );
      await this.releaseRef(channelName);
      this.videoStatusHandlers.delete(userId);
    }

    // Mark as pending to avoid parallel subscribe attempts
    this.pendingSubscriptions.add(channelName);
    debugLog('verbose', `🎬 [VIDEO-STATUS] Added ${channelName} to pending`);

    const subscribePromise = (async () => {
      debugLog(
        'verbose',
        `🎬 [VIDEO-STATUS] Starting actual subscription for ${channelName}`,
      );
      // Remove any zombie channel left in Supabase cache **only now** that we
      // know we are creating a fresh one.
      this.cleanupCachedChannel(channelName);
      debugLog(
        'verbose',
        `🎬 [VIDEO-STATUS] Cleaned cached channel for ${channelName}`,
      );

      const channel = this.supabase
        .channel(channelName)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'video_assets',
            filter: `created_by=eq.${userId}`,
          },
          (
            payload: RealtimePostgresChangesPayload<Record<string, unknown>>,
          ) => {
            console.log(
              `🎬 [VIDEO-STATUS] Received postgres change for ${channelName}:`,
              payload.new,
            );
            if (payload.new)
              callback(payload.new as unknown as VideoStatusUpdate);
          },
        )
        .on('system', { event: 'error' }, (error: { reason?: string }) => {
          const reason = error?.reason ?? 'unknown';

          // Filter out success messages that are incorrectly sent to error handler
          const errorData = error as RealtimeErrorEvent;
          if (
            errorData?.status === 'ok' &&
            errorData?.message?.includes('Subscribed')
          ) {
            debugLog(
              'critical',
              `✅ [VIDEO-STATUS] Subscription confirmation for ${channelName}:`,
              error,
            );
            return; // This is actually a success message, not an error
          }

          // Handle "subscribe multiple times" errors gracefully during fast navigation
          const errorMessage =
            (error as RealtimeErrorEvent)?.message ?? JSON.stringify(error);
          if (
            errorMessage.includes('subscribe multiple times') ||
            errorMessage.includes('subscribe can only be called a single time')
          ) {
            console.warn(
              `🎥 [WARNING] Channel already subscribed for ${channelName}, this is expected during fast navigation. Ignoring error.`,
            );
            return;
          }

          console.error(`❌ VideoStatus channel error: ${reason}`);
          debugLog(
            'verbose',
            `🎬 [VIDEO-STATUS] Error details for ${channelName}:`,
            error,
          );

          if (
            reason === 'too_many_channels' ||
            reason === 'too_many_joins' ||
            reason === 'too_many_connections' ||
            reason === 'unknown'
          ) {
            const backoff =
              this.backoffMs.get(channelName) ?? BACKOFF_INITIAL_MS;
            console.warn(`🔄 Retrying ${channelName} in ${backoff}ms`);
            console.log(
              `🎬 [VIDEO-STATUS] Starting retry logic for ${channelName} with backoff ${backoff}ms`,
            );

            // Clean up failed channel before retry
            void this.releaseRef(channelName).catch(console.error);

            setTimeout(() => {
              console.log(
                `🎬 [VIDEO-STATUS] Executing retry for ${channelName}`,
              );
              void this.subscribeToVideoStatus(userId, callback).catch(
                console.error,
              );
            }, backoff);
            this.backoffMs.set(
              channelName,
              Math.min(backoff * 2, BACKOFF_MAX_MS),
            );
            console.log(
              `🎬 [VIDEO-STATUS] Updated backoff for ${channelName} to ${this.backoffMs.get(channelName)}ms`,
            );
          }
        })
        .on('system', { event: 'close' }, () => {
          console.log(`🎬 [VIDEO-STATUS] Channel closed for ${channelName}`);
          this.channels.delete(channelName);
          this.videoStatusHandlers.delete(userId);
          this.channelRefCounts.delete(channelName);
          this.channelPromises.delete(channelName);
          console.log(
            `🎬 [VIDEO-STATUS] Cleaned up all data for ${channelName}`,
          );
        });

      // Expose channel early
      debugLog(
        'verbose',
        `🎬 [VIDEO-STATUS] Setting up channel maps for ${channelName}`,
      );
      this.channels.set(channelName, channel);
      this.channelRefCounts.set(channelName, 1);

      debugLog(
        'verbose',
        `🎬 [VIDEO-STATUS] Calling channel.subscribe() for ${channelName}`,
      );
      await channel.subscribe();
      debugLog(
        'verbose',
        `🎬 [VIDEO-STATUS] Channel.subscribe() completed for ${channelName}. State:`,
        channel.state,
      );

      this.lastJoinAt.set(channelName, Date.now());
      this.backoffMs.set(channelName, BACKOFF_INITIAL_MS);
      this.videoStatusHandlers.set(userId, callback);
      debugLog(
        'critical',
        `🎬 [VIDEO-STATUS] Successfully subscribed to ${channelName}`,
      );
      return channel;
    })();

    this.channelPromises.set(channelName, subscribePromise);
    debugLog('verbose', `🎬 [VIDEO-STATUS] Set promise for ${channelName}`);

    try {
      debugLog(
        'verbose',
        `🎬 [VIDEO-STATUS] Awaiting subscription promise for ${channelName}`,
      );
      return await subscribePromise;
    } finally {
      debugLog(
        'verbose',
        `🎬 [VIDEO-STATUS] Cleaning up subscription attempt for ${channelName}`,
      );
      this.pendingSubscriptions.delete(channelName);
      this.activeSubscriptionAttempts.delete(channelName);
      this.channelPromises.delete(channelName);
      debugLog(
        'verbose',
        `🎬 [VIDEO-STATUS] Cleanup completed for ${channelName}`,
      );
    }
  }

  async unsubscribeFromVideoStatus(userId: string): Promise<void> {
    const channelName = `video_status:${userId}`;
    this.videoStatusHandlers.delete(userId);
    await this.releaseRef(channelName);
  }

  /** Subscribe to post UPDATEs within a tenant (feed freshness) */
  async subscribeToPostUpdates(
    tenantId: string,
    callback: (_update: PostUpdate) => void,
  ): Promise<RealtimeChannel | undefined> {
    const channelName = `posts:${tenantId}`;
    debugLog(
      'critical',
      `📝 [POST-UPDATES] Starting subscription for ${channelName}`,
    );

    const last = this.lastJoinAt.get(channelName) ?? 0;
    debugLog(
      'verbose',
      `📝 [POST-UPDATES] Last join for ${channelName}: ${last}, current: ${Date.now()}, diff: ${Date.now() - last}ms`,
    );
    if (Date.now() - last < MIN_JOIN_INTERVAL_MS) {
      debugLog('verbose', `⚠️ Throttled rejoin attempt for ${channelName}`);
      return this.channels.get(channelName);
    }

    debugLog(
      'verbose',
      `📝 [POST-UPDATES] Checking promises/attempts for ${channelName}`,
    );
    if (this.channelPromises.has(channelName)) {
      debugLog(
        'verbose',
        `📝 [POST-UPDATES] Returning existing promise for ${channelName}`,
      );
      return this.channelPromises.get(channelName);
    }
    if (
      this.pendingSubscriptions.has(channelName) ||
      this.activeSubscriptionAttempts.has(channelName)
    ) {
      debugLog(
        'verbose',
        `📝 [POST-UPDATES] Already pending/attempting ${channelName}, returning existing channel`,
      );
      return this.channels.get(channelName);
    }
    this.activeSubscriptionAttempts.add(channelName);
    debugLog(
      'verbose',
      `📝 [POST-UPDATES] Added ${channelName} to active attempts`,
    );

    const existingDebounce = this.subscriptionDebounce.get(channelName);
    console.log(
      `📝 [POST-UPDATES] Debounce check for ${channelName}:`,
      Boolean(existingDebounce),
    );
    if (existingDebounce) {
      clearTimeout(existingDebounce);
      console.log(
        `📝 [POST-UPDATES] Cleared existing debounce for ${channelName}`,
      );
    }
    if (process.env.NODE_ENV === 'development') {
      console.log(
        `📝 [POST-UPDATES] Starting 100ms debounce for ${channelName}`,
      );
      await new Promise((resolve) => {
        const t = setTimeout(resolve, 100);
        this.subscriptionDebounce.set(channelName, t);
      });
      this.subscriptionDebounce.delete(channelName);
      console.log(`📝 [POST-UPDATES] Debounce completed for ${channelName}`);
    }

    // Re-use existing channel when alive
    const existing = this.channels.get(channelName);
    console.log(
      `📝 [POST-UPDATES] Existing channel for ${channelName}:`,
      existing
        ? {
            state: existing.state,
            isGood: GOOD_STATES.has(String(existing.state) as never),
          }
        : 'none',
    );
    if (existing && GOOD_STATES.has(String(existing.state) as never)) {
      console.log(
        `📝 [POST-UPDATES] Reusing healthy existing channel for ${channelName}`,
      );
      this.postUpdateHandlers.set(tenantId, callback);
      this.addRef(channelName);
      return existing;
    }
    if (existing) {
      console.log(
        `📝 [POST-UPDATES] Cleaning up unhealthy existing channel for ${channelName}`,
      );
      await this.releaseRef(channelName);
      this.postUpdateHandlers.delete(tenantId);
    }

    this.pendingSubscriptions.add(channelName);
    console.log(
      `📝 [POST-UPDATES] Added ${channelName} to pending. Current pending:`,
      Array.from(this.pendingSubscriptions),
    );

    const subscribePromise = (async () => {
      console.log(
        `📝 [POST-UPDATES] Starting actual subscription for ${channelName}`,
      );
      this.cleanupCachedChannel(channelName);
      console.log(
        `📝 [POST-UPDATES] Cleaned cached channel for ${channelName}`,
      );

      const channel = this.supabase
        .channel(channelName)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'posts',
            filter: `tenant_id=eq.${tenantId}`,
          },
          (
            payload: RealtimePostgresChangesPayload<Record<string, unknown>>,
          ) => {
            console.log(
              `📝 [POST-UPDATES] Received postgres change for ${channelName}:`,
              payload.new,
            );
            if (payload.new) callback(payload.new as unknown as PostUpdate);
          },
        )
        .on('system', { event: 'error' }, (error: { reason?: string }) => {
          const reason = error?.reason ?? 'unknown';

          // Filter out success messages that are incorrectly sent to error handler
          const errorData = error as RealtimeErrorEvent;
          if (
            errorData?.status === 'ok' &&
            errorData?.message?.includes('Subscribed')
          ) {
            debugLog(
              'critical',
              `✅ [POST-UPDATES] Subscription confirmation for ${channelName}:`,
              error,
            );
            return; // This is actually a success message, not an error
          }

          // Handle "subscribe multiple times" errors gracefully during fast navigation
          const errorMessage =
            (error as RealtimeErrorEvent)?.message ?? JSON.stringify(error);
          if (
            errorMessage.includes('subscribe multiple times') ||
            errorMessage.includes('subscribe can only be called a single time')
          ) {
            console.warn(
              `📝 [WARNING] Channel already subscribed for ${channelName}, this is expected during fast navigation. Ignoring error.`,
            );
            return;
          }

          console.error(`❌ PostUpdates channel error: ${reason}`);
          debugLog(
            'verbose',
            `📝 [POST-UPDATES] Error details for ${channelName}:`,
            error,
          );
          if (
            reason === 'too_many_channels' ||
            reason === 'too_many_joins' ||
            reason === 'too_many_connections' ||
            reason === 'unknown'
          ) {
            const backoff =
              this.backoffMs.get(channelName) ?? BACKOFF_INITIAL_MS;
            console.warn(`🔄 Retrying ${channelName} in ${backoff}ms`);
            console.log(
              `📝 [POST-UPDATES] Starting retry logic for ${channelName} with backoff ${backoff}ms`,
            );

            // Clean up failed channel before retry
            void this.releaseRef(channelName).catch(console.error);

            setTimeout(() => {
              console.log(
                `📝 [POST-UPDATES] Executing retry for ${channelName}`,
              );
              void this.subscribeToPostUpdates(tenantId, callback).catch(
                console.error,
              );
            }, backoff);
            this.backoffMs.set(
              channelName,
              Math.min(backoff * 2, BACKOFF_MAX_MS),
            );
            console.log(
              `📝 [POST-UPDATES] Updated backoff for ${channelName} to ${this.backoffMs.get(channelName)}ms`,
            );
          }
        })
        .on('system', { event: 'close' }, () => {
          console.log(`📝 [POST-UPDATES] Channel closed for ${channelName}`);
          this.channels.delete(channelName);
          this.postUpdateHandlers.delete(tenantId);
          this.channelRefCounts.delete(channelName);
          console.log(
            `📝 [POST-UPDATES] Cleaned up all data for ${channelName}`,
          );
        });

      console.log(
        `📝 [POST-UPDATES] Setting up channel maps for ${channelName}`,
      );
      this.channels.set(channelName, channel);
      this.channelRefCounts.set(channelName, 1);
      this.lastJoinAt.set(channelName, Date.now());
      this.backoffMs.set(channelName, BACKOFF_INITIAL_MS);
      this.postUpdateHandlers.set(tenantId, callback);
      console.log(
        `📝 [POST-UPDATES] Calling channel.subscribe() for ${channelName}`,
      );
      await channel.subscribe();
      console.log(
        `📝 [POST-UPDATES] Channel.subscribe() completed for ${channelName}. State:`,
        channel.state,
      );

      console.log(
        `📝 [POST-UPDATES] Successfully subscribed to ${channelName}`,
      );
      return channel;
    })();

    this.channelPromises.set(channelName, subscribePromise);
    console.log(`📝 [POST-UPDATES] Set promise for ${channelName}`);

    try {
      console.log(
        `📝 [POST-UPDATES] Awaiting subscription promise for ${channelName}`,
      );
      return await subscribePromise;
    } finally {
      console.log(
        `📝 [POST-UPDATES] Cleaning up subscription attempt for ${channelName}`,
      );
      this.pendingSubscriptions.delete(channelName);
      this.activeSubscriptionAttempts.delete(channelName);
      this.channelPromises.delete(channelName);
      console.log(
        `📝 [POST-UPDATES] Cleanup completed for ${channelName}. Remaining attempts:`,
        Array.from(this.activeSubscriptionAttempts),
      );
    }
  }

  async unsubscribeFromPostUpdates(tenantId: string): Promise<void> {
    const channelName = `posts:${tenantId}`;
    this.postUpdateHandlers.delete(tenantId);
    await this.releaseRef(channelName);
  }
}
// ---------------------------------------------------------------------------
// Singleton export so every module shares the same instance (no duplicate WS)
// ---------------------------------------------------------------------------

export const realtimeService = new RealtimeService();
