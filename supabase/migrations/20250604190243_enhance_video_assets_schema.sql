-- Migration: Enhance video_assets schema for Video System Enhancement
-- Date: 2025-01-06
-- Phase: 1 of 5 - Progressive Schema Migration with Gradual Rollout

-- Add new columns to video_assets table with safe defaults
-- Following progressive migration strategy: nullable columns with defaults

ALTER TABLE video_assets 
ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS playback_policy TEXT DEFAULT 'public',
ADD COLUMN IF NOT EXISTS encoding_tier TEXT DEFAULT 'smart',
ADD COLUMN IF NOT EXISTS collective_id UUID REFERENCES collectives(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS post_id UUID REFERENCES posts(id) ON DELETE SET NULL;

-- Add constraints for new columns
ALTER TABLE video_assets 
ADD CONSTRAINT video_assets_playback_policy_check 
CHECK (playback_policy IN ('public', 'signed'));

ALTER TABLE video_assets 
ADD CONSTRAINT video_assets_encoding_tier_check 
CHECK (encoding_tier IN ('smart', 'baseline'));

-- Create indexes for performance on new foreign key columns
CREATE INDEX IF NOT EXISTS idx_video_assets_collective_id ON video_assets(collective_id);
CREATE INDEX IF NOT EXISTS idx_video_assets_post_id ON video_assets(post_id);

-- Update RLS policies to include new columns
-- Ensure existing policies cover the new columns

-- Policy for public videos (when is_public = true)
CREATE POLICY "Public videos are viewable by everyone" ON video_assets
FOR SELECT USING (is_public = true);

-- Policy for collective videos (when collective_id is set)
CREATE POLICY "Collective videos are viewable by collective members" ON video_assets
FOR SELECT USING (
  collective_id IS NOT NULL AND 
  EXISTS (
    SELECT 1 FROM collective_members 
    WHERE collective_members.collective_id = video_assets.collective_id 
    AND collective_members.member_id = auth.uid()
    AND collective_members.member_type = 'user'
  )
);

-- Policy for private videos (owner only)
CREATE POLICY "Private videos are viewable by owner only" ON video_assets
FOR SELECT USING (
  created_by = auth.uid() AND 
  (is_public = false OR is_public IS NULL)
);

-- Update existing policies to handle new columns
-- Note: This assumes existing policies exist and need updating

-- Add comments for documentation
COMMENT ON COLUMN video_assets.is_public IS 'Whether the video is publicly accessible';
COMMENT ON COLUMN video_assets.playback_policy IS 'MUX playback policy: public or signed';
COMMENT ON COLUMN video_assets.encoding_tier IS 'MUX encoding tier: smart or baseline';
COMMENT ON COLUMN video_assets.collective_id IS 'Associated collective for collective-specific videos';
COMMENT ON COLUMN video_assets.post_id IS 'Associated post for video-post integration';

-- Migration verification
-- Verify new columns exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'video_assets' AND column_name = 'is_public'
  ) THEN
    RAISE EXCEPTION 'Migration failed: is_public column not created';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'video_assets' AND column_name = 'collective_id'
  ) THEN
    RAISE EXCEPTION 'Migration failed: collective_id column not created';
  END IF;
  
  RAISE NOTICE 'Video assets schema enhancement completed successfully';
END $$; 