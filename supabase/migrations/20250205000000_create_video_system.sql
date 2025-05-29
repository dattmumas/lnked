-- Video System Migration: Create tables for MUX video integration
-- This migration creates the core video management system with proper relationships and constraints

-- Create video_assets table for managing MUX video assets
CREATE TABLE IF NOT EXISTS public.video_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- MUX Integration
  mux_asset_id text UNIQUE NOT NULL,
  mux_upload_id text,
  mux_playback_ids jsonb DEFAULT '[]'::jsonb,
  
  -- Asset Status and Lifecycle
  status text NOT NULL DEFAULT 'preparing' CHECK (status IN ('preparing', 'ready', 'errored', 'deleted')),
  encoding_tier text DEFAULT 'smart' CHECK (encoding_tier IN ('baseline', 'smart', 'premium')),
  
  -- Video Metadata
  title text NOT NULL,
  description text,
  duration numeric,
  aspect_ratio text,
  resolution_tier text,
  max_resolution_tier text,
  
  -- File Information
  file_size bigint,
  file_type text,
  original_filename text,
  
  -- Playback Configuration
  playback_policy text DEFAULT 'public' CHECK (playback_policy IN ('public', 'signed')),
  mp4_support text DEFAULT 'none' CHECK (mp4_support IN ('none', 'capped-1080p', 'audio-only')),
  normalize_audio boolean DEFAULT true,
  
  -- Ownership and Access
  owner_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  collective_id uuid REFERENCES public.collectives(id) ON DELETE SET NULL,
  is_public boolean DEFAULT false,
  
  -- Content Association
  post_id uuid REFERENCES public.posts(id) ON DELETE SET NULL,
  
  -- Timestamps
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  processed_at timestamptz,
  
  -- MUX Metadata
  mux_metadata jsonb DEFAULT '{}'::jsonb,
  error_details jsonb,
  
  -- Search
  tsv tsvector
);

-- Create live_streams table for managing MUX live streams
CREATE TABLE IF NOT EXISTS public.live_streams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- MUX Integration
  mux_stream_id text UNIQUE NOT NULL,
  mux_playback_ids jsonb DEFAULT '[]'::jsonb,
  stream_key text NOT NULL,
  
  -- Stream Configuration
  status text NOT NULL DEFAULT 'idle' CHECK (status IN ('idle', 'active', 'disconnected', 'disabled')),
  latency_mode text DEFAULT 'standard' CHECK (latency_mode IN ('low', 'reduced', 'standard')),
  reconnect_window integer DEFAULT 60,
  max_continuous_duration integer DEFAULT 43200, -- 12 hours
  
  -- Stream Metadata
  title text NOT NULL,
  description text,
  
  -- Playback Configuration
  playback_policy text DEFAULT 'public' CHECK (playback_policy IN ('public', 'signed')),
  
  -- Recording Settings
  record_stream boolean DEFAULT false,
  recorded_asset_id uuid REFERENCES public.video_assets(id) ON DELETE SET NULL,
  
  -- Ownership and Access
  owner_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  collective_id uuid REFERENCES public.collectives(id) ON DELETE SET NULL,
  is_public boolean DEFAULT false,
  
  -- Timestamps
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  started_at timestamptz,
  ended_at timestamptz,
  
  -- MUX Metadata
  mux_metadata jsonb DEFAULT '{}'::jsonb,
  
  -- Search
  tsv tsvector
);

