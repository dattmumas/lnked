import { RealtimeService } from '@/lib/chat/realtime-service';

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
  private service = new RealtimeService();

  async subscribe(conversationId: string, handlers: Handlers): Promise<Unsub> {
    const channel = await this.service.subscribeToConversation(conversationId, handlers);
    if (!channel) {
      return () => {};
    }
    return () => {
      this.service.unsubscribeFromConversation(conversationId);
    };
  }

  async broadcastTyping(conversationId: string, isTyping: boolean): Promise<void> {
    if (isTyping) {
      await this.service.broadcastTypingStart(conversationId);
    } else {
      await this.service.broadcastTypingStop(conversationId);
    }
  }
}

// Placeholder for future Ably adapter
 
const adapters: Record<string, RealTimeAdapter> = {
  supabase: new SupabaseAdapter(),
};

export function selectAdapter(name: 'supabase' | 'ably' = 'supabase'): RealTimeAdapter {
  const adapter = adapters[name];
  if (!adapter) {
    throw new Error(`Real-time adapter '${name}' not available`);
  }
  return adapter;
} 