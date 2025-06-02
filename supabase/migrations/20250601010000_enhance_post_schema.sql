-- Migration: Enhance posts table for multi-page post editor
-- Adds thumbnail support, post type classification, and flexible metadata storage

-- Add post_type enum for distinguishing content types
CREATE TYPE post_type_enum AS ENUM ('text', 'video');

-- Add new fields to posts table
ALTER TABLE public.posts 
  ADD COLUMN IF NOT EXISTS thumbnail_url text,
  ADD COLUMN IF NOT EXISTS post_type post_type_enum DEFAULT 'text' NOT NULL,
  ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}' NOT NULL;

-- Add updated_at column for tracking changes
ALTER TABLE public.posts 
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at on posts table
DROP TRIGGER IF EXISTS update_posts_updated_at ON public.posts;
CREATE TRIGGER update_posts_updated_at
    BEFORE UPDATE ON public.posts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add constraints for data validation
DO $$
BEGIN
    -- Thumbnail URL constraint (reasonable length)
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'check_thumbnail_url_length') THEN
        ALTER TABLE public.posts ADD CONSTRAINT check_thumbnail_url_length 
        CHECK (thumbnail_url IS NULL OR char_length(thumbnail_url) <= 2048);
    END IF;
    
    -- Metadata size constraint (reasonable JSON size limit)
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'check_metadata_size') THEN
        ALTER TABLE public.posts ADD CONSTRAINT check_metadata_size 
        CHECK (pg_column_size(metadata) <= 65536); -- 64KB limit
    END IF;
END
$$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_posts_post_type ON public.posts(post_type);
CREATE INDEX IF NOT EXISTS idx_posts_updated_at ON public.posts(updated_at);
CREATE INDEX IF NOT EXISTS idx_posts_thumbnail_url ON public.posts(thumbnail_url) WHERE thumbnail_url IS NOT NULL;

-- Create GIN index for metadata JSONB queries
CREATE INDEX IF NOT EXISTS idx_posts_metadata_gin ON public.posts USING GIN (metadata);

-- Add helpful comments for documentation
COMMENT ON COLUMN public.posts.thumbnail_url IS 'URL to post thumbnail image for display in feeds and previews';
COMMENT ON COLUMN public.posts.post_type IS 'Type of post content: text for regular posts, video for video posts';
COMMENT ON COLUMN public.posts.metadata IS 'Flexible JSON storage for post-specific data (video details, custom fields, etc.)';
COMMENT ON COLUMN public.posts.updated_at IS 'Timestamp of last modification to the post';

-- Update existing posts to have default post_type if needed
UPDATE public.posts 
SET post_type = 'text' 
WHERE post_type IS NULL;

-- Set updated_at for existing posts to created_at if null
UPDATE public.posts 
SET updated_at = created_at 
WHERE updated_at IS NULL; 