-- Create video_analytics table for tracking video metrics
CREATE TABLE IF NOT EXISTS public.video_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Asset Reference
  video_asset_id uuid REFERENCES public.video_assets(id) ON DELETE CASCADE,
  live_stream_id uuid REFERENCES public.live_streams(id) ON DELETE CASCADE,
  
  -- Ensure one of video_asset_id or live_stream_id is set
  CONSTRAINT check_asset_or_stream CHECK (
    (video_asset_id IS NOT NULL AND live_stream_id IS NULL) OR
    (video_asset_id IS NULL AND live_stream_id IS NOT NULL)
  ),
  
  -- Analytics Data
  metric_type text NOT NULL CHECK (metric_type IN (
    'view', 'play', 'pause', 'seek', 'buffer', 'error', 'complete',
    'quality_change', 'fullscreen', 'mute', 'unmute'
  )),
  
  -- Viewer Information
  viewer_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  session_id text,
  
  -- Playback Context
  playback_position numeric DEFAULT 0,
  playback_duration numeric,
  quality text,
  
  -- Technical Details
  user_agent text,
  ip_address inet,
  country_code text,
  device_type text,
  browser text,
  
  -- Timestamps
  created_at timestamptz DEFAULT now(),
  
  -- Additional Metadata
  metadata jsonb DEFAULT '{}'::jsonb
);

-- Create mux_webhooks table for webhook processing and deduplication
CREATE TABLE IF NOT EXISTS public.mux_webhooks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- MUX Webhook Data
  mux_webhook_id text UNIQUE NOT NULL,
  webhook_type text NOT NULL,
  
  -- Processing Status
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processed', 'failed', 'ignored')),
  
  -- Webhook Payload
  payload jsonb NOT NULL,
  signature text NOT NULL,
  
  -- Processing Details
  processed_at timestamptz,
  error_message text,
  retry_count integer DEFAULT 0,
  
  -- Related Entities
  video_asset_id uuid REFERENCES public.video_assets(id) ON DELETE SET NULL,
  live_stream_id uuid REFERENCES public.live_streams(id) ON DELETE SET NULL,
  
  -- Timestamps
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_video_assets_owner_id ON public.video_assets(owner_id);
CREATE INDEX IF NOT EXISTS idx_video_assets_collective_id ON public.video_assets(collective_id);
CREATE INDEX IF NOT EXISTS idx_video_assets_status ON public.video_assets(status);
CREATE INDEX IF NOT EXISTS idx_video_assets_mux_asset_id ON public.video_assets(mux_asset_id);
CREATE INDEX IF NOT EXISTS idx_video_assets_created_at ON public.video_assets(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_video_assets_tsv ON public.video_assets USING gin(tsv);

CREATE INDEX IF NOT EXISTS idx_live_streams_owner_id ON public.live_streams(owner_id);
CREATE INDEX IF NOT EXISTS idx_live_streams_collective_id ON public.live_streams(collective_id);
CREATE INDEX IF NOT EXISTS idx_live_streams_status ON public.live_streams(status);
CREATE INDEX IF NOT EXISTS idx_live_streams_mux_stream_id ON public.live_streams(mux_stream_id);
CREATE INDEX IF NOT EXISTS idx_live_streams_created_at ON public.live_streams(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_live_streams_tsv ON public.live_streams USING gin(tsv);

CREATE INDEX IF NOT EXISTS idx_video_analytics_video_asset_id ON public.video_analytics(video_asset_id);
CREATE INDEX IF NOT EXISTS idx_video_analytics_live_stream_id ON public.video_analytics(live_stream_id);
CREATE INDEX IF NOT EXISTS idx_video_analytics_viewer_id ON public.video_analytics(viewer_id);
CREATE INDEX IF NOT EXISTS idx_video_analytics_metric_type ON public.video_analytics(metric_type);
CREATE INDEX IF NOT EXISTS idx_video_analytics_created_at ON public.video_analytics(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_video_analytics_session_id ON public.video_analytics(session_id);

CREATE INDEX IF NOT EXISTS idx_mux_webhooks_mux_webhook_id ON public.mux_webhooks(mux_webhook_id);
CREATE INDEX IF NOT EXISTS idx_mux_webhooks_status ON public.mux_webhooks(status);
CREATE INDEX IF NOT EXISTS idx_mux_webhooks_webhook_type ON public.mux_webhooks(webhook_type);
CREATE INDEX IF NOT EXISTS idx_mux_webhooks_created_at ON public.mux_webhooks(created_at DESC);

-- Create triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_video_assets_updated_at 
  BEFORE UPDATE ON public.video_assets 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_live_streams_updated_at 
  BEFORE UPDATE ON public.live_streams 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_mux_webhooks_updated_at 
  BEFORE UPDATE ON public.mux_webhooks 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create triggers for search vectors
CREATE OR REPLACE FUNCTION update_video_assets_tsv()
RETURNS TRIGGER AS $$
BEGIN
  NEW.tsv := to_tsvector('english', 
    COALESCE(NEW.title, '') || ' ' ||
    COALESCE(NEW.description, '') || ' ' ||
    COALESCE(NEW.original_filename, '')
  );
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE OR REPLACE FUNCTION update_live_streams_tsv()
RETURNS TRIGGER AS $$
BEGIN
  NEW.tsv := to_tsvector('english', 
    COALESCE(NEW.title, '') || ' ' ||
    COALESCE(NEW.description, '')
  );
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_video_assets_tsv_trigger
  BEFORE INSERT OR UPDATE ON public.video_assets
  FOR EACH ROW EXECUTE FUNCTION update_video_assets_tsv();

CREATE TRIGGER update_live_streams_tsv_trigger
  BEFORE INSERT OR UPDATE ON public.live_streams
  FOR EACH ROW EXECUTE FUNCTION update_live_streams_tsv();

-- Enable Row Level Security (RLS)
ALTER TABLE public.video_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_streams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mux_webhooks ENABLE ROW LEVEL SECURITY;

-- RLS Policies for video_assets
CREATE POLICY "Users can view their own video assets" ON public.video_assets
  FOR SELECT USING (auth.uid() = owner_id);

CREATE POLICY "Users can view public video assets" ON public.video_assets
  FOR SELECT USING (is_public = true);

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

CREATE POLICY "Users can insert their own video assets" ON public.video_assets
  FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update their own video assets" ON public.video_assets
  FOR UPDATE USING (auth.uid() = owner_id);

CREATE POLICY "Users can delete their own video assets" ON public.video_assets
  FOR DELETE USING (auth.uid() = owner_id);

-- RLS Policies for live_streams
CREATE POLICY "Users can view their own live streams" ON public.live_streams
  FOR SELECT USING (auth.uid() = owner_id);

CREATE POLICY "Users can view public live streams" ON public.live_streams
  FOR SELECT USING (is_public = true);

CREATE POLICY "Collective members can view collective live streams" ON public.live_streams
  FOR SELECT USING (
    collective_id IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM public.collective_members cm
      WHERE cm.collective_id = live_streams.collective_id
      AND cm.member_id = auth.uid()
      AND cm.role IN ('admin', 'editor', 'author', 'owner')
    )
  );

CREATE POLICY "Users can insert their own live streams" ON public.live_streams
  FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update their own live streams" ON public.live_streams
  FOR UPDATE USING (auth.uid() = owner_id);

CREATE POLICY "Users can delete their own live streams" ON public.live_streams
  FOR DELETE USING (auth.uid() = owner_id);

-- RLS Policies for video_analytics
CREATE POLICY "Users can view analytics for their video assets" ON public.video_analytics
  FOR SELECT USING (
    (video_asset_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.video_assets va
      WHERE va.id = video_analytics.video_asset_id
      AND va.owner_id = auth.uid()
    )) OR
    (live_stream_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.live_streams ls
      WHERE ls.id = video_analytics.live_stream_id
      AND ls.owner_id = auth.uid()
    ))
  );

CREATE POLICY "Anyone can insert video analytics" ON public.video_analytics
  FOR INSERT WITH CHECK (true);

-- RLS Policies for mux_webhooks (admin only)
CREATE POLICY "Service role can manage webhooks" ON public.mux_webhooks
  FOR ALL USING (auth.role() = 'service_role');

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.video_assets TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.live_streams TO authenticated;
GRANT SELECT, INSERT ON public.video_analytics TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.mux_webhooks TO service_role;

-- Grant usage on sequences
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO service_role; 