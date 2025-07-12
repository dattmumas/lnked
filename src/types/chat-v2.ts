import { Database } from '@/lib/database.types';

// Extract types from the database schema
export type DbConversation =
  Database['public']['Tables']['conversations']['Row'];
export type DbMessage = Database['public']['Tables']['messages']['Row'];
export type DbUser = Database['public']['Tables']['users']['Row'];
export type DbTenant = Database['public']['Tables']['tenants']['Row'];

type DbConversationParticipant =
  Database['public']['Tables']['conversation_participants']['Row'] & {
    user: Pick<DbUser, 'id' | 'username' | 'full_name' | 'avatar_url'>;
  };

// Enhanced types for the chat interface
export interface ChatConversation extends DbConversation {
  participant_count?: number;
  last_message?: ChatMessage | null;
  unread_count?: number;
  participants?: DbConversationParticipant[];
  /**
   * Avatar URL to display in UI, typically the other participant's avatar in a direct message.
   */
  display_avatar_url?: string | null;
}

export interface ChatMessage extends DbMessage {
  sender: Pick<DbUser, 'id' | 'username' | 'full_name' | 'avatar_url'>;
  reply_to?: ChatMessage | null;
  optimistic_id?: string; // For optimistic updates
  sending?: boolean;
  failed?: boolean;
}

export interface ChatUser
  extends Pick<DbUser, 'id' | 'username' | 'full_name' | 'avatar_url'> {
  online?: boolean;
  last_seen?: string;
}

// Realtime presence state
export interface PresenceState {
  user_id: string;
  online_at: string;
  typing?: boolean;
}

// Typing indicator state
export interface TypingState {
  [userId: string]: {
    user: ChatUser;
    timestamp: number;
  };
}

// Message composer state
export interface ComposerState {
  content: string;
  reply_to?: ChatMessage | null;
  attachments: AttachmentFile[];
}

export interface AttachmentFile {
  id: string;
  file: File;
  preview?: string;
  uploading?: boolean;
  uploaded?: boolean;
  url?: string;
  error?: string;
}

// API response types
export interface ConversationsResponse {
  conversations: ChatConversation[];
  has_more: boolean;
}

export interface MessagesResponse {
  messages: ChatMessage[];
  has_more: boolean;
  next_cursor?: string | undefined;
}

// Realtime event payloads
export interface NewMessageBroadcast {
  type: 'new_message';
  message: ChatMessage;
}

export interface TypingBroadcast {
  type: 'typing_start' | 'typing_stop';
  user_id: string;
  conversation_id: string;
}

export type RealtimeBroadcast = NewMessageBroadcast | TypingBroadcast;

// Define proper types for presence callbacks
export interface PresenceStateRecord {
  [userId: string]: PresenceState;
}

export interface PresenceEntry {
  presence_ref: string;
  user_id: string;
  online_at: string;
  typing?: boolean;
}

export interface RealtimeServiceCallbacks {
  onNewMessage?: (message: ChatMessage) => void;
  onTypingStart?: (userId: string) => void;
  onTypingStop?: (userId: string) => void;
  onPresenceSync?: (state: PresenceStateRecord) => void;
  onPresenceJoin?: (key: string, newPresences: PresenceEntry[]) => void;
  onPresenceLeave?: (key: string, leftPresences: PresenceEntry[]) => void;
  onError?: (error: Error) => void;
  onChannelStateChange?: (state: string) => void;
}
