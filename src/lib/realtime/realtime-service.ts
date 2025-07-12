'use client';

import { Database } from '@/lib/database.types';
import supabase from '@/lib/supabase/browser';

import type {
  User,
  RealtimeChannel,
  RealtimePostgresChangesPayload,
} from '@supabase/supabase-js';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

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
    // console.log(message, ...args);
  } else if (level === 'verbose' && DEBUG_LOGGING.ENABLED) {
    // console.log(message, ...args);
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
 * Real-time service for video status updates and post updates only
 * Chat functionality has been moved to the new chat-v2 system
 */

interface VideoStatusUpdate {
  id: string;
  status: string;
  duration?: number;
  aspect_ratio?: string;
  mux_playback_id?: string;
  updated_at: string;
}

type PostUpdate = Pick<
  Database['public']['Tables']['posts']['Row'],
  'id' | 'title' | 'content' | 'status' | 'updated_at'
>;

interface RealtimeErrorEvent {
  reason?: string;
  status?: string;
  message?: string;
}

export class RealtimeService {
  private supabase = supabase;
  private channels: Map<string, RealtimeChannel> = new Map();
  private videoStatusHandlers: Map<
    string,
    (_update: VideoStatusUpdate) => void
  > = new Map();
  private postUpdateHandlers: Map<string, (_update: PostUpdate) => void> =
    new Map();
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
   * `supabase.channel(topic)` return a brand-new instance.
   */
  private cleanupCachedChannel(topic: string): void {
    console.log(`🧹 [REALTIME-SERVICE] Cleaning up cached channel: ${topic}`);

    // Remove from our internal tracking
    this.channels.delete(topic);
    this.channelRefCounts.delete(topic);

    // Find and remove any cached channels with this topic from Supabase's internal cache
    const allChannels = this.supabase.getChannels();
    const channelsToRemove = allChannels.filter(
      (c) => c.topic === topic || c.topic.includes(topic),
    );

    console.log(
      `🔍 [REALTIME-SERVICE] Found ${channelsToRemove.length} cached channels to remove for topic: ${topic}`,
    );

    channelsToRemove.forEach((cachedChannel, index) => {
      try {
        console.log(
          `🗑️ [REALTIME-SERVICE] Removing cached channel ${index + 1}/${channelsToRemove.length}: ${cachedChannel.topic}`,
        );
        // Force unsubscribe and remove the channel
        if (String(cachedChannel.state) !== 'closed') {
          cachedChannel.unsubscribe();
        }
        void this.supabase.removeChannel(cachedChannel);
      } catch (error) {
        console.warn(
          `⚠️ [REALTIME-SERVICE] Failed to remove cached channel ${cachedChannel.topic}:`,
          error,
        );
      }
    });

    // In development, also clean up any stale channels with similar topic patterns
    if (process.env.NODE_ENV === 'development') {
      const topicPrefix = topic.split(':')[0];
      const staleChannels = allChannels.filter(
        (c) =>
          topicPrefix &&
          c.topic.includes(topicPrefix) &&
          (String(c.state) === 'closed' || String(c.state) === 'errored'),
      );

      console.log(
        `🧹 [REALTIME-SERVICE] Found ${staleChannels.length} stale channels to clean up`,
      );
      staleChannels.forEach((staleChannel) => {
        try {
          void this.supabase.removeChannel(staleChannel);
        } catch {
          /* Swallow errors */
        }
      });
    }

    console.log(
      `✅ [REALTIME-SERVICE] Channel cleanup completed for: ${topic}`,
    );
  }

  constructor() {
    this.setupAuthRefreshHandler();
  }

  /**
   * Set up auth state change handler to refresh channels on token refresh
   */
  private setupAuthRefreshHandler(): void {
    this.supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT') {
        this.unsubscribeFromAll();
      } else if (event === 'TOKEN_REFRESHED') {
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
      const activeChannels = Array.from(this.channels.keys());
      const videoHandlers = new Map<
        string,
        (_update: VideoStatusUpdate) => void
      >();
      const postHandlers = new Map<string, (_update: PostUpdate) => void>();

      // Store current handlers
      for (const [userId, handler] of this.videoStatusHandlers) {
        videoHandlers.set(userId, handler);
      }
      for (const [tenantId, handler] of this.postUpdateHandlers) {
        postHandlers.set(tenantId, handler);
      }

      // Unsubscribe from all
      this.unsubscribeFromAll();

      // Wait a bit for cleanup
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Re-subscribe with fresh tokens
      for (const [userId, handler] of videoHandlers) {
        await this.subscribeToVideoStatus(userId, handler);
      }
      for (const [tenantId, handler] of postHandlers) {
        await this.subscribeToPostUpdates(tenantId, handler);
      }
    } finally {
      this.authRefreshInProgress = false;
    }
  }

  /**
   * Unsubscribe from all channels
   */
  unsubscribeFromAll(): void {
    this.channels.forEach((channel) => {
      try {
        if (String(channel.state) !== CHANNEL_STATES.CLOSED_LOWERCASE) {
          void channel.unsubscribe();
        }
      } catch (error) {
        console.warn('Failed to unsubscribe from channel:', error);
      }
    });
    this.channels.clear();
    this.channelRefCounts.clear();
    this.videoStatusHandlers.clear();
    this.postUpdateHandlers.clear();
  }

  private async getCurrentUser(): Promise<User | null> {
    const {
      data: { session },
    } = await this.supabase.auth.getSession();
    return session?.user ?? null;
  }

  // ---------------------------------------------------------------------------
  // Video status update channels
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
      // Remove any zombie channel left in Supabase cache
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

            // Clean up failed channel before retry
            void this.releaseRef(channelName).catch(console.error);

            setTimeout(() => {
              void this.subscribeToVideoStatus(userId, callback).catch(
                console.error,
              );
            }, backoff);
            this.backoffMs.set(
              channelName,
              Math.min(backoff * 2, BACKOFF_MAX_MS),
            );
          }
        })
        .on('system', { event: 'close' }, () => {
          this.channels.delete(channelName);
          this.videoStatusHandlers.delete(userId);
          this.channelRefCounts.delete(channelName);
          this.channelPromises.delete(channelName);
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

    const existingDebounce = this.subscriptionDebounce.get(channelName);
    if (existingDebounce) {
      clearTimeout(existingDebounce);
    }

    // Re-use existing channel when alive
    const existing = this.channels.get(channelName);
    if (existing && GOOD_STATES.has(String(existing.state) as never)) {
      this.postUpdateHandlers.set(tenantId, callback);
      this.addRef(channelName);
      return existing;
    }
    if (existing) {
      await this.releaseRef(channelName);
      this.postUpdateHandlers.delete(tenantId);
    }

    this.pendingSubscriptions.add(channelName);

    const subscribePromise = (async () => {
      this.cleanupCachedChannel(channelName);

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
            return; // This is actually a success message, not an error
          }

          // Handle "subscribe multiple times" errors gracefully during fast navigation
          const errorMessage =
            (error as RealtimeErrorEvent)?.message ?? JSON.stringify(error);
          if (
            errorMessage.includes('subscribe multiple times') ||
            errorMessage.includes('subscribe can only be called a single time')
          ) {
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

            // Clean up failed channel before retry
            void this.releaseRef(channelName).catch(console.error);

            setTimeout(() => {
              void this.subscribeToPostUpdates(tenantId, callback).catch(
                console.error,
              );
            }, backoff);
            this.backoffMs.set(
              channelName,
              Math.min(backoff * 2, BACKOFF_MAX_MS),
            );
          }
        })
        .on('system', { event: 'close' }, () => {
          this.channels.delete(channelName);
          this.postUpdateHandlers.delete(tenantId);
          this.channelRefCounts.delete(channelName);
        });

      this.channels.set(channelName, channel);
      this.channelRefCounts.set(channelName, 1);
      this.lastJoinAt.set(channelName, Date.now());
      this.backoffMs.set(channelName, BACKOFF_INITIAL_MS);
      this.postUpdateHandlers.set(tenantId, callback);
      await channel.subscribe();
      return channel;
    })();

    this.channelPromises.set(channelName, subscribePromise);

    try {
      return await subscribePromise;
    } finally {
      this.pendingSubscriptions.delete(channelName);
      this.activeSubscriptionAttempts.delete(channelName);
      this.channelPromises.delete(channelName);
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
