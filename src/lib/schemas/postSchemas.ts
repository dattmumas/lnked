import { z } from 'zod';

/**
 * Extract plain text from Lexical editor JSON to validate content length.
 */
export function hasMinimumText(content: string, minimum = 10): boolean {
  try {
    const json = JSON.parse(content) as { root?: unknown };
    function extract(node: unknown): string {
      if (!node || typeof node !== 'object') return '';
      const n = node as { type?: string; text?: string; children?: unknown[] };
      if (n.type === 'text' && typeof n.text === 'string') return n.text;
      if (Array.isArray(n.children)) return n.children.map(extract).join('');
      return '';
    }
    const text = extract(json.root);
    return text.trim().length >= minimum;
  } catch {
    return false;
  }
}

/** Base fields shared between post forms */
const baseFields = {
  title: z.string().min(1, 'Title is required').max(200),
  subtitle: z.string().max(300).optional().nullable(),
  content: z.string().refine(hasMinimumText, {
    message: 'Content must have meaningful text (at least 10 characters).',
  }),
  status: z.enum(['draft', 'published', 'scheduled']),
  published_at: z.string().optional().nullable(),
  // Author field for editor byline (separate from author_id for flexibility)
  author: z.string().max(100).optional().nullable(),
  // Multi-collective support
  selected_collectives: z.array(z.string().uuid()).optional().default([]),
};

const applyPublishRefinement = <T extends z.ZodTypeAny>(schema: T) =>
  schema.refine(
    (data) =>
      (data as z.infer<T>).status !== 'scheduled' ||
      ((data as z.infer<T>).published_at ?? '').toString().trim() !== '',
    {
      message: 'Publish date is required for scheduled posts.',
      path: ['published_at'],
    },
  );

export const PostFormBaseSchema = applyPublishRefinement(z.object(baseFields));

/**
 * Schema used by both the new and edit post forms.
 * Includes all editor fields including subtitle, author, and SEO fields.
 */
export const PostFormSchema = applyPublishRefinement(
  z.object(baseFields).extend({
    seo_title: z.string().max(60).optional().nullable(),
    meta_description: z.string().max(160).optional().nullable(),
  }),
);

/**
 * Extended schema that includes all database fields for complete post data
 */
export const FullPostSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1).max(200),
  subtitle: z.string().max(300).optional().nullable(),
  content: z.string().nullable(),
  author_id: z.string().uuid(),
  collective_id: z.string().uuid().optional().nullable(),
  status: z.enum(['draft', 'active', 'removed']), // Database enum
  is_public: z.boolean(),
  published_at: z.string().datetime().optional().nullable(),
  created_at: z.string().datetime(),
  // Editor-specific fields
  author: z.string().max(100).optional().nullable(),
  seo_title: z.string().max(60).optional().nullable(),
  meta_description: z.string().max(160).optional().nullable(),
  // Engagement fields
  like_count: z.number().default(0),
  dislike_count: z.number().optional().nullable(),
  view_count: z.number().optional().nullable(),
  // Search vector (managed by database)
  tsv: z.unknown().optional().nullable(),
});

export type PostFormValues = z.infer<typeof PostFormSchema>;
export type PostFormBaseValues = z.infer<typeof PostFormBaseSchema>;
export type FullPostData = z.infer<typeof FullPostSchema>;

/** --------------------------------------------------------------------------
 * Server-side schemas used in action functions
 * -------------------------------------------------------------------------- */

export const BasePostServerSchema = z.object({
  title: z
    .string()
    .min(3, 'Title must be at least 3 characters')
    .max(200, 'Title must be 200 characters or less'),
  subtitle: z.string().max(300).optional().nullable(),
  content: z.string().min(10, 'Content must be at least 10 characters'),
  collectiveId: z.string().uuid().optional(),
  selected_collectives: z.array(z.string().uuid()).optional().default([]),
  author: z.string().max(100).optional().nullable(),
  seo_title: z.string().max(60).optional().nullable(),
  meta_description: z.string().max(160).optional().nullable(),
});

export const CreatePostServerSchema = BasePostServerSchema.extend({
  is_public: z.boolean().default(true),
  published_at: z.string().datetime({ offset: true }).optional().nullable(),
});

export const UpdatePostServerSchema = BasePostServerSchema.partial().extend({
  is_public: z.boolean().optional(),
  published_at: z.string().datetime({ offset: true }).optional().nullable(),
});

/**
 * Schema for transforming form data to database format
 * Maps form status to database status enum
 */
export const PostFormToDbSchema = z.object({
  title: z.string().min(1).max(200),
  subtitle: z.string().max(300).optional().nullable(),
  content: z.string(),
  author_id: z.string().uuid(),
  collective_id: z.string().uuid().optional().nullable(),
  selected_collectives: z.array(z.string().uuid()).optional().default([]),
  status: z.enum(['draft', 'published', 'scheduled']).transform((val) => {
    // Transform form status to database enum
    switch (val) {
      case 'published':
      case 'scheduled':
        return 'active' as const;
      default:
        return 'draft' as const;
    }
  }),
  is_public: z.boolean(),
  published_at: z.string().datetime().optional().nullable(),
  author: z.string().max(100).optional().nullable(),
  seo_title: z.string().max(60).optional().nullable(),
  meta_description: z.string().max(160).optional().nullable(),
});

export type CreatePostServerValues = z.infer<typeof CreatePostServerSchema>;
export type UpdatePostServerValues = z.infer<typeof UpdatePostServerSchema>;
export type PostFormToDbValues = z.infer<typeof PostFormToDbSchema>;
