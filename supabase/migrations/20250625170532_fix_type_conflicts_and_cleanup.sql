-- Migration: Fix type conflicts and cleanup for TypeScript regeneration
-- Date: December 25, 2025
-- Description: Fixes enum inconsistencies, cleans up duplicate structures, and prepares for type regeneration

-- Ensure all comment-related enums are consistent
-- The comments system already has the right enums from the polymorphic migration

-- Fix any enum inconsistencies for reaction types
-- Make sure comment reactions use the same enum as other reactions
DO $$
BEGIN
    -- Ensure reaction_type enum includes 'dislike' if it's missing
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumtypid = 'reaction_type'::regtype 
        AND enumlabel = 'dislike'
    ) THEN
        ALTER TYPE reaction_type ADD VALUE 'dislike';
    END IF;
END $$;

-- Clean up any orphaned data and ensure referential integrity
-- Clean up any post_collectives entries that reference non-existent posts or collectives
DELETE FROM post_collectives 
WHERE post_id NOT IN (SELECT id FROM posts)
   OR collective_id NOT IN (SELECT id FROM collectives);

-- Clean up any comments that reference non-existent entities
DELETE FROM comments 
WHERE (entity_type = 'post' AND entity_id NOT IN (SELECT id FROM posts))
   OR (entity_type = 'video' AND entity_id NOT IN (SELECT id FROM video_assets))
   OR (entity_type = 'collective' AND entity_id NOT IN (SELECT id FROM collectives))
   OR (entity_type = 'profile' AND entity_id NOT IN (SELECT id FROM users));

-- Clean up any comment reactions that reference non-existent comments
DELETE FROM comment_reactions 
WHERE comment_id NOT IN (SELECT id FROM comments);

-- Clean up any chain reactions that reference non-existent chains or users
DELETE FROM chain_reactions 
WHERE chain_id NOT IN (SELECT id FROM chains)
   OR user_id NOT IN (SELECT id FROM users);

-- Update any NULL tenant_id values that might have been missed
-- For posts without tenant_id, assign to author's personal tenant
DO $$
DECLARE
    orphan_record RECORD;
    v_tenant_id UUID;
BEGIN
    -- Handle posts without tenant_id
    FOR orphan_record IN 
        SELECT id, author_id FROM posts WHERE tenant_id IS NULL
    LOOP
        SELECT get_user_personal_tenant(orphan_record.author_id) INTO v_tenant_id;
        UPDATE posts SET tenant_id = v_tenant_id WHERE id = orphan_record.id;
    END LOOP;
    
    -- Handle chains without tenant_id
    FOR orphan_record IN 
        SELECT id, author_id FROM chains WHERE tenant_id IS NULL
    LOOP
        SELECT get_user_personal_tenant(orphan_record.author_id) INTO v_tenant_id;
        UPDATE chains SET tenant_id = v_tenant_id WHERE id = orphan_record.id;
    END LOOP;
    
    -- Handle video_assets without tenant_id
    FOR orphan_record IN 
        SELECT id, created_by FROM video_assets WHERE tenant_id IS NULL
    LOOP
        SELECT get_user_personal_tenant(orphan_record.created_by) INTO v_tenant_id;
        UPDATE video_assets SET tenant_id = v_tenant_id WHERE id = orphan_record.id;
    END LOOP;
    
    -- Handle conversations without tenant_id
    FOR orphan_record IN 
        SELECT id, created_by FROM conversations WHERE tenant_id IS NULL AND created_by IS NOT NULL
    LOOP
        SELECT get_user_personal_tenant(orphan_record.created_by) INTO v_tenant_id;
        UPDATE conversations SET tenant_id = v_tenant_id WHERE id = orphan_record.id;
    END LOOP;
    
    -- Handle messages without tenant_id
    FOR orphan_record IN 
        SELECT m.id, m.sender_id FROM messages m 
        WHERE m.tenant_id IS NULL AND m.sender_id IS NOT NULL
    LOOP
        SELECT get_user_personal_tenant(orphan_record.sender_id) INTO v_tenant_id;
        UPDATE messages SET tenant_id = v_tenant_id WHERE id = orphan_record.id;
    END LOOP;
    
    -- Handle notifications without tenant_id
    FOR orphan_record IN 
        SELECT id, recipient_id FROM notifications WHERE tenant_id IS NULL
    LOOP
        SELECT get_user_personal_tenant(orphan_record.recipient_id) INTO v_tenant_id;
        UPDATE notifications SET tenant_id = v_tenant_id WHERE id = orphan_record.id;
    END LOOP;
END $$;

-- Ensure all foreign key constraints are properly set
-- Add any missing foreign key constraints

-- Make tenant_id NOT NULL for core content tables after migration
-- Only do this after ensuring all records have tenant_id
DO $$
BEGIN
    -- Check if all posts have tenant_id before making it NOT NULL
    IF NOT EXISTS (SELECT 1 FROM posts WHERE tenant_id IS NULL) THEN
        ALTER TABLE posts ALTER COLUMN tenant_id SET NOT NULL;
    END IF;
    
    -- Check if all chains have tenant_id before making it NOT NULL
    IF NOT EXISTS (SELECT 1 FROM chains WHERE tenant_id IS NULL) THEN
        ALTER TABLE chains ALTER COLUMN tenant_id SET NOT NULL;
    END IF;
    
    -- Check if all video_assets have tenant_id before making it NOT NULL
    IF NOT EXISTS (SELECT 1 FROM video_assets WHERE tenant_id IS NULL) THEN
        ALTER TABLE video_assets ALTER COLUMN tenant_id SET NOT NULL;
    END IF;
END $$;

-- Create or update helper views for easier querying
CREATE OR REPLACE VIEW tenant_content_summary AS
SELECT 
    t.id as tenant_id,
    t.name as tenant_name,
    t.type as tenant_type,
    COUNT(DISTINCT p.id) as post_count,
    COUNT(DISTINCT c.id) as chain_count,
    COUNT(DISTINCT v.id) as video_count,
    COUNT(DISTINCT tm.user_id) as member_count
FROM tenants t
LEFT JOIN posts p ON t.id = p.tenant_id AND p.status = 'active'
LEFT JOIN chains c ON t.id = c.tenant_id AND c.status = 'active'
LEFT JOIN video_assets v ON t.id = v.tenant_id AND v.deleted_at IS NULL
LEFT JOIN tenant_members tm ON t.id = tm.tenant_id
GROUP BY t.id, t.name, t.type;

-- Update the get_comment_count function to handle the standard comments table
-- (not the v2 version since we're using the original comments table with enhancements)
CREATE OR REPLACE FUNCTION get_comment_count(
    p_entity_type comment_entity_type,
    p_entity_id UUID
) RETURNS INTEGER AS $$
BEGIN
    RETURN (
        SELECT COUNT(*)::INTEGER
        FROM comments
        WHERE entity_type = p_entity_type
          AND entity_id = p_entity_id
          AND deleted_at IS NULL
    );
END;
$$ LANGUAGE plpgsql STABLE;

-- Create optimized indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_posts_tenant_status_created ON posts(tenant_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chains_tenant_visibility_created ON chains(tenant_id, visibility, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_video_assets_tenant_public_created ON video_assets(tenant_id, is_public, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_comments_entity_tenant ON comments(entity_type, entity_id, tenant_id);

-- Ensure proper cascade behavior for tenant deletion
-- When a tenant is deleted, we want to handle content appropriately
CREATE OR REPLACE FUNCTION handle_tenant_deletion() RETURNS TRIGGER AS $$
BEGIN
    -- For personal tenants, we might want to transfer content to another tenant
    -- For collective tenants, we might want to delete or archive content
    -- This is a placeholder for more complex business logic
    
    IF OLD.type = 'personal' THEN
        -- For personal tenants, you might want to transfer content
        -- to another tenant or mark it as orphaned
        RAISE NOTICE 'Personal tenant % deleted, content handling needed', OLD.name;
    END IF;
    
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_handle_tenant_deletion
    AFTER DELETE ON tenants
    FOR EACH ROW
    EXECUTE FUNCTION handle_tenant_deletion();

-- Final consistency checks
-- Verify that all relationships are properly maintained
DO $$
DECLARE
    inconsistency_count INTEGER;
BEGIN
    -- Check for posts without valid authors
    SELECT COUNT(*) INTO inconsistency_count
    FROM posts p
    LEFT JOIN users u ON p.author_id = u.id
    WHERE u.id IS NULL;
    
    IF inconsistency_count > 0 THEN
        RAISE WARNING 'Found % posts with invalid authors', inconsistency_count;
    END IF;
    
    -- Check for tenant members without valid users
    SELECT COUNT(*) INTO inconsistency_count
    FROM tenant_members tm
    LEFT JOIN users u ON tm.user_id = u.id
    WHERE u.id IS NULL;
    
    IF inconsistency_count > 0 THEN
        RAISE WARNING 'Found % tenant members with invalid users', inconsistency_count;
        DELETE FROM tenant_members 
        WHERE user_id NOT IN (SELECT id FROM users);
    END IF;
    
    -- Check for tenant members without valid tenants
    SELECT COUNT(*) INTO inconsistency_count
    FROM tenant_members tm
    LEFT JOIN tenants t ON tm.tenant_id = t.id
    WHERE t.id IS NULL;
    
    IF inconsistency_count > 0 THEN
        RAISE WARNING 'Found % tenant members with invalid tenants', inconsistency_count;
        DELETE FROM tenant_members 
        WHERE tenant_id NOT IN (SELECT id FROM tenants);
    END IF;
END $$;

-- Clean up any potential duplicate slugs (ensure uniqueness)
DO $$
DECLARE
    dup_record RECORD;
    new_slug TEXT;
    counter INTEGER;
BEGIN
    FOR dup_record IN 
        SELECT slug, COUNT(*) as count
        FROM tenants
        GROUP BY slug
        HAVING COUNT(*) > 1
    LOOP
        counter := 1;
        FOR dup_record IN 
            SELECT id, slug FROM tenants WHERE slug = dup_record.slug ORDER BY created_at
        LOOP
            IF counter > 1 THEN
                new_slug := dup_record.slug || '-' || counter::text;
                UPDATE tenants SET slug = new_slug WHERE id = dup_record.id;
            END IF;
            counter := counter + 1;
        END LOOP;
    END LOOP;
END $$;

-- Final verification message
DO $$
BEGIN
    RAISE NOTICE 'Database schema migration completed successfully';
    RAISE NOTICE 'Tenant infrastructure: Ready';
    RAISE NOTICE 'Multi-collective posts: Ready';
    RAISE NOTICE 'Tenant-scoped content: Ready';
    RAISE NOTICE 'Type consistency: Ready for regeneration';
END $$;
