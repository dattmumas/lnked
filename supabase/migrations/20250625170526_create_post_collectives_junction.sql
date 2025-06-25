-- Migration: Create post-collectives junction table for many-to-many relationships
-- Date: December 25, 2025
-- Description: Implements many-to-many relationship between posts and collectives

-- Check if post_collectives table already exists from earlier schema
-- If it exists but is incomplete, we'll enhance it
DO $$
BEGIN
    -- Check if table exists but without proper structure
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'post_collectives') THEN
        -- Add missing columns if they don't exist
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'post_collectives' AND column_name = 'shared_by'
        ) THEN
            ALTER TABLE post_collectives 
            ADD COLUMN shared_by UUID REFERENCES users(id) ON DELETE SET NULL;
        END IF;
        
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'post_collectives' AND column_name = 'shared_at'
        ) THEN
            ALTER TABLE post_collectives 
            ADD COLUMN shared_at TIMESTAMPTZ DEFAULT NOW();
        END IF;
        
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'post_collectives' AND column_name = 'status'
        ) THEN
            ALTER TABLE post_collectives 
            ADD COLUMN status TEXT DEFAULT 'active';
        END IF;
        
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'post_collectives' AND column_name = 'display_order'
        ) THEN
            ALTER TABLE post_collectives 
            ADD COLUMN display_order INTEGER;
        END IF;
    ELSE
        -- Create the table from scratch
        CREATE TABLE post_collectives (
            post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
            collective_id UUID REFERENCES collectives(id) ON DELETE CASCADE,
            shared_by UUID REFERENCES users(id) ON DELETE SET NULL,
            shared_at TIMESTAMPTZ DEFAULT NOW(),
            status TEXT DEFAULT 'active',
            display_order INTEGER,
            metadata JSONB DEFAULT '{}',
            
            PRIMARY KEY (post_id, collective_id)
        );
    END IF;
END $$;

-- Create indexes for performance if they don't exist
CREATE INDEX IF NOT EXISTS idx_post_collectives_post ON post_collectives(post_id);
CREATE INDEX IF NOT EXISTS idx_post_collectives_collective ON post_collectives(collective_id);
CREATE INDEX IF NOT EXISTS idx_post_collectives_shared_by ON post_collectives(shared_by);
CREATE INDEX IF NOT EXISTS idx_post_collectives_shared_at ON post_collectives(shared_at DESC);
CREATE INDEX IF NOT EXISTS idx_post_collectives_status ON post_collectives(status);

-- Add check constraint for status
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.check_constraints 
        WHERE constraint_name = 'valid_post_collective_status'
    ) THEN
        ALTER TABLE post_collectives 
        ADD CONSTRAINT valid_post_collective_status 
        CHECK (status IN ('active', 'removed', 'pending'));
    END IF;
END $$;

-- Migrate existing post-collective relationships from posts.collective_id
DO $$
DECLARE
    post_record RECORD;
BEGIN
    -- Migrate existing single collective relationships to junction table
    FOR post_record IN 
        SELECT p.id as post_id, p.collective_id, p.author_id, p.created_at
        FROM posts p 
        WHERE p.collective_id IS NOT NULL
        AND NOT EXISTS (
            SELECT 1 FROM post_collectives pc 
            WHERE pc.post_id = p.id AND pc.collective_id = p.collective_id
        )
    LOOP
        INSERT INTO post_collectives (post_id, collective_id, shared_by, shared_at, status)
        VALUES (
            post_record.post_id, 
            post_record.collective_id, 
            post_record.author_id, 
            post_record.created_at,
            'active'
        )
        ON CONFLICT (post_id, collective_id) DO NOTHING;
    END LOOP;
END $$;

-- Create RPC function to add post to collective
CREATE OR REPLACE FUNCTION add_post_to_collective(
    p_post_id UUID,
    p_collective_id UUID,
    p_display_order INTEGER DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    v_user_id UUID;
    v_post_author UUID;
    v_is_collective_member BOOLEAN;
BEGIN
    v_user_id := auth.uid();
    
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'User not authenticated';
    END IF;
    
    -- Get post author
    SELECT author_id INTO v_post_author
    FROM posts
    WHERE id = p_post_id;
    
    -- Check if user can share this post (author or collective member with permission)
    IF v_user_id != v_post_author THEN
        -- Check if user is a member of the target collective with editor+ permissions
        SELECT EXISTS (
            SELECT 1 FROM collective_members cm
            WHERE cm.collective_id = p_collective_id
              AND cm.member_id = v_user_id
              AND cm.member_type = 'user'
              AND cm.role IN ('admin', 'editor', 'owner')
        ) INTO v_is_collective_member;
        
        IF NOT v_is_collective_member THEN
            RAISE EXCEPTION 'Insufficient permissions to share post to this collective';
        END IF;
    END IF;
    
    -- Insert or update the relationship
    INSERT INTO post_collectives (post_id, collective_id, shared_by, display_order)
    VALUES (p_post_id, p_collective_id, v_user_id, p_display_order)
    ON CONFLICT (post_id, collective_id) 
    DO UPDATE SET 
        shared_by = v_user_id,
        shared_at = NOW(),
        status = 'active',
        display_order = COALESCE(p_display_order, post_collectives.display_order);
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create RPC function to remove post from collective
CREATE OR REPLACE FUNCTION remove_post_from_collective(
    p_post_id UUID,
    p_collective_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
    v_user_id UUID;
    v_post_author UUID;
    v_shared_by UUID;
    v_is_collective_admin BOOLEAN;
BEGIN
    v_user_id := auth.uid();
    
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'User not authenticated';
    END IF;
    
    -- Get post author and who shared it
    SELECT p.author_id, pc.shared_by 
    INTO v_post_author, v_shared_by
    FROM posts p
    JOIN post_collectives pc ON p.id = pc.post_id
    WHERE p.id = p_post_id AND pc.collective_id = p_collective_id;
    
    -- Check permissions: post author, person who shared it, or collective admin
    IF v_user_id = v_post_author OR v_user_id = v_shared_by THEN
        -- Author or sharer can remove
        DELETE FROM post_collectives 
        WHERE post_id = p_post_id AND collective_id = p_collective_id;
        RETURN TRUE;
    END IF;
    
    -- Check if user is collective admin
    SELECT EXISTS (
        SELECT 1 FROM collective_members cm
        WHERE cm.collective_id = p_collective_id
          AND cm.member_id = v_user_id
          AND cm.member_type = 'user'
          AND cm.role IN ('admin', 'owner')
    ) INTO v_is_collective_admin;
    
    IF v_is_collective_admin THEN
        DELETE FROM post_collectives 
        WHERE post_id = p_post_id AND collective_id = p_collective_id;
        RETURN TRUE;
    END IF;
    
    RAISE EXCEPTION 'Insufficient permissions to remove post from collective';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create RPC function to get posts for a collective
CREATE OR REPLACE FUNCTION get_collective_posts(
    p_collective_id UUID,
    p_limit INTEGER DEFAULT 20,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    post_id UUID,
    title TEXT,
    content TEXT,
    author_id UUID,
    author_name TEXT,
    author_username TEXT,
    shared_by UUID,
    shared_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ,
    like_count BIGINT,
    display_order INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.title,
        p.content,
        p.author_id,
        au.full_name,
        au.username,
        pc.shared_by,
        pc.shared_at,
        p.created_at,
        COALESCE(p.like_count, 0) as like_count,
        pc.display_order
    FROM posts p
    JOIN post_collectives pc ON p.id = pc.post_id
    LEFT JOIN users au ON p.author_id = au.id
    WHERE pc.collective_id = p_collective_id
      AND pc.status = 'active'
      AND p.status = 'active'
    ORDER BY 
        COALESCE(pc.display_order, 999999),
        pc.shared_at DESC
    LIMIT p_limit OFFSET p_offset;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Create RPC function to get collectives for a post
CREATE OR REPLACE FUNCTION get_post_collectives(p_post_id UUID)
RETURNS TABLE (
    collective_id UUID,
    collective_name TEXT,
    collective_slug TEXT,
    shared_by UUID,
    shared_at TIMESTAMPTZ,
    display_order INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.id,
        c.name,
        c.slug,
        pc.shared_by,
        pc.shared_at,
        pc.display_order
    FROM collectives c
    JOIN post_collectives pc ON c.id = pc.collective_id
    WHERE pc.post_id = p_post_id
      AND pc.status = 'active'
    ORDER BY pc.shared_at DESC;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Enable RLS on post_collectives
ALTER TABLE post_collectives ENABLE ROW LEVEL SECURITY;

-- RLS policies for post_collectives
CREATE POLICY "Users can view post-collective relationships they have access to" 
ON post_collectives FOR SELECT USING (
    -- Can see if they have access to the post
    EXISTS (
        SELECT 1 FROM posts p 
        WHERE p.id = post_collectives.post_id 
        AND (p.is_public = true OR p.author_id = auth.uid())
    )
    OR
    -- Can see if they're a member of the collective
    EXISTS (
        SELECT 1 FROM collective_members cm
        WHERE cm.collective_id = post_collectives.collective_id
        AND cm.member_id = auth.uid()
        AND cm.member_type = 'user'
    )
);

CREATE POLICY "Users can manage post-collective relationships with permission"
ON post_collectives FOR ALL USING (
    -- Post author can manage their post's collective relationships
    EXISTS (
        SELECT 1 FROM posts p 
        WHERE p.id = post_collectives.post_id 
        AND p.author_id = auth.uid()
    )
    OR
    -- Collective admins can manage relationships in their collective
    EXISTS (
        SELECT 1 FROM collective_members cm
        WHERE cm.collective_id = post_collectives.collective_id
        AND cm.member_id = auth.uid()
        AND cm.member_type = 'user'
        AND cm.role IN ('admin', 'owner', 'editor')
    )
);

-- Comments
COMMENT ON TABLE post_collectives IS 'Junction table for many-to-many relationship between posts and collectives';
COMMENT ON COLUMN post_collectives.shared_by IS 'User who shared the post to the collective';
COMMENT ON COLUMN post_collectives.shared_at IS 'When the post was shared to the collective';
COMMENT ON COLUMN post_collectives.status IS 'Status of the post in the collective (active, removed, pending)';
COMMENT ON COLUMN post_collectives.display_order IS 'Optional ordering for posts within a collective';
COMMENT ON COLUMN post_collectives.metadata IS 'Additional metadata about the post-collective relationship';
