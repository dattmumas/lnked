# Post Schema Migration Guide

This guide documents the schema changes needed to support the enhanced post editor experience with subtitle, author bylines, and SEO fields.

## Overview

The current post editor includes fields that are not yet in the database schema:

- `subtitle` - Post subtitle displayed below the main title
- `author` - Custom author byline (separate from `author_id` for display flexibility)
- `seo_title` - SEO-optimized title for search engines
- `meta_description` - Meta description for search engines

## Database Schema Changes Required

### 1. Apply Migration

Run the migration file `supabase/migrations/add_post_editor_fields.sql`:

```sql
-- Migration: Add editor fields to posts table
-- These fields support the enhanced post editor experience

-- Add subtitle field for post subtitles
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS subtitle text;

-- Add author field for custom author bylines (separate from author_id for flexibility)
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS author text;

-- Add SEO fields for search engine optimization
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS seo_title text;
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS meta_description text;

-- Add constraints for reasonable field lengths
ALTER TABLE public.posts ADD CONSTRAINT IF NOT EXISTS check_subtitle_length CHECK (char_length(subtitle) <= 300);
ALTER TABLE public.posts ADD CONSTRAINT IF NOT EXISTS check_author_length CHECK (char_length(author) <= 100);
ALTER TABLE public.posts ADD CONSTRAINT IF NOT EXISTS check_seo_title_length CHECK (char_length(seo_title) <= 60);
ALTER TABLE public.posts ADD CONSTRAINT IF NOT EXISTS check_meta_description_length CHECK (char_length(meta_description) <= 160);

-- Add comments for documentation
COMMENT ON COLUMN public.posts.subtitle IS 'Optional subtitle for the post, displayed below the main title';
COMMENT ON COLUMN public.posts.author IS 'Optional custom author byline, separate from author_id for display flexibility';
COMMENT ON COLUMN public.posts.seo_title IS 'SEO-optimized title for search engines, max 60 characters';
COMMENT ON COLUMN public.posts.meta_description IS 'Meta description for search engines, max 160 characters';
```

### 2. Apply to Production Database

If using Supabase Dashboard:

1. Go to your project's SQL Editor
2. Copy and paste the migration SQL above
3. Execute the query

If using Supabase CLI:

```bash
# If you have the project linked
supabase db push

# Or apply the migration file directly
supabase migration new add_post_editor_fields
# Copy the migration content to the new file
supabase db push
```

### 3. Regenerate TypeScript Types

After applying the migration, regenerate your TypeScript types:

```bash
# Generate new types from your updated database
supabase gen types typescript --project-id YOUR_PROJECT_ID --schema public > src/lib/database.types.ts
```

## Updated Schema Structure

After migration, the `posts` table will have:

### Core Fields

- `id` (uuid, primary key)
- `author_id` (uuid, foreign key to users)
- `collective_id` (uuid, foreign key to collectives, nullable)
- `title` (text, required)
- `subtitle` (text, nullable) - **NEW**
- `content` (text, nullable)

### Publishing Fields

- `status` (enum: 'draft' | 'active' | 'removed')
- `is_public` (boolean)
- `published_at` (timestamp, nullable)
- `created_at` (timestamp)

### Display Fields

- `author` (text, nullable) - **NEW** Custom author byline
- `seo_title` (text, nullable) - **NEW** SEO title
- `meta_description` (text, nullable) - **NEW** SEO description

### Engagement Fields

- `like_count` (integer, default 0)
- `dislike_count` (integer, nullable)
- `view_count` (integer, nullable)
- `tsv` (tsvector, for full-text search)

## Form Schema Validation

The updated Zod schemas in `src/lib/schemas/postSchemas.ts` now include:

```typescript
export const PostFormSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  subtitle: z.string().max(300).optional().nullable(),
  content: z.string().refine(hasMinimumText, {
    message: 'Content must have meaningful text (at least 10 characters).',
  }),
  status: z.enum(['draft', 'published', 'scheduled']),
  published_at: z.string().optional().nullable(),
  author: z.string().max(100).optional().nullable(),
  seo_title: z.string().max(60).optional().nullable(),
  meta_description: z.string().max(160).optional().nullable(),
});
```

## Editor Integration

The `PostEditor` component now supports:

1. **Title Input** - Large title field (Substack-style)
2. **Subtitle Input** - Secondary title field below main title
3. **Author Byline** - Removable author tags with + button to add
4. **Content Editor** - Rich Lexical editor with full toolbar
5. **SEO Settings** - Available in the settings sidebar

## API Changes

The post creation and update APIs now handle the new fields:

- `createPost()` - Accepts subtitle, author, seo_title, meta_description
- `updatePost()` - Updates all editor fields
- Autosave functionality includes new fields

## Breaking Changes

⚠️ **Important**: After applying this migration:

1. Update your TypeScript types as shown above
2. Any existing post queries that expect specific field structures may need updates
3. The form submission now includes additional fields - ensure your API endpoints handle them

## Field Usage Guidelines

### Subtitle

- Optional complementary text to the main title
- Should be descriptive but concise (max 300 chars)
- Displayed prominently below the main title

### Author Byline

- Optional custom author display name
- Separate from `author_id` for flexibility
- Can be different from the user's actual name
- Useful for pen names, guest posts, etc.

### SEO Fields

- `seo_title`: Optimized for search engines (max 60 chars)
- `meta_description`: Summary for search results (max 160 chars)
- If not provided, will fall back to `title` and excerpt from `content`

## Post Viewing Updates

The post viewing page (`src/app/(public)/posts/[slug]/page.tsx`) now displays:

- Main title with large typography
- Subtitle below title (if provided)
- Author information with custom byline (if provided)
- Enhanced meta tags using SEO fields

This creates a complete, modern publishing platform experience similar to Substack, Medium, and other professional blogging platforms.
