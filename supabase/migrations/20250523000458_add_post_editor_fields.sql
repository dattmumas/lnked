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
