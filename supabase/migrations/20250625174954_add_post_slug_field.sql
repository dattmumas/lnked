-- Add Post Slug Field Migration
-- 
-- This migration adds a slug field to the posts table to enable:
-- 1. Persistent, SEO-friendly URLs
-- 2. Slug-based post lookup
-- 3. Slug uniqueness within tenant scope
-- 4. Slug history for redirects (future enhancement)

-- =============================================================================
-- Add slug column to posts table
-- =============================================================================

-- Add slug column (nullable initially for existing posts)
ALTER TABLE public.posts 
ADD COLUMN slug TEXT;

-- Add updated_at trigger for slug changes
CREATE OR REPLACE FUNCTION update_post_slug_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  -- Only update if slug actually changed
  IF OLD.slug IS DISTINCT FROM NEW.slug THEN
    NEW.updated_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- Slug generation function
-- =============================================================================

CREATE OR REPLACE FUNCTION public.generate_post_slug(
  post_title TEXT,
  post_tenant_id UUID,
  post_id UUID DEFAULT NULL
)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  base_slug TEXT;
  final_slug TEXT;
  slug_counter INTEGER;
  max_attempts INTEGER := 100;
  current_attempt INTEGER := 0;
BEGIN
  -- Generate base slug from title
  base_slug := lower(trim(post_title));
  
  -- Replace spaces with hyphens and remove special characters
  base_slug := regexp_replace(base_slug, '[^a-z0-9\s-]', '', 'g');
  base_slug := regexp_replace(base_slug, '\s+', '-', 'g');
  base_slug := regexp_replace(base_slug, '-+', '-', 'g');
  base_slug := trim(base_slug, '-');
  
  -- Ensure minimum length
  IF LENGTH(base_slug) < 3 THEN
    base_slug := base_slug || '-post';
  END IF;
  
  -- Ensure maximum length (for URLs)
  IF LENGTH(base_slug) > 100 THEN
    base_slug := LEFT(base_slug, 100);
    base_slug := trim(base_slug, '-');
  END IF;
  
  -- Try to find unique slug within tenant
  final_slug := base_slug;
  slug_counter := 0;
  
  WHILE current_attempt < max_attempts LOOP
    -- Check if slug exists in same tenant (excluding current post if updating)
    IF NOT EXISTS (
      SELECT 1 
      FROM public.posts 
      WHERE slug = final_slug 
        AND tenant_id = post_tenant_id
        AND (post_id IS NULL OR id != post_id)
    ) THEN
      -- Slug is unique, return it
      RETURN final_slug;
    END IF;
    
    -- Slug exists, try with counter
    slug_counter := slug_counter + 1;
    final_slug := base_slug || '-' || slug_counter;
    current_attempt := current_attempt + 1;
  END LOOP;
  
  -- If we couldn't find a unique slug, append timestamp
  RETURN base_slug || '-' || EXTRACT(EPOCH FROM NOW())::TEXT;
END;
$$;

-- =============================================================================
-- Function to populate slugs for existing posts
-- =============================================================================

CREATE OR REPLACE FUNCTION public.populate_existing_post_slugs()
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  post_record RECORD;
  generated_slug TEXT;
  updated_count INTEGER := 0;
BEGIN
  -- Process all posts without slugs
  FOR post_record IN 
    SELECT id, title, tenant_id 
    FROM public.posts 
    WHERE slug IS NULL
    ORDER BY created_at ASC
  LOOP
    -- Generate slug for this post
    generated_slug := public.generate_post_slug(
      post_record.title,
      post_record.tenant_id,
      post_record.id
    );
    
    -- Update the post with generated slug
    UPDATE public.posts 
    SET slug = generated_slug
    WHERE id = post_record.id;
    
    updated_count := updated_count + 1;
  END LOOP;
  
  RETURN updated_count;
END;
$$;

-- =============================================================================
-- Populate slugs for existing posts
-- =============================================================================

-- Generate slugs for all existing posts
SELECT public.populate_existing_post_slugs();

-- =============================================================================
-- Make slug column NOT NULL and add constraints
-- =============================================================================

-- Now that all posts have slugs, make the column required
ALTER TABLE public.posts 
ALTER COLUMN slug SET NOT NULL;

-- Add constraint for slug format (optional but recommended)
ALTER TABLE public.posts 
ADD CONSTRAINT posts_slug_format 
CHECK (slug ~* '^[a-z0-9]+([a-z0-9\-]*[a-z0-9])?$' AND LENGTH(slug) >= 3 AND LENGTH(slug) <= 100);

-- Add unique constraint on (tenant_id, slug)
ALTER TABLE public.posts 
ADD CONSTRAINT posts_slug_unique_per_tenant 
UNIQUE (tenant_id, slug);

-- =============================================================================
-- Create indexes for performance
-- =============================================================================

-- Index for slug lookups within tenant (covered by unique constraint above)
-- Additional index for global slug searches (if needed)
CREATE INDEX idx_posts_slug ON public.posts (slug);

-- Index for slug generation queries
CREATE INDEX idx_posts_tenant_slug ON public.posts (tenant_id, slug);

-- =============================================================================
-- Trigger to auto-generate slugs for new posts
-- =============================================================================

CREATE OR REPLACE FUNCTION public.auto_generate_post_slug()
RETURNS TRIGGER AS $$
BEGIN
  -- Only generate slug if not provided or empty
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    NEW.slug := public.generate_post_slug(
      NEW.title,
      NEW.tenant_id,
      NEW.id
    );
  ELSE
    -- Validate provided slug format
    IF NOT (NEW.slug ~* '^[a-z0-9]+([a-z0-9\-]*[a-z0-9])?$' AND LENGTH(NEW.slug) >= 3 AND LENGTH(NEW.slug) <= 100) THEN
      RAISE EXCEPTION 'Invalid slug format. Slug must be 3-100 characters, lowercase alphanumeric with hyphens only.';
    END IF;
    
    -- Check uniqueness within tenant
    IF EXISTS (
      SELECT 1 
      FROM public.posts 
      WHERE slug = NEW.slug 
        AND tenant_id = NEW.tenant_id
        AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::UUID)
    ) THEN
      RAISE EXCEPTION 'Slug "%" already exists in this tenant', NEW.slug;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for new posts
CREATE TRIGGER trigger_auto_generate_post_slug
  BEFORE INSERT OR UPDATE OF title, slug ON public.posts
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_generate_post_slug();

-- =============================================================================
-- Slug history table for redirects (future enhancement)
-- =============================================================================

-- Create table to track old slugs for redirect purposes
CREATE TABLE public.post_slug_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  old_slug TEXT NOT NULL,
  new_slug TEXT NOT NULL,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  changed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Index for redirect lookups
CREATE INDEX idx_post_slug_history_tenant_old_slug 
ON public.post_slug_history (tenant_id, old_slug);

-- Index for post slug history
CREATE INDEX idx_post_slug_history_post_id 
ON public.post_slug_history (post_id);

-- =============================================================================
-- Function to track slug changes
-- =============================================================================

CREATE OR REPLACE FUNCTION public.track_post_slug_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Only track if slug actually changed and old slug exists
  IF OLD.slug IS DISTINCT FROM NEW.slug AND OLD.slug IS NOT NULL THEN
    INSERT INTO public.post_slug_history (
      post_id,
      tenant_id,
      old_slug,
      new_slug,
      changed_by
    ) VALUES (
      NEW.id,
      NEW.tenant_id,
      OLD.slug,
      NEW.slug,
      auth.uid()
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to track slug changes
CREATE TRIGGER trigger_track_post_slug_change
  AFTER UPDATE OF slug ON public.posts
  FOR EACH ROW
  EXECUTE FUNCTION public.track_post_slug_change();

-- =============================================================================
-- Helper function to find post by slug in tenant
-- =============================================================================

CREATE OR REPLACE FUNCTION public.find_post_by_slug(
  tenant_uuid UUID,
  post_slug TEXT
)
RETURNS TABLE (
  post_id UUID,
  title TEXT,
  content TEXT,
  author_id UUID,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  is_current_slug BOOLEAN
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- First try to find by current slug
  RETURN QUERY
  SELECT 
    p.id as post_id,
    p.title,
    p.content,
    p.author_id,
    p.created_at,
    p.updated_at,
    TRUE as is_current_slug
  FROM public.posts p
  WHERE p.tenant_id = tenant_uuid 
    AND p.slug = post_slug;
  
  -- If no current slug found, check slug history for redirects
  IF NOT FOUND THEN
    RETURN QUERY
    SELECT 
      p.id as post_id,
      p.title,
      p.content,
      p.author_id,
      p.created_at,
      p.updated_at,
      FALSE as is_current_slug
    FROM public.posts p
    INNER JOIN public.post_slug_history psh ON p.id = psh.post_id
    WHERE psh.tenant_id = tenant_uuid 
      AND psh.old_slug = post_slug
    ORDER BY psh.changed_at DESC
    LIMIT 1;
  END IF;
END;
$$;

-- =============================================================================
-- Grant permissions
-- =============================================================================

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION public.generate_post_slug(TEXT, UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.find_post_by_slug(UUID, TEXT) TO authenticated;

-- Grant select on slug history to authenticated users (for their own posts)
GRANT SELECT ON public.post_slug_history TO authenticated;

-- =============================================================================
-- Comments and documentation
-- =============================================================================

COMMENT ON COLUMN public.posts.slug IS 
'SEO-friendly URL slug for the post, unique within tenant scope';

COMMENT ON TABLE public.post_slug_history IS 
'Historical record of post slug changes for redirect support';

COMMENT ON FUNCTION public.generate_post_slug IS 
'Generates a unique slug for a post within a tenant based on the title';

COMMENT ON FUNCTION public.find_post_by_slug IS 
'Finds a post by slug, including historical slugs for redirect support';

-- =============================================================================
-- Update RLS policies for slug history table
-- =============================================================================

-- Enable RLS on post_slug_history
ALTER TABLE public.post_slug_history ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view slug history for posts in accessible tenants
CREATE POLICY "Users can view slug history for accessible posts"
ON public.post_slug_history
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 
    FROM public.posts 
    WHERE posts.id = post_slug_history.post_id
      AND public.user_is_tenant_member(posts.tenant_id)
  )
);

-- =============================================================================
-- Migration completion
-- =============================================================================

-- Clean up temporary functions
DROP FUNCTION IF EXISTS public.populate_existing_post_slugs();
