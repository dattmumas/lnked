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
  content: z.string().refine(hasMinimumText, {
    message: 'Content must have meaningful text (at least 10 characters).',
  }),
  status: z.enum(['draft', 'published', 'scheduled']),
  published_at: z.string().optional().nullable(),
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
 * SEO fields are optional so the same schema works for edit forms
 * where those inputs may be omitted.
 */
export const PostFormSchema = applyPublishRefinement(
  z.object(baseFields).extend({
    seo_title: z.string().max(60).optional(),
    meta_description: z.string().max(160).optional(),
  }),
);

export type PostFormValues = z.infer<typeof PostFormSchema>;
export type PostFormBaseValues = z.infer<typeof PostFormBaseSchema>;

/** --------------------------------------------------------------------------
 * Server-side schemas used in action functions
 * -------------------------------------------------------------------------- */

export const BasePostServerSchema = z.object({
  title: z
    .string()
    .min(3, 'Title must be at least 3 characters')
    .max(200, 'Title must be 200 characters or less'),
  content: z.string().min(10, 'Content must be at least 10 characters'),
  collectiveId: z.string().uuid().optional(),
});

export const CreatePostServerSchema = BasePostServerSchema.extend({
  is_public: z.boolean().default(true),
  published_at: z.string().datetime({ offset: true }).optional().nullable(),
});

export const UpdatePostServerSchema = BasePostServerSchema.partial().extend({
  is_public: z.boolean().optional(),
  published_at: z.string().datetime({ offset: true }).optional().nullable(),
});

export type CreatePostServerValues = z.infer<typeof CreatePostServerSchema>;
export type UpdatePostServerValues = z.infer<typeof UpdatePostServerSchema>;
