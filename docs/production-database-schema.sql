-- POST-001: Production Database Schema Changes
-- Execute these commands directly in the Supabase SQL Editor
-- Date: 2025-01-06
-- Task: POST-001 Post Creation Architecture Redesign

-- ============================================================================
-- PHASE 2: POST_COLLECTIVES JUNCTION TABLE CREATION
-- ============================================================================

-- Create the post_collectives junction table for many-to-many relationships
CREATE TABLE IF NOT EXISTS post_collectives (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL,
  collective_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'published' CHECK (status IN ('draft', 'published', 'pending_approval', 'rejected')),
  shared_at timestamptz NOT NULL DEFAULT now(),
  shared_by uuid NOT NULL,
  metadata jsonb DEFAULT '{}',
  display_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  -- Ensure unique post-collective associations
  UNIQUE(post_id, collective_id)
);

-- ============================================================================
-- FOREIGN KEY CONSTRAINTS
-- ============================================================================

-- Add foreign key constraints with proper cascading
ALTER TABLE post_collectives 
ADD CONSTRAINT post_collectives_post_id_fkey 
FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE;

ALTER TABLE post_collectives 
ADD CONSTRAINT post_collectives_collective_id_fkey 
FOREIGN KEY (collective_id) REFERENCES collectives(id) ON DELETE CASCADE;

ALTER TABLE post_collectives 
ADD CONSTRAINT post_collectives_shared_by_fkey 
FOREIGN KEY (shared_by) REFERENCES users(id) ON DELETE RESTRICT;

-- ============================================================================
-- PERFORMANCE INDEXES
-- ============================================================================

-- Primary access patterns optimization
CREATE INDEX IF NOT EXISTS idx_post_collectives_post_id 
ON post_collectives(post_id);

CREATE INDEX IF NOT EXISTS idx_post_collectives_collective_id 
ON post_collectives(collective_id);

CREATE INDEX IF NOT EXISTS idx_post_collectives_shared_by 
ON post_collectives(shared_by);

-- Query optimization indexes
CREATE INDEX IF NOT EXISTS idx_post_collectives_status 
ON post_collectives(status);

CREATE INDEX IF NOT EXISTS idx_post_collectives_shared_at 
ON post_collectives(shared_at DESC);

CREATE INDEX IF NOT EXISTS idx_post_collectives_display_order 
ON post_collectives(post_id, display_order);

-- Composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_post_collectives_collective_status 
ON post_collectives(collective_id, status) 
WHERE status = 'published';

CREATE INDEX IF NOT EXISTS idx_post_collectives_user_shared 
ON post_collectives(shared_by, shared_at DESC);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on the new table
ALTER TABLE post_collectives ENABLE ROW LEVEL SECURITY;

-- Policy 1: Users can view post-collective associations for posts they can access
CREATE POLICY "view_post_collective_associations" 
ON post_collectives FOR SELECT 
USING (
  -- User can see if they can view the post
  EXISTS (
    SELECT 1 FROM posts 
    WHERE posts.id = post_collectives.post_id 
    AND (
      posts.is_public = true 
      OR posts.author_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM collective_members cm 
        WHERE cm.collective_id = posts.collective_id 
        AND cm.member_id = auth.uid()
      )
    )
  )
);

-- Policy 2: Users can create associations for posts they authored and collectives they can post to
CREATE POLICY "create_post_collective_associations" 
ON post_collectives FOR INSERT 
WITH CHECK (
  -- User must be the one creating the association
  shared_by = auth.uid()
  AND
  -- User must be the author of the post
  EXISTS (
    SELECT 1 FROM posts 
    WHERE posts.id = post_collectives.post_id 
    AND posts.author_id = auth.uid()
  )
  AND
  -- User must have posting permissions in the collective
  EXISTS (
    SELECT 1 FROM collective_members cm 
    WHERE cm.collective_id = post_collectives.collective_id 
    AND cm.member_id = auth.uid()
    AND cm.role IN ('owner', 'admin', 'editor', 'author')
  )
);

