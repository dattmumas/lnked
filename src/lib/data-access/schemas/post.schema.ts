import { z } from 'zod';


// Post type enum from database
export const PostTypeEnum = z.enum(['text', 'video']);
export const PostStatusEnum = z.enum(['draft', 'active', 'removed']);

// Post schema with null to undefined transformation
export const PostSchema = z.object({
  id: z.string(),
  author_id: z.string(),
  author: z.string().nullable().transform(val => val ?? undefined),
  collective_id: z.string().nullable().transform(val => val ?? undefined),
  title: z.string(),
  subtitle: z.string().nullable().transform(val => val ?? undefined),
  content: z.string().nullable().transform(val => val ?? undefined),
  thumbnail_url: z.string().nullable().transform(val => val ?? undefined),
  seo_title: z.string().nullable().transform(val => val ?? undefined),
  meta_description: z.string().nullable().transform(val => val ?? undefined),
  slug: z.string(),
  post_type: PostTypeEnum,
  status: PostStatusEnum,
  is_public: z.boolean(),
  created_at: z.string(),
  updated_at: z.string().nullable().transform(val => val ?? undefined),
  published_at: z.string().nullable().transform(val => val ?? undefined),
  like_count: z.number(),
  dislike_count: z.number().nullable().transform(val => val ?? undefined),
  view_count: z.number().nullable().transform(val => val ?? undefined),
  metadata: z.any().transform(val => val),
  sharing_settings: z.any().nullable().transform(val => val ?? undefined),
  tsv: z.unknown(),
});

export type Post = z.infer<typeof PostSchema>;

// Post with author info
export const PostWithAuthorSchema = PostSchema.extend({
  author_info: z.object({
    id: z.string(),
    username: z.string().nullable().transform(val => val ?? undefined),
    full_name: z.string().nullable().transform(val => val ?? undefined),
    avatar_url: z.string().nullable().transform(val => val ?? undefined),
  }).optional(),
});

export type PostWithAuthor = z.infer<typeof PostWithAuthorSchema>;

// Post insert/update schemas
export const PostInsertSchema = z.object({
  author_id: z.string(),
  author: z.string().optional().transform(val => val ?? null),
  collective_id: z.string().optional().transform(val => val ?? null),
  title: z.string(),
  subtitle: z.string().optional().transform(val => val ?? null),
  content: z.string().optional().transform(val => val ?? null),
  thumbnail_url: z.string().optional().transform(val => val ?? null),
  seo_title: z.string().optional().transform(val => val ?? null),
  meta_description: z.string().optional().transform(val => val ?? null),
  slug: z.string(),
  post_type: PostTypeEnum.optional().transform(val => val ?? null),
  status: PostStatusEnum.optional().transform(val => val ?? null),
  is_public: z.boolean().optional().transform(val => val ?? null),
  published_at: z.string().optional().transform(val => val ?? null),
  metadata: z.any().optional(),
  sharing_settings: z.any().optional().transform(val => val ?? null),
});

export type PostInsert = z.input<typeof PostInsertSchema>;

export const PostUpdateSchema = PostInsertSchema.partial();
export type PostUpdate = z.input<typeof PostUpdateSchema>;

// Post reaction schemas
export const PostReactionSchema = z.object({
  user_id: z.string(),
  post_id: z.string(),
  type: z.string(),
  created_at: z.string(),
});

export type PostReaction = z.infer<typeof PostReactionSchema>;

// Post bookmark schema
export const PostBookmarkSchema = z.object({
  user_id: z.string(),
  post_id: z.string(),
  created_at: z.string(),
});

export type PostBookmark = z.infer<typeof PostBookmarkSchema>;

// Helper functions
export function parsePost(data: unknown): Post {
  return PostSchema.parse(data);
}

export function parsePosts(data: unknown[]): Post[] {
  return data.map(parsePost);
}

export function parsePostWithAuthor(data: unknown): PostWithAuthor {
  return PostWithAuthorSchema.parse(data);
}

export function parsePostsWithAuthor(data: unknown[]): PostWithAuthor[] {
  return data.map(parsePostWithAuthor);
} 