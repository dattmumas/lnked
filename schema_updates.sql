-- Schema Updates for MUX Integration Compliance
-- This script ensures proper separation of upload IDs and asset IDs,
-- and fixes any naming inconsistencies

-- 1. Ensure video_assets table has all required columns
-- Note: These columns may already exist based on your database.types.ts
ALTER TABLE video_assets 
ADD COLUMN IF NOT EXISTS mux_upload_id TEXT,
ADD COLUMN IF NOT EXISTS mp4_support TEXT;

-- 2. Create an index on mux_upload_id for faster webhook lookups
CREATE INDEX IF NOT EXISTS idx_video_assets_mux_upload_id 
ON video_assets(mux_upload_id) 
WHERE mux_upload_id IS NOT NULL;

-- 3. Update any existing records where upload IDs are stored in mux_asset_id
-- This migrates data from the old pattern to the new pattern
UPDATE video_assets 
SET 
  mux_upload_id = mux_asset_id,
  mux_asset_id = NULL
WHERE mux_asset_id LIKE 'upload-%';

-- 4. Add a constraint to ensure mux_asset_id doesn't contain upload IDs
ALTER TABLE video_assets 
ADD CONSTRAINT check_mux_asset_id_not_upload 
CHECK (mux_asset_id IS NULL OR mux_asset_id NOT LIKE 'upload-%');

-- 5. Update the find_video_by_mux_id function to search both columns
CREATE OR REPLACE FUNCTION find_video_by_mux_id(p_mux_id TEXT)
RETURNS SETOF video_assets AS $$
BEGIN
  RETURN QUERY
  SELECT * FROM video_assets 
  WHERE mux_asset_id = p_mux_id 
     OR mux_upload_id = p_mux_id
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- 6. Add comment documentation for clarity
COMMENT ON COLUMN video_assets.mux_upload_id IS 'MUX Direct Upload ID (starts with "upload-")';
COMMENT ON COLUMN video_assets.mux_asset_id IS 'MUX Asset ID after processing is complete';
COMMENT ON COLUMN video_assets.mp4_support IS 'MP4 rendition setting: none, capped-1080p, etc.';

-- 7. Create a trigger to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_video_assets_updated_at 
BEFORE UPDATE ON video_assets 
FOR EACH ROW 
EXECUTE FUNCTION update_updated_at_column();

-- 8. Add RLS policies if not already present (adjust based on your needs)
-- Enable RLS
ALTER TABLE video_assets ENABLE ROW LEVEL SECURITY;

-- Users can view their own videos
CREATE POLICY "Users can view own videos" ON video_assets
FOR SELECT USING (auth.uid() = created_by);

-- Users can insert their own videos
CREATE POLICY "Users can insert own videos" ON video_assets
FOR INSERT WITH CHECK (auth.uid() = created_by);

-- Users can update their own videos
CREATE POLICY "Users can update own videos" ON video_assets
FOR UPDATE USING (auth.uid() = created_by);

-- Users can delete their own videos
CREATE POLICY "Users can delete own videos" ON video_assets
FOR DELETE USING (auth.uid() = created_by);

-- Service role (for webhooks) can do anything
CREATE POLICY "Service role has full access" ON video_assets
FOR ALL USING (auth.role() = 'service_role'); 