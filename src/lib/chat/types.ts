// Temporary types for chat functionality
import type { Database } from '@/lib/database.types';

// Re-export the exact database types
export type Conversation = Database['public']['Tables']['conversations']['Row'];
export type ConversationInsert = Database['public']['Tables']['conversations']['Insert'];
export type ConversationUpdate = Database['public']['Tables']['conversations']['Update'];

export type ConversationParticipant = Database['public']['Tables']['conversation_participants']['Row'];
export type ConversationParticipantInsert = Database['public']['Tables']['conversation_participants']['Insert'];
export type ConversationParticipantUpdate = Database['public']['Tables']['conversation_participants']['Update'];

export type Message = Database['public']['Tables']['messages']['Row'];
export type MessageInsert = Database['public']['Tables']['messages']['Insert'];
export type MessageUpdate = Database['public']['Tables']['messages']['Update'];

export type MessageReaction = Database['public']['Tables']['message_reactions']['Row'];
export type MessageReactionInsert = Database['public']['Tables']['message_reactions']['Insert'];

export type MessageReadReceipt = Database['public']['Tables']['message_read_receipts']['Row'];
export type MessageReadReceiptInsert = Database['public']['Tables']['message_read_receipts']['Insert'];

// Extended types with joined data
export type MessageWithSender = Message & {
  sender: {
    id: string;
    full_name: string | null;
    username: string | null;
    avatar_url: string | null;
    email?: string | null;
  } | null;
  reply_to?: MessageWithSender | null;
  reactions?: MessageReaction[];
};

export type ConversationWithParticipants = Conversation & {
  participants: (ConversationParticipant & {
    user: {
      id: string;
      full_name: string | null;
      username: string | null;
      avatar_url: string | null;
      email?: string | null;
    } | null;
  })[];
  last_message?: MessageWithSender | null;
  unread_count?: number;
  created_by_user?: {
    id: string;
    full_name: string | null;
    username: string | null;
    avatar_url: string | null;
  } | null;
};

// Real-time payload types following Supabase's patterns
export type RealtimeMessage = {
  event: 'INSERT' | 'UPDATE' | 'DELETE';
  schema: string;
  table: string;
  new?: Message;
  old?: Message;
};

export type BroadcastMessage = {
  type: 'broadcast';
  event: string;
  payload: {
    message?: MessageWithSender;
    conversation_id?: string;
    user_id?: string;
    action?: 'typing_start' | 'typing_stop' | 'message_read';
    timestamp?: number;
    [key: string]: unknown;
  };
};

// Chat UI state types
export type TypingIndicator = {
  user_id: string;
  username?: string | null;
  full_name?: string | null;
  conversation_id: string;
  timestamp: number;
};

export interface ChatState {
  /** Conversations the user can see */
  conversations: ConversationWithParticipants[];

  /** ID of the conversation currently open (undefined → none selected) */
  activeConversation: string | undefined;

  /** Cached messages keyed by conversation ID */
  messages: Record<string, MessageWithSender[]>;

  /** Typing indicators keyed by conversation ID */
  typing: Record<string, TypingIndicator[]>;

  /** Global loading spinner */
  isLoading: boolean;

  /** Last error message shown in UI (undefined → no error) */
  error: string | undefined;
}