-- Policy 3: Users can update associations they created or if they're collective admins
CREATE POLICY "update_post_collective_associations" 
ON post_collectives FOR UPDATE 
USING (
  shared_by = auth.uid()
  OR
  EXISTS (
    SELECT 1 FROM collective_members cm 
    WHERE cm.collective_id = post_collectives.collective_id 
    AND cm.member_id = auth.uid()
    AND cm.role IN ('owner', 'admin')
  )
);

-- Policy 4: Users can delete associations they created or if they're post authors/collective admins
CREATE POLICY "delete_post_collective_associations" 
ON post_collectives FOR DELETE 
USING (
  shared_by = auth.uid()
  OR
  EXISTS (
    SELECT 1 FROM posts 
    WHERE posts.id = post_collectives.post_id 
    AND posts.author_id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM collective_members cm 
    WHERE cm.collective_id = post_collectives.collective_id 
    AND cm.member_id = auth.uid()
    AND cm.role IN ('owner', 'admin')
  )
);

-- ============================================================================
-- AUDIT TRAIL AND LOGGING
-- ============================================================================

-- Create audit log table for post-collective operations
CREATE TABLE IF NOT EXISTS post_collective_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL,
  collective_id uuid NOT NULL,
  action text NOT NULL CHECK (action IN ('created', 'updated', 'deleted', 'shared', 'unshared')),
  performed_by uuid NOT NULL,
  performed_at timestamptz DEFAULT now(),
  old_values jsonb,
  new_values jsonb,
  metadata jsonb DEFAULT '{}'
);

-- Index for audit log queries
CREATE INDEX IF NOT EXISTS idx_post_collective_audit_post_id 
ON post_collective_audit_log(post_id);

CREATE INDEX IF NOT EXISTS idx_post_collective_audit_collective_id 
ON post_collective_audit_log(collective_id);

CREATE INDEX IF NOT EXISTS idx_post_collective_audit_performed_by 
ON post_collective_audit_log(performed_by);

CREATE INDEX IF NOT EXISTS idx_post_collective_audit_performed_at 
ON post_collective_audit_log(performed_at DESC);

-- Enable RLS on audit log
ALTER TABLE post_collective_audit_log ENABLE ROW LEVEL SECURITY;

-- Audit log policies - only collective admins and post authors can view
CREATE POLICY "view_post_collective_audit_log" 
ON post_collective_audit_log FOR SELECT 
USING (
  performed_by = auth.uid()
  OR
  EXISTS (
    SELECT 1 FROM posts 
    WHERE posts.id = post_collective_audit_log.post_id 
    AND posts.author_id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM collective_members cm 
    WHERE cm.collective_id = post_collective_audit_log.collective_id 
    AND cm.member_id = auth.uid()
    AND cm.role IN ('owner', 'admin')
  )
);

-- ============================================================================
-- TRIGGERS FOR AUDIT TRAIL
-- ============================================================================

-- Function to log post-collective changes
CREATE OR REPLACE FUNCTION log_post_collective_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO post_collective_audit_log (
      post_id, collective_id, action, performed_by, new_values
    ) VALUES (
      NEW.post_id, NEW.collective_id, 'created', NEW.shared_by, 
      to_jsonb(NEW)
    );
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO post_collective_audit_log (
      post_id, collective_id, action, performed_by, old_values, new_values
    ) VALUES (
      NEW.post_id, NEW.collective_id, 'updated', NEW.shared_by, 
      to_jsonb(OLD), to_jsonb(NEW)
    );
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO post_collective_audit_log (
      post_id, collective_id, action, performed_by, old_values
    ) VALUES (
      OLD.post_id, OLD.collective_id, 'deleted', OLD.shared_by, 
      to_jsonb(OLD)
    );
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers for audit logging
DROP TRIGGER IF EXISTS post_collective_audit_trigger ON post_collectives;
CREATE TRIGGER post_collective_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON post_collectives
  FOR EACH ROW EXECUTE FUNCTION log_post_collective_changes();

-- ============================================================================
-- UTILITY FUNCTIONS
-- ============================================================================

-- Function to get post collective count
CREATE OR REPLACE FUNCTION get_post_collective_count(post_uuid uuid)
RETURNS integer AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)::integer 
    FROM post_collectives 
    WHERE post_id = post_uuid 
    AND status = 'published'
  );
END;
$$ LANGUAGE plpgsql;

-- Function to check if user can post to collective
CREATE OR REPLACE FUNCTION can_user_post_to_collective(user_uuid uuid, collective_uuid uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM collective_members 
    WHERE member_id = user_uuid 
    AND collective_id = collective_uuid 
    AND role IN ('owner', 'admin', 'editor', 'author')
  );
END;
$$ LANGUAGE plpgsql;

-- Function to get user's postable collectives
CREATE OR REPLACE FUNCTION get_user_postable_collectives(user_uuid uuid)
RETURNS TABLE (
  collective_id uuid,
  collective_name text,
  collective_slug text,
  user_role text,
  member_count bigint
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    c.name,
    c.slug,
    cm.role::text,
    (SELECT COUNT(*) FROM collective_members cm2 WHERE cm2.collective_id = c.id)
  FROM collectives c
  INNER JOIN collective_members cm ON cm.collective_id = c.id
  WHERE cm.member_id = user_uuid
  AND cm.role IN ('owner', 'admin', 'editor', 'author')
  ORDER BY 
    CASE cm.role 
      WHEN 'owner' THEN 1 
      WHEN 'admin' THEN 2 
      WHEN 'editor' THEN 3 
      WHEN 'author' THEN 4 
    END,
    c.name;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- MIGRATION HELPER FUNCTIONS
-- ============================================================================

-- Function to migrate existing posts to the new system
CREATE OR REPLACE FUNCTION migrate_legacy_post_collectives()
RETURNS integer AS $$
DECLARE
  migration_count integer := 0;
  post_record RECORD;
BEGIN
  -- Find posts that have collective_id but no post_collectives entries
  FOR post_record IN 
    SELECT id, collective_id, author_id 
    FROM posts 
    WHERE collective_id IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM post_collectives pc 
      WHERE pc.post_id = posts.id 
      AND pc.collective_id = posts.collective_id
    )
  LOOP
    -- Create the post_collective association
    INSERT INTO post_collectives (
      post_id, collective_id, shared_by, status, shared_at
    ) VALUES (
      post_record.id, 
      post_record.collective_id, 
      post_record.author_id,
      'published',
      now()
    );
    
    migration_count := migration_count + 1;
  END LOOP;
  
  RETURN migration_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

-- Grant necessary permissions for the application to function
GRANT ALL ON post_collectives TO authenticated;
GRANT ALL ON post_collective_audit_log TO authenticated;

-- Grant permissions on sequences
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Run these queries after schema creation to verify everything is working:

-- 1. Verify table creation
-- SELECT table_name FROM information_schema.tables WHERE table_name IN ('post_collectives', 'post_collective_audit_log');

-- 2. Verify indexes
-- SELECT indexname FROM pg_indexes WHERE tablename IN ('post_collectives', 'post_collective_audit_log');

-- 3. Verify RLS policies
-- SELECT schemaname, tablename, policyname FROM pg_policies WHERE tablename IN ('post_collectives', 'post_collective_audit_log');

-- 4. Test user postable collectives function
-- SELECT * FROM get_user_postable_collectives('your-user-id-here');

-- 5. Run migration (if needed)
-- SELECT migrate_legacy_post_collectives();

-- ============================================================================
-- COMPLETION NOTES
-- ============================================================================

-- After running this schema:
-- 1. Regenerate database.types.ts: npx supabase gen types typescript --project-id YOUR_PROJECT_ID > src/lib/database.types.ts
-- 2. The PostCollectiveService will automatically start working
-- 3. All RLS policies are in place for security
-- 4. Audit logging is enabled for compliance
-- 5. Legacy posts can be migrated using migrate_legacy_post_collectives()

-- Schema creation complete! 