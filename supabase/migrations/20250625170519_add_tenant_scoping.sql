-- Migration: Add tenant scoping to existing tables
-- Date: December 25, 2025
-- Description: Adds tenant_id columns to tables that need multi-tenant isolation

-- Add tenant_id to chains table
ALTER TABLE chains ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;

-- Add tenant_id to video_assets table  
ALTER TABLE video_assets ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;

-- Add tenant_id to posts table if not exists
ALTER TABLE posts ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;

-- Create indexes for tenant_id columns
CREATE INDEX IF NOT EXISTS idx_chains_tenant_id ON chains(tenant_id);
CREATE INDEX IF NOT EXISTS idx_video_assets_tenant_id ON video_assets(tenant_id);
CREATE INDEX IF NOT EXISTS idx_posts_tenant_id ON posts(tenant_id);

-- Update chains to be tenant-aware by migrating existing collective_id data
DO $$
DECLARE
    chain_record RECORD;
    v_tenant_id UUID;
BEGIN
    FOR chain_record IN 
        SELECT c.id, c.collective_id, c.author_id 
        FROM chains c 
        WHERE c.tenant_id IS NULL 
    LOOP
        v_tenant_id := NULL;
        
        -- Try to find tenant for collective
        IF chain_record.collective_id IS NOT NULL THEN
            -- Look for a tenant that corresponds to this collective
            -- For now, we'll use the user's personal tenant as fallback
            SELECT get_user_personal_tenant(chain_record.author_id) INTO v_tenant_id;
        ELSE
            -- Use author's personal tenant
            SELECT get_user_personal_tenant(chain_record.author_id) INTO v_tenant_id;
        END IF;
        
        -- Update the chain with tenant_id
        IF v_tenant_id IS NOT NULL THEN
            UPDATE chains 
            SET tenant_id = v_tenant_id 
            WHERE id = chain_record.id;
        END IF;
    END LOOP;
END $$;

-- Update video_assets to be tenant-aware
DO $$
DECLARE
    video_record RECORD;
    v_tenant_id UUID;
BEGIN
    FOR video_record IN 
        SELECT v.id, v.collective_id, v.created_by 
        FROM video_assets v 
        WHERE v.tenant_id IS NULL 
    LOOP
        v_tenant_id := NULL;
        
        -- Try to find tenant for collective
        IF video_record.collective_id IS NOT NULL THEN
            -- For now, use creator's personal tenant as fallback
            SELECT get_user_personal_tenant(video_record.created_by) INTO v_tenant_id;
        ELSE
            -- Use creator's personal tenant
            SELECT get_user_personal_tenant(video_record.created_by) INTO v_tenant_id;
        END IF;
        
        -- Update the video with tenant_id
        IF v_tenant_id IS NOT NULL THEN
            UPDATE video_assets 
            SET tenant_id = v_tenant_id 
            WHERE id = video_record.id;
        END IF;
    END LOOP;
END $$;

-- Update posts to be tenant-aware  
DO $$
DECLARE
    post_record RECORD;
    v_tenant_id UUID;
BEGIN
    FOR post_record IN 
        SELECT p.id, p.collective_id, p.author_id 
        FROM posts p 
        WHERE p.tenant_id IS NULL 
    LOOP
        v_tenant_id := NULL;
        
        -- Try to find tenant for collective
        IF post_record.collective_id IS NOT NULL THEN
            -- For now, use author's personal tenant as fallback
            SELECT get_user_personal_tenant(post_record.author_id) INTO v_tenant_id;
        ELSE
            -- Use author's personal tenant
            SELECT get_user_personal_tenant(post_record.author_id) INTO v_tenant_id;
        END IF;
        
        -- Update the post with tenant_id
        IF v_tenant_id IS NOT NULL THEN
            UPDATE posts 
            SET tenant_id = v_tenant_id 
            WHERE id = post_record.id;
        END IF;
    END LOOP;
END $$;

-- Add comment count trigger for video_assets if missing
CREATE OR REPLACE FUNCTION increment_video_comment_count()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.entity_type = 'video' THEN
        UPDATE video_assets 
        SET comment_count = comment_count + 1
        WHERE id = NEW.entity_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION decrement_video_comment_count()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.entity_type = 'video' THEN
        UPDATE video_assets 
        SET comment_count = GREATEST(comment_count - 1, 0)
        WHERE id = OLD.entity_id;
    END IF;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for comment count maintenance
DROP TRIGGER IF EXISTS trigger_increment_video_comment ON comments;
CREATE TRIGGER trigger_increment_video_comment 
    AFTER INSERT ON comments
    FOR EACH ROW 
    EXECUTE FUNCTION increment_video_comment_count();

DROP TRIGGER IF EXISTS trigger_decrement_video_comment ON comments;
CREATE TRIGGER trigger_decrement_video_comment 
    AFTER DELETE ON comments
    FOR EACH ROW 
    EXECUTE FUNCTION decrement_video_comment_count();

-- Update RLS policies for tenant-scoped tables

-- Chains RLS policies update
DROP POLICY IF EXISTS read_chains ON chains;
CREATE POLICY read_chains ON chains
    FOR SELECT USING (
        -- Public chains in public tenants
        (visibility = 'public' AND EXISTS (
            SELECT 1 FROM tenants t 
            WHERE t.id = chains.tenant_id AND t.is_public = true
        ))
        OR 
        -- Follower-only chains where user follows author
        (visibility = 'followers' AND public.is_following(auth.uid(), author_id, 'user'))
        OR 
        -- User's own chains
        auth.uid() = author_id
        OR
        -- User has access to the tenant
        user_has_tenant_access(tenant_id)
    );

-- Video assets RLS policies
ALTER TABLE video_assets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public videos are viewable by everyone" ON video_assets;
CREATE POLICY "Public videos are viewable by everyone" ON video_assets
    FOR SELECT USING (
        is_public = true AND EXISTS (
            SELECT 1 FROM tenants t 
            WHERE t.id = video_assets.tenant_id AND t.is_public = true
        )
    );

DROP POLICY IF EXISTS "Tenant videos are viewable by tenant members" ON video_assets;
CREATE POLICY "Tenant videos are viewable by tenant members" ON video_assets
    FOR SELECT USING (
        user_has_tenant_access(tenant_id)
    );

DROP POLICY IF EXISTS "Private videos are viewable by owner only" ON video_assets;
CREATE POLICY "Private videos are viewable by owner only" ON video_assets
    FOR SELECT USING (
        created_by = auth.uid()
    );

-- Note: search_documents view update skipped to avoid column naming conflicts
-- This can be updated separately after the tenant infrastructure is in place

-- Comments
COMMENT ON COLUMN chains.tenant_id IS 'Tenant that owns this chain';
COMMENT ON COLUMN video_assets.tenant_id IS 'Tenant that owns this video asset';
COMMENT ON COLUMN posts.tenant_id IS 'Tenant that owns this post';
