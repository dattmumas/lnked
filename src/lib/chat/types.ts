// Temporary types for chat functionality
import type { Json } from '@/lib/database.types';

export type Conversation = {
  id: string;
  title: string | null;
  type: 'direct' | 'group' | 'channel';
  description: string | null;
  is_private: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string | null;
  last_message_at: string;
  archived: boolean;
};

export type ConversationInsert = Omit<Conversation, 'id' | 'created_at' | 'updated_at'>;
export type ConversationUpdate = Partial<ConversationInsert>;

export type ConversationParticipant = {
  id: string;
  conversation_id: string;
  user_id: string;
  role: 'admin' | 'moderator' | 'member';
  joined_at: string;
  last_read_at: string;
  is_muted: boolean;
  is_pinned: boolean;
};

export type ConversationParticipantInsert = Omit<ConversationParticipant, 'id' | 'joined_at'>;
export type ConversationParticipantUpdate = Partial<ConversationParticipantInsert>;

export type Message = {
  id: string;
  conversation_id: string;
  sender_id: string | null;
  content: string;
  message_type: 'text' | 'image' | 'file' | 'system';
  metadata: Json;
  reply_to_id: string | null;
  edited_at: string | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
};

export type MessageInsert = Omit<Message, 'id' | 'created_at' | 'updated_at'>;
export type MessageUpdate = Partial<MessageInsert>;

export type MessageReaction = {
  id: string;
  message_id: string;
  user_id: string;
  emoji: string;
  created_at: string;
};

export type MessageReactionInsert = Omit<MessageReaction, 'id' | 'created_at'>;

export type MessageReadReceipt = {
  id: string;
  message_id: string;
  user_id: string;
  read_at: string;
};

export type MessageReadReceiptInsert = Omit<MessageReadReceipt, 'id'>;

// Extended types with joined data
export type MessageWithSender = Message & {
  sender: {
    id: string;
    full_name: string | null;
    username: string | null;
    avatar_url: string | null;
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
    };
  })[];
  last_message?: MessageWithSender | null;
  unread_count?: number;
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
  conversation_id: string;
  timestamp: number;
};

export type ChatState = {
  conversations: ConversationWithParticipants[];
  activeConversation: string | null;
  messages: Record<string, MessageWithSender[]>;
  typing: Record<string, TypingIndicator[]>;
  isLoading: boolean;
  error: string | null;
}; 