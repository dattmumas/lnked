import he from 'he';
import { z } from 'zod';

import {
  MIN_CONTENT_TEXT_LENGTH,
  MIN_TITLE_LENGTH,
  MAX_TITLE_LENGTH,
  MAX_SUBTITLE_LENGTH,
  MAX_AUTHOR_LENGTH,
  MAX_SEO_TITLE_LENGTH,
  MAX_META_DESCRIPTION_LENGTH,
} from '@/lib/constants/post';

/**
 * Extract plain text from editor content to validate minimum length.
 * Supports both old JSON (Lexical) and new HTML (TipTap) content formats.
 */
export function hasMinimumText(
  content: string,
  minimum: number = MIN_CONTENT_TEXT_LENGTH,
): boolean {
  try {
    // Support both old JSON and new HTML content formats
    if (content.trim().startsWith('{')) {
      // Lexical JSON format (legacy)
      const json = JSON.parse(content) as { root?: unknown };
      const extractText = (node: unknown): string => {
        if (!node || typeof node !== 'object') return '';
        const n = node as {
          type?: string;
          text?: string;
          children?: unknown[];
        };
        if (n.text) return n.text;
        if (Array.isArray(n.children))
          return n.children.map(extractText).join('');
        return '';
      };
      const text = extractText(json.root);
      return text.trim().length >= minimum;
    } else {
      // HTML content (TipTap)
      const plain = content.replace(/<[^>]+>/g, ' '); // strip HTML tags
      const text = he.decode(plain); // decode entities
      return text.trim().length >= minimum;
    }
  } catch {
    return false;
  }
}

/** Base fields shared between post forms */
const baseFields = {
  title: z.string().min(1, 'Title is required').max(MAX_TITLE_LENGTH),
  subtitle: z.string().max(MAX_SUBTITLE_LENGTH).optional().nullable(),
  content: z.string().refine(hasMinimumText, {
    message: `Content must have meaningful text (at least ${MIN_CONTENT_TEXT_LENGTH} characters).`,
  }),
  status: z.enum(['draft', 'published', 'scheduled']),
  published_at: z.string().optional().nullable(),
  // Author field for editor byline (separate from author_id for flexibility)
  author: z.string().max(MAX_AUTHOR_LENGTH).optional().nullable(),
  // Multi-collective support
  selected_collectives: z.array(z.string().uuid()).optional().default([]),
};

/**
 * Adds a refinement that requires `published_at` when status === 'scheduled'.
 */
const applyPublishRefinement = <T extends z.ZodTypeAny>(
  schema: T,
): z.ZodEffects<T, z.output<T>, z.input<T>> =>
  schema.refine(
    (
      data: unknown,
    ): data is z.infer<T> & { status?: string; published_at?: unknown } => {
      const d = data as { status?: string; published_at?: unknown };

      if (d.status !== 'scheduled') {
        return true;
      }

      const { published_at } = d;

      // Accept non‑empty ISO strings or valid Date objects
      if (typeof published_at === 'string') {
        return published_at.trim() !== '';
      }
      if (published_at instanceof Date) {
        return !Number.isNaN(published_at.getTime());
      }

      return false;
    },
    {
      message: 'Publish date is required for scheduled posts.',
      path: ['published_at'],
    },
  ) as z.ZodEffects<T, z.output<T>, z.input<T>>;

export const PostFormBaseSchema = applyPublishRefinement(z.object(baseFields));

/**
 * Schema used by both the new and edit post forms.
 * Includes all editor fields including subtitle, author, and SEO fields.
 */
export const PostFormSchema = applyPublishRefinement(
  z.object(baseFields).extend({
    seo_title: z.string().max(MAX_SEO_TITLE_LENGTH).optional().nullable(),
    meta_description: z
      .string()
      .max(MAX_META_DESCRIPTION_LENGTH)
      .optional()
      .nullable(),
  }),
);

/**
 * Extended schema that includes all database fields for complete post data
 */
export const FullPostSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1).max(MAX_TITLE_LENGTH),
  subtitle: z.string().max(MAX_SUBTITLE_LENGTH).optional().nullable(),
  content: z.string().nullable(),
  author_id: z.string().uuid(),
  collective_id: z.string().uuid().optional().nullable(),
  tenant_id: z.string().uuid(),
  status: z.enum(['draft', 'active', 'removed']), // Database enum
  is_public: z.boolean(),
  published_at: z.string().datetime().optional().nullable(),
  created_at: z.string().datetime(),
  // Editor-specific fields
  author: z.string().max(MAX_AUTHOR_LENGTH).optional().nullable(),
  seo_title: z.string().max(MAX_SEO_TITLE_LENGTH).optional().nullable(),
  meta_description: z
    .string()
    .max(MAX_META_DESCRIPTION_LENGTH)
    .optional()
    .nullable(),
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
    .min(
      MIN_TITLE_LENGTH,
      `Title must be at least ${MIN_TITLE_LENGTH} characters`,
    )
    .max(
      MAX_TITLE_LENGTH,
      `Title must be ${MAX_TITLE_LENGTH} characters or less`,
    ),
  subtitle: z.string().max(MAX_SUBTITLE_LENGTH).optional().nullable(),
  content: z
    .string()
    .min(
      MIN_CONTENT_TEXT_LENGTH,
      `Content must be at least ${MIN_CONTENT_TEXT_LENGTH} characters`,
    ),
  collectiveId: z.string().uuid().optional(),
  selected_collectives: z.array(z.string().uuid()).optional().default([]),
  author: z.string().max(MAX_AUTHOR_LENGTH).optional().nullable(),
  seo_title: z.string().max(MAX_SEO_TITLE_LENGTH).optional().nullable(),
  meta_description: z
    .string()
    .max(MAX_META_DESCRIPTION_LENGTH)
    .optional()
    .nullable(),
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
  id: z.string().uuid().optional(),
  title: z.string().min(1).max(MAX_TITLE_LENGTH),
  subtitle: z.string().max(MAX_SUBTITLE_LENGTH).optional().nullable(),
  content: z.string(),
  author_id: z.string().uuid(),
  collective_id: z.string().uuid().optional().nullable(),
  tenant_id: z.string().uuid(),
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
  author: z.string().max(MAX_AUTHOR_LENGTH).optional().nullable(),
  seo_title: z.string().max(MAX_SEO_TITLE_LENGTH).optional().nullable(),
  meta_description: z
    .string()
    .max(MAX_META_DESCRIPTION_LENGTH)
    .optional()
    .nullable(),
});

export type CreatePostServerValues = z.infer<typeof CreatePostServerSchema>;
export type UpdatePostServerValues = z.infer<typeof UpdatePostServerSchema>;
export type PostFormToDbValues = z.infer<typeof PostFormToDbSchema>;
