import { z } from 'zod';

// Chain status and visibility enums
export const ChainStatusEnum = z.enum(['active', 'deleted', 'shadow_hidden']);
export const ChainVisibilityEnum = z.enum(['public', 'followers', 'private', 'unlisted']);
export const ChainReactionTypeEnum = z.enum(['like', 'rechain']);

// Chain schema with null to undefined transformation
export const ChainSchema = z.object({
  id: z.string(),
  author_id: z.string(),
  content: z.string(),
  collective_id: z.string().nullable().transform(val => val ?? undefined),
  parent_chain_id: z.string().nullable().transform(val => val ?? undefined),
  status: ChainStatusEnum,
  visibility: ChainVisibilityEnum,
  like_count: z.number(),
  reply_count: z.number(),
  attachments: z.any().nullable().transform(val => val ?? undefined),
  meta: z.any().nullable().transform(val => val ?? undefined),
  created_at: z.string(),
  updated_at: z.string(),
  tsv: z.unknown(),
});

export type Chain = z.infer<typeof ChainSchema>;

// Chain with author info
export const ChainWithAuthorSchema = ChainSchema.extend({
  author: z.object({
    id: z.string(),
    username: z.string().nullable().transform(val => val ?? undefined),
    full_name: z.string().nullable().transform(val => val ?? undefined),
    avatar_url: z.string().nullable().transform(val => val ?? undefined),
  }).optional(),
});

export type ChainWithAuthor = z.infer<typeof ChainWithAuthorSchema>;

// Chain reaction schema
export const ChainReactionSchema = z.object({
  user_id: z.string(),
  chain_id: z.string(),
  reaction: ChainReactionTypeEnum,
  created_at: z.string().nullable().transform(val => val ?? undefined),
});

export type ChainReaction = z.infer<typeof ChainReactionSchema>;

// Chain insert schema
export const ChainInsertSchema = z.object({
  author_id: z.string(),
  content: z.string(),
  collective_id: z.string().optional().transform(val => val ?? null),
  parent_chain_id: z.string().optional().transform(val => val ?? null),
  status: ChainStatusEnum.optional().transform(val => val ?? null),
  visibility: ChainVisibilityEnum.optional().transform(val => val ?? null),
  attachments: z.any().optional().transform(val => val ?? null),
  meta: z.any().optional().transform(val => val ?? null),
});

export type ChainInsert = z.input<typeof ChainInsertSchema>;

// Helper functions
export function parseChain(data: unknown): Chain {
  return ChainSchema.parse(data);
}

export function parseChains(data: unknown[]): Chain[] {
  return data.map(parseChain);
}

export function parseChainWithAuthor(data: unknown): ChainWithAuthor {
  return ChainWithAuthorSchema.parse(data);
}

export function parseChainsWithAuthor(data: unknown[]): ChainWithAuthor[] {
  return data.map(parseChainWithAuthor);
} 