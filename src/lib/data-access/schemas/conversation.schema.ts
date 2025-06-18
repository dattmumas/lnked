import { z } from 'zod';

// Conversation schema with null to undefined transformation
export const ConversationSchema = z.object({
  id: z.string(),
  type: z.string(),
  title: z.string().nullable().transform(val => val ?? undefined),
  description: z.string().nullable().transform(val => val ?? undefined),
  created_by: z.string().nullable().transform(val => val ?? undefined),
  is_private: z.boolean().nullable().transform(val => val ?? undefined),
  archived: z.boolean().nullable().transform(val => val ?? undefined),
  last_message_at: z.string().nullable().transform(val => val ?? undefined),
  created_at: z.string().nullable().transform(val => val ?? undefined),
  updated_at: z.string().nullable().transform(val => val ?? undefined),
});

export type Conversation = z.infer<typeof ConversationSchema>;

// Conversation participant schema
export const ConversationParticipantSchema = z.object({
  id: z.string(),
  conversation_id: z.string().nullable().transform(val => val ?? undefined),
  user_id: z.string().nullable().transform(val => val ?? undefined),
  role: z.string().nullable().transform(val => val ?? undefined),
  joined_at: z.string().nullable().transform(val => val ?? undefined),
  last_read_at: z.string().nullable().transform(val => val ?? undefined),
  is_muted: z.boolean().nullable().transform(val => val ?? undefined),
  is_pinned: z.boolean().nullable().transform(val => val ?? undefined),
});

export type ConversationParticipant = z.infer<typeof ConversationParticipantSchema>;

// Message schema
export const MessageSchema = z.object({
  id: z.string(),
  conversation_id: z.string().nullable().transform(val => val ?? undefined),
  sender_id: z.string().nullable().transform(val => val ?? undefined),
  content: z.string(),
  message_type: z.string().nullable().transform(val => val ?? undefined),
  metadata: z.any().nullable().transform(val => val ?? undefined),
  reply_to_id: z.string().nullable().transform(val => val ?? undefined),
  created_at: z.string().nullable().transform(val => val ?? undefined),
  updated_at: z.string().nullable().transform(val => val ?? undefined),
  edited_at: z.string().nullable().transform(val => val ?? undefined),
  deleted_at: z.string().nullable().transform(val => val ?? undefined),
});

export type Message = z.infer<typeof MessageSchema>;

// Message with sender info
export const MessageWithSenderSchema = MessageSchema.extend({
  sender: z.object({
    id: z.string(),
    username: z.string().nullable().transform(val => val ?? undefined),
    full_name: z.string().nullable().transform(val => val ?? undefined),
    avatar_url: z.string().nullable().transform(val => val ?? undefined),
  }).nullable().transform(val => val ?? undefined),
});

export type MessageWithSender = z.infer<typeof MessageWithSenderSchema>;

// Message reaction schema
export const MessageReactionSchema = z.object({
  id: z.string(),
  message_id: z.string().nullable().transform(val => val ?? undefined),
  user_id: z.string().nullable().transform(val => val ?? undefined),
  emoji: z.string(),
  created_at: z.string().nullable().transform(val => val ?? undefined),
});

export type MessageReaction = z.infer<typeof MessageReactionSchema>;

// Insert/Update schemas
export const ConversationInsertSchema = z.object({
  type: z.string(),
  title: z.string().optional().transform(val => val ?? null),
  description: z.string().optional().transform(val => val ?? null),
  created_by: z.string().optional().transform(val => val ?? null),
  is_private: z.boolean().optional().transform(val => val ?? null),
  archived: z.boolean().optional().transform(val => val ?? null),
});

export type ConversationInsert = z.input<typeof ConversationInsertSchema>;

export const MessageInsertSchema = z.object({
  conversation_id: z.string().optional().transform(val => val ?? null),
  sender_id: z.string().optional().transform(val => val ?? null),
  content: z.string(),
  message_type: z.string().optional().transform(val => val ?? null),
  metadata: z.any().optional().transform(val => val ?? null),
  reply_to_id: z.string().optional().transform(val => val ?? null),
});

export type MessageInsert = z.input<typeof MessageInsertSchema>;

export const ParticipantInsertSchema = z.object({
  conversation_id: z.string(),
  user_id: z.string(),
  role: z.string().optional().transform(val => val ?? null),
});

export type ParticipantInsert = z.input<typeof ParticipantInsertSchema>;

// Helper functions
export function parseConversation(data: unknown): Conversation {
  return ConversationSchema.parse(data);
}

export function parseConversations(data: unknown[]): Conversation[] {
  return data.map(parseConversation);
}

export function parseMessage(data: unknown): Message {
  return MessageSchema.parse(data);
}

export function parseMessages(data: unknown[]): Message[] {
  return data.map(parseMessage);
}

export function parseMessageWithSender(data: unknown): MessageWithSender {
  return MessageWithSenderSchema.parse(data);
}

export function parseMessagesWithSender(data: unknown[]): MessageWithSender[] {
  return data.map(parseMessageWithSender);
} 