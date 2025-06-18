import { z } from 'zod';

// Message schema with null to undefined transformation
export const MessageSchema = z.object({
  id: z.string(),
  conversation_id: z.string().nullable().transform(val => val ?? undefined),
  sender_id: z.string().nullable().transform(val => val ?? undefined),
  content: z.string().nullable().transform(val => val ?? undefined),
  message_type: z.string(),
  metadata: z.record(z.unknown()).nullable().transform(val => val ?? undefined),
  reply_to_id: z.string().nullable().transform(val => val ?? undefined),
  created_at: z.string().nullable().transform(val => val ?? undefined),
  updated_at: z.string().nullable().transform(val => val ?? undefined),
  edited_at: z.string().nullable().transform(val => val ?? undefined),
  deleted_at: z.string().nullable().transform(val => val ?? undefined),
});

export type Message = z.infer<typeof MessageSchema>;

// Nested schemas for related data
export const UserBasicSchema = z.object({
  id: z.string(),
  username: z.string().nullable().transform(val => val ?? undefined),
  full_name: z.string().nullable().transform(val => val ?? undefined),
  avatar_url: z.string().nullable().transform(val => val ?? undefined),
});

export type UserBasic = z.infer<typeof UserBasicSchema>;

// Message with sender info
export const MessageWithSenderSchema = MessageSchema.extend({
  sender: UserBasicSchema.nullable().transform(val => val ?? undefined),
});

export type MessageWithSender = z.infer<typeof MessageWithSenderSchema>;

// Message with reply info
export const MessageWithReplySchema = MessageWithSenderSchema.extend({
  reply_to: z.object({
    id: z.string(),
    content: z.string().nullable().transform(val => val ?? undefined),
    deleted_at: z.string().nullable().transform(val => val ?? undefined),
    sender: UserBasicSchema.nullable().transform(val => val ?? undefined),
  }).nullable().transform(val => val ?? undefined),
});

export type MessageWithReply = z.infer<typeof MessageWithReplySchema>;

// Message reactions
export const MessageReactionSchema = z.object({
  id: z.string(),
  message_id: z.string(),
  user_id: z.string(),
  emoji: z.string(),
  created_at: z.string().nullable().transform(val => val ?? undefined),
});

export type MessageReaction = z.infer<typeof MessageReactionSchema>;

// Reaction count for display
export const ReactionCountSchema = z.object({
  emoji: z.string(),
  count: z.number(),
  user_reacted: z.boolean().optional(),
});

export type ReactionCount = z.infer<typeof ReactionCountSchema>;

// Helper functions
export function parseMessage(data: unknown): Message {
  return MessageSchema.parse(data);
}

export function parseMessageWithSender(data: unknown): MessageWithSender {
  return MessageWithSenderSchema.parse(data);
}

export function parseMessageWithReply(data: unknown): MessageWithReply {
  return MessageWithReplySchema.parse(data);
}

export function parseMessages(data: unknown[]): Message[] {
  return data.map(parseMessage);
}

export function parseMessagesWithSender(data: unknown[]): MessageWithSender[] {
  return data.map(parseMessageWithSender);
}

export function parseMessagesWithReply(data: unknown[]): MessageWithReply[] {
  return data.map(parseMessageWithReply);
} 