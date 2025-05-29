-- Create upload_sessions table for tracking file uploads
CREATE TABLE upload_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  upload_id text UNIQUE NOT NULL, -- MUX upload ID
  user_id uuid NOT NULL,
  filename text NOT NULL,
  content_type text NOT NULL,
  file_size bigint NOT NULL CHECK (file_size > 0),
  upload_url text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'uploading', 'completed', 'failed', 'cancelled', 'paused')),
  progress jsonb,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  completed_at timestamptz,
  expires_at timestamptz NOT NULL,
  error_details jsonb,
  resume_info jsonb,
  
  -- Constraints
  CONSTRAINT upload_sessions_expires_at_check CHECK (expires_at > created_at),
  CONSTRAINT upload_sessions_completed_at_check CHECK (completed_at IS NULL OR completed_at >= created_at)
);

-- Create indexes for performance
CREATE INDEX idx_upload_sessions_user_id ON upload_sessions(user_id);
CREATE INDEX idx_upload_sessions_upload_id ON upload_sessions(upload_id);
CREATE INDEX idx_upload_sessions_status ON upload_sessions(status);
CREATE INDEX idx_upload_sessions_created_at ON upload_sessions(created_at DESC);
CREATE INDEX idx_upload_sessions_expires_at ON upload_sessions(expires_at);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_upload_sessions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_upload_sessions_updated_at
  BEFORE UPDATE ON upload_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_upload_sessions_updated_at();

-- Row Level Security (RLS)
ALTER TABLE upload_sessions ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only access their own upload sessions
CREATE POLICY "Users can access their own upload sessions" ON upload_sessions
  FOR ALL USING (auth.uid() = user_id);

-- Policy: Service role can access all upload sessions
CREATE POLICY "Service role can access all upload sessions" ON upload_sessions
  FOR ALL USING (auth.role() = 'service_role');

-- Grant permissions
GRANT ALL ON upload_sessions TO authenticated;
GRANT ALL ON upload_sessions TO service_role;

-- Add comments for documentation
COMMENT ON TABLE upload_sessions IS 'Tracks file upload sessions with progress and resume capability';
COMMENT ON COLUMN upload_sessions.upload_id IS 'MUX upload ID for tracking';
COMMENT ON COLUMN upload_sessions.progress IS 'JSON object containing upload progress information';
COMMENT ON COLUMN upload_sessions.metadata IS 'Video metadata and upload configuration';
COMMENT ON COLUMN upload_sessions.resume_info IS 'Information for resuming chunked uploads';
COMMENT ON COLUMN upload_sessions.error_details IS 'Error information if upload fails'; 