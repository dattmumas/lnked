import { realtimeService } from '@/lib/chat/realtime-service';

export type Handlers = {
  onMessage?: (_msg: unknown) => void;
  onTyping?: (_typing: unknown) => void;
  onMessageUpdate?: (_msg: unknown) => void;
  onMessageDelete?: (_id: string) => void;
  onUserJoin?: (_id: string) => void;
  onUserLeave?: (_id: string) => void;
};

export type Unsub = () => void | Promise<void>;

export interface RealTimeAdapter {
  subscribe(conversationId: string, handlers: Handlers): Promise<Unsub>;
  broadcastTyping(conversationId: string, isTyping: boolean): Promise<void> | void;
}

class SupabaseAdapter implements RealTimeAdapter {

  async subscribe(conversationId: string, handlers: Handlers): Promise<Unsub> {
    const channel = await realtimeService.subscribeToConversation(conversationId, handlers);
    if (!channel) {
      return () => {};
    }
    return () => {
      realtimeService.unsubscribeFromConversation(conversationId);
    };
  }

  async broadcastTyping(conversationId: string, isTyping: boolean): Promise<void> {
    if (isTyping) {
      await realtimeService.broadcastTypingStart(conversationId);
    } else {
      await realtimeService.broadcastTypingStop(conversationId);
    }
  }
}

const supabaseAdapterInstance = new SupabaseAdapter();

// Placeholder for future Ably adapter

const adapters: Record<string, RealTimeAdapter> = {
  supabase: supabaseAdapterInstance,
};

export function selectAdapter(name: 'supabase' | 'ably' = 'supabase'): RealTimeAdapter {
  const adapter = adapters[name];
  if (adapter === undefined) {
    throw new Error(`Real-time adapter '${name}' not available`);
  }
  return adapter;
}