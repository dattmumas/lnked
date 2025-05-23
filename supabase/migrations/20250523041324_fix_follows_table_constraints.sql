-- Migration: Fix follows table constraints
-- Add unique constraint to prevent duplicate follows

-- First, remove any existing duplicate follows
WITH duplicates AS (
  SELECT 
    follower_id, 
    following_id, 
    following_type,
    MIN(created_at) as first_created_at
  FROM public.follows
  GROUP BY follower_id, following_id, following_type
  HAVING COUNT(*) > 1
)
DELETE FROM public.follows f
WHERE EXISTS (
  SELECT 1 FROM duplicates d
  WHERE f.follower_id = d.follower_id
    AND f.following_id = d.following_id
    AND f.following_type = d.following_type
    AND f.created_at > d.first_created_at
);

-- Add unique constraint to prevent duplicate follows
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'unique_follow_relationship' 
        AND table_name = 'follows'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.follows 
        ADD CONSTRAINT unique_follow_relationship 
        UNIQUE (follower_id, following_id, following_type);
    END IF;
END
$$;

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_follows_following_id_type ON public.follows(following_id, following_type);
CREATE INDEX IF NOT EXISTS idx_follows_follower_id ON public.follows(follower_id);

-- Add comments for documentation
COMMENT ON TABLE public.follows IS 'Tracks follow relationships between users and collectives';
COMMENT ON CONSTRAINT unique_follow_relationship ON public.follows IS 'Prevents duplicate follow relationships';
