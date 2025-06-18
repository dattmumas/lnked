import { z } from 'zod';

// Comment reaction types
export const CommentReactionTypeEnum = z.enum(['like', 'heart', 'laugh', 'angry', 'sad', 'wow', 'dislike']);

// Comment schema with null to undefined transformation
export const CommentSchema = z.object({
  id: z.string(),
  entity_type: z.string(),
  entity_id: z.string(),
  author_id: z.string(),
  content: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
  deleted_at: z.string().nullable().transform(val => val ?? undefined),
  parent_id: z.string().nullable().transform(val => val ?? undefined),
  is_pinned: z.boolean().nullable().transform(val => val ?? undefined),
  metadata: z.any().nullable().transform(val => val ?? undefined),
});

export type Comment = z.infer<typeof CommentSchema>;

// Comment with author info
export const CommentWithAuthorSchema = CommentSchema.extend({
  author: z.object({
    id: z.string(),
    username: z.string().nullable().transform(val => val ?? undefined),
    full_name: z.string().nullable().transform(val => val ?? undefined),
    avatar_url: z.string().nullable().transform(val => val ?? undefined),
  }).optional(),
  reaction_counts: z.array(z.object({
    reaction_type: CommentReactionTypeEnum,
    count: z.number(),
  })).optional(),
  has_user_reacted: z.record(z.boolean()).optional(),
});

export type CommentWithAuthor = z.infer<typeof CommentWithAuthorSchema>;

// Comment reaction schema
export const CommentReactionSchema = z.object({
  id: z.string(),
  comment_id: z.string(),
  user_id: z.string(),
  reaction_type: CommentReactionTypeEnum,
  created_at: z.string(),
});

export type CommentReaction = z.infer<typeof CommentReactionSchema>;

// Insert/Update schemas
export const CommentInsertSchema = z.object({
  entity_type: z.string(),
  entity_id: z.string(),
  author_id: z.string(),
  content: z.string(),
  parent_id: z.string().optional().transform(val => val ?? null),
  is_pinned: z.boolean().optional().transform(val => val ?? null),
  metadata: z.any().optional().transform(val => val ?? null),
});

export type CommentInsert = z.input<typeof CommentInsertSchema>;

// Helper functions
export function parseComment(data: unknown): Comment {
  return CommentSchema.parse(data);
}

export function parseComments(data: unknown[]): Comment[] {
  return data.map(parseComment);
}

export function parseCommentWithAuthor(data: unknown): CommentWithAuthor {
  return CommentWithAuthorSchema.parse(data);
}

export function parseCommentsWithAuthor(data: unknown[]): CommentWithAuthor[] {
  return data.map(parseCommentWithAuthor);
} 