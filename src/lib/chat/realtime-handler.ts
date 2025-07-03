import { RealtimeChannel, SupabaseClient } from '@supabase/supabase-js';

import { createSupabaseBrowserClient } from '@/lib/supabase/browser';

import { ChatApiClient } from './api-client';

interface MessageEventData {
  action: 'created' | 'updated' | 'deleted';
  message?: Record<string, unknown>;
  messageId?: string;
  changes?: Record<string, unknown>;
}

interface ReadEventData {
  userId: string;
  messageId: string;
  readAt: string;
}

interface ReactionEventData {
  action: 'added' | 'removed';
  messageId: string;
  userId: string;
  reaction: string;
}

interface TypingEventData {
  typingUsers: Array<{
    userId: string;
    username: string;
  }>;
}

interface RealtimeEvent {
  type: 'message' | 'read' | 'typing' | 'reaction' | 'participant';
  conversationId: string;
  data: MessageEventData | ReadEventData | ReactionEventData | TypingEventData;
}

interface ConnectionState {
  userId: string;
  conversationId?: string;
  channel?: RealtimeChannel;
}

export class RealtimeHandler {
  private supabase: SupabaseClient;
  private apiClient: ChatApiClient;
  private connections = new Map<string, ConnectionState>();
  private eventBuffer = new Map<string, RealtimeEvent[]>();
  private flushInterval?: NodeJS.Timeout;

  constructor() {
    this.supabase = createSupabaseBrowserClient();
    this.apiClient = new ChatApiClient();

    // Batch events every 100ms to reduce client updates
    const BATCH_INTERVAL_MS = 100;
    this.flushInterval = setInterval(() => {
      this.flushEventBuffer();
    }, BATCH_INTERVAL_MS);
  }

  // Connect a user to real-time updates
  async connect(userId: string, conversationId?: string): Promise<void> {
    const existingConnection = this.connections.get(userId);

    if (existingConnection?.channel) {
      await this.supabase.removeChannel(existingConnection.channel);
    }

    const channel = this.supabase
      .channel(`chat:${userId}`)
      .on(
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-explicit-any
        'postgres_changes' as any,
        {
          event: '*',
          schema: 'public',
          table: 'messages',
          filter:
            conversationId !== undefined && conversationId !== null
              ? `conversation_id=eq.${conversationId}`
              : undefined,
        },
        (payload: unknown) => {
          this.handleMessageChange(userId, payload as Record<string, unknown>);
        },
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'message_read_receipts',
        },
        (payload) => {
          this.handleReadReceiptChange(
            userId,
            payload as Record<string, unknown>,
          );
        },
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'message_reactions',
        },
        (payload) => {
          this.handleReactionChange(userId, payload as Record<string, unknown>);
        },
      )
      .on('presence', { event: 'sync' }, () => {
        this.handlePresenceSync(userId, channel);
      })
      .subscribe();

    this.connections.set(userId, {
      userId,
      ...(conversationId ? { conversationId } : {}),
      channel,
    });
  }

  // Disconnect a user
  async disconnect(userId: string): Promise<void> {
    const connection = this.connections.get(userId);
    if (connection?.channel) {
      await this.supabase.removeChannel(connection.channel);
    }
    this.connections.delete(userId);
    this.eventBuffer.delete(userId);
  }

  // Handle message changes with intelligent diffing
  private handleMessageChange(
    userId: string,
    payload: Record<string, unknown>,
  ): void {
    const eventType = payload['eventType'] as string;
    const newRecord = payload['new'] as Record<string, unknown> | null;
    const oldRecord = payload['old'] as Record<string, unknown> | null;

    let event: RealtimeEvent;

    switch (eventType) {
      case 'INSERT': {
        if (!newRecord) return;
        const conversationId = newRecord['conversation_id'] as string;
        if (!conversationId) return;

        event = {
          type: 'message',
          conversationId,
          data: {
            action: 'created',
            message: newRecord,
          } as MessageEventData,
        };
        break;
      }

      case 'UPDATE': {
        if (!newRecord || !oldRecord) return;
        const conversationId = newRecord['conversation_id'] as string;
        const messageId = newRecord['id'] as string;
        if (!conversationId || !messageId) return;

        // Only send relevant fields that changed
        const changedFields = this.getChangedFields(oldRecord, newRecord);
        event = {
          type: 'message',
          conversationId,
          data: {
            action: 'updated',
            messageId,
            changes: changedFields,
          } as MessageEventData,
        };
        break;
      }

      case 'DELETE': {
        if (!oldRecord) return;
        const conversationId = oldRecord['conversation_id'] as string;
        const messageId = oldRecord['id'] as string;
        if (!conversationId || !messageId) return;

        event = {
          type: 'message',
          conversationId,
          data: {
            action: 'deleted',
            messageId,
          } as MessageEventData,
        };
        break;
      }

      default:
        return;
    }

    this.bufferEvent(userId, event);
  }

  // Handle read receipt changes
  private handleReadReceiptChange(
    userId: string,
    payload: Record<string, unknown>,
  ): void {
    const newRecord = payload['new'] as Record<string, unknown> | null;
    if (!newRecord) return;

    const conversationId = newRecord['conversation_id'] as string;
    const messageUserId = newRecord['user_id'] as string;
    const messageId = newRecord['message_id'] as string;
    const readAt = newRecord['read_at'] as string;

    if (!conversationId || !messageUserId || !messageId || !readAt) return;

    const event: RealtimeEvent = {
      type: 'read',
      conversationId,
      data: {
        userId: messageUserId,
        messageId,
        readAt,
      } as ReadEventData,
    };

    this.bufferEvent(userId, event);
  }

  // Handle reaction changes
  private handleReactionChange(
    userId: string,
    payload: Record<string, unknown>,
  ): void {
    const eventType = payload['eventType'] as string;
    const newRecord = payload['new'] as Record<string, unknown> | null;
    const oldRecord = payload['old'] as Record<string, unknown> | null;

    const record = newRecord ?? oldRecord;
    if (!record) return;

    const conversationId = record['conversation_id'] as string;
    const messageId = record['message_id'] as string;
    const reactionUserId = record['user_id'] as string;
    const reactionType = record['reaction_type'] as string;

    if (!conversationId || !messageId || !reactionUserId || !reactionType)
      return;

    const event: RealtimeEvent = {
      type: 'reaction',
      conversationId,
      data: {
        action: eventType === 'DELETE' ? 'removed' : 'added',
        messageId,
        userId: reactionUserId,
        reaction: reactionType,
      } as ReactionEventData,
    };

    this.bufferEvent(userId, event);
  }

  // Handle presence sync for typing indicators
  private handlePresenceSync(userId: string, channel: RealtimeChannel): void {
    const presence = channel.presenceState();

    // The presence state returned by Supabase can be `unknown`. To satisfy the
    // `@typescript-eslint/no-unsafe-argument` rule we cast the flattened
    // presence array to a safer structure before further transformations.
    const presenceStates = Object.values(presence).flat() as Array<
      Record<string, unknown>
    >;

    const typingUsers = presenceStates
      .filter((p) => Boolean(p['isTyping']))
      .map((p) => ({
        userId: String(p['userId']),
        username: String(p['username']),
      }))
      .filter((user) => Boolean(user.userId) && Boolean(user.username));

    const connection = this.connections.get(userId);
    if (
      connection?.conversationId !== undefined &&
      connection?.conversationId !== null
    ) {
      const event: RealtimeEvent = {
        type: 'typing',
        conversationId: connection.conversationId,
        data: { typingUsers } as TypingEventData,
      };

      this.bufferEvent(userId, event);
    }
  }

  // Buffer events for batching
  private bufferEvent(userId: string, event: RealtimeEvent): void {
    const buffer = this.eventBuffer.get(userId) || [];
    buffer.push(event);
    this.eventBuffer.set(userId, buffer);
  }

  // Flush event buffer to clients
  private flushEventBuffer(): void {
    for (const [userId, events] of this.eventBuffer.entries()) {
      if (events.length === 0) continue;

      const connection = this.connections.get(userId);
      if (!connection?.channel) continue;

      // Group events by type and conversation
      const groupedEvents = this.groupEvents(events);

      // DEV: Log every batch_update payload to trace component mounts
      console.log(
        '[RealtimeHandler] Sending batch_update payload',
        groupedEvents,
      );

      // Send batched update to client
      void connection.channel.send({
        type: 'broadcast',
        event: 'batch_update',
        payload: groupedEvents,
      });

      // Clear buffer
      this.eventBuffer.set(userId, []);
    }
  }

  // Group events for efficient processing
  private groupEvents(events: RealtimeEvent[]): {
    messages: MessageEventData[];
    reads: ReadEventData[];
    reactions: ReactionEventData[];
    typing: TypingEventData | null;
  } {
    const grouped = {
      messages: [] as MessageEventData[],
      reads: [] as ReadEventData[],
      reactions: [] as ReactionEventData[],
      typing: null as TypingEventData | null,
    };

    for (const event of events) {
      switch (event.type) {
        case 'message':
          grouped.messages.push(event.data as MessageEventData);
          break;
        case 'read':
          grouped.reads.push(event.data as ReadEventData);
          break;
        case 'reaction':
          grouped.reactions.push(event.data as ReactionEventData);
          break;
        case 'typing':
          // Only keep the latest typing state
          grouped.typing = event.data as TypingEventData;
          break;
      }
    }

    return grouped;
  }

  // Get changed fields between two records
  private getChangedFields(
    oldRecord: Record<string, unknown>,
    newRecord: Record<string, unknown>,
  ): Record<string, unknown> {
    const changes: Record<string, unknown> = {};

    for (const key in newRecord) {
      if (oldRecord[key] !== newRecord[key]) {
        changes[key] = newRecord[key];
      }
    }

    return changes;
  }

  // Send typing indicator
  async sendTypingIndicator(
    userId: string,
    conversationId: string,
    isTyping: boolean,
  ): Promise<void> {
    const connection = this.connections.get(userId);
    if (!connection?.channel) return;

    await connection.channel.track({
      userId,
      isTyping,
      timestamp: new Date().toISOString(),
    });
  }

  // Cleanup
  destroy(): void {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
    }

    for (const [userId] of this.connections) {
      void this.disconnect(userId).catch(console.error);
    }
  }
}
