-- Fix video_assets schema to match API implementation
-- This migration fixes several critical mismatches between the schema and API

-- 1. Fix mux_asset_id to allow NULL (videos start without an asset ID)
ALTER TABLE public.video_assets 
  ALTER COLUMN mux_asset_id DROP NOT NULL;

-- 2. Allow title to be NULL (API sends title || null)
ALTER TABLE public.video_assets 
  ALTER COLUMN title DROP NOT NULL;

-- 3. Rename owner_id to created_by to match API usage
ALTER TABLE public.video_assets 
  RENAME COLUMN owner_id TO created_by;

-- 4. Convert mux_playback_ids JSONB array to single mux_playback_id text field
-- First add the new column
ALTER TABLE public.video_assets 
  ADD COLUMN mux_playback_id text;

-- Migrate data from the first playback ID in the array (if any)
UPDATE public.video_assets 
  SET mux_playback_id = (mux_playback_ids->0->>'id')
  WHERE mux_playback_ids IS NOT NULL 
  AND jsonb_array_length(mux_playback_ids) > 0;

-- Drop the old column
ALTER TABLE public.video_assets 
  DROP COLUMN mux_playback_ids;

-- 5. Fix the 'processing' status check constraint
ALTER TABLE public.video_assets 
  DROP CONSTRAINT video_assets_status_check;

ALTER TABLE public.video_assets 
  ADD CONSTRAINT video_assets_status_check 
  CHECK (status IN ('preparing', 'processing', 'ready', 'errored', 'deleted'));

-- 6. Update indexes to use new column name
DROP INDEX IF EXISTS idx_video_assets_owner_id;
CREATE INDEX idx_video_assets_created_by ON public.video_assets(created_by);

-- 7. Update RLS policies to use created_by instead of owner_id
DROP POLICY IF EXISTS "Users can view their own video assets" ON public.video_assets;
DROP POLICY IF EXISTS "Users can insert their own video assets" ON public.video_assets;
DROP POLICY IF EXISTS "Users can update their own video assets" ON public.video_assets;
DROP POLICY IF EXISTS "Users can delete their own video assets" ON public.video_assets;

CREATE POLICY "Users can view their own video assets" ON public.video_assets
  FOR SELECT USING (auth.uid() = created_by);

CREATE POLICY "Users can insert their own video assets" ON public.video_assets
  FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their own video assets" ON public.video_assets
  FOR UPDATE USING (auth.uid() = created_by);

CREATE POLICY "Users can delete their own video assets" ON public.video_assets
  FOR DELETE USING (auth.uid() = created_by);

-- 8. Update collective member check policy
DROP POLICY IF EXISTS "Collective members can view collective video assets" ON public.video_assets;

CREATE POLICY "Collective members can view collective video assets" ON public.video_assets
  FOR SELECT USING (
    collective_id IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM public.collective_members cm
      WHERE cm.collective_id = video_assets.collective_id
      AND cm.member_id = auth.uid()
      AND cm.role IN ('admin', 'editor', 'author', 'owner')
    )
  );

-- 9. Update video_analytics policy to use created_by
DROP POLICY IF EXISTS "Users can view analytics for their video assets" ON public.video_analytics;

CREATE POLICY "Users can view analytics for their video assets" ON public.video_analytics
  FOR SELECT USING (
    (video_asset_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.video_assets va
      WHERE va.id = video_analytics.video_asset_id
      AND va.created_by = auth.uid()
    )) OR
    (live_stream_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.live_streams ls
      WHERE ls.id = video_analytics.live_stream_id
      AND ls.owner_id = auth.uid()
    ))
  );

-- Add helpful comments
COMMENT ON COLUMN public.video_assets.mux_asset_id IS 'MUX asset ID - NULL initially, populated by webhook after upload';
COMMENT ON COLUMN public.video_assets.mux_playback_id IS 'MUX playback ID for streaming - populated when asset is ready';
COMMENT ON COLUMN public.video_assets.created_by IS 'User ID who created/owns this video';
COMMENT ON COLUMN public.video_assets.title IS 'Video title - optional'; 