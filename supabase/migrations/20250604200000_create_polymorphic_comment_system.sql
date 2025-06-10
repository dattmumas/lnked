-- Migration: Universal Polymorphic Comment System
-- Date: January 6, 2025
-- Description: Implements the universal comment system that supports any entity type
-- Phase: 1 - Database Schema Implementation

-- Create entity type enum for polymorphic comments
CREATE TYPE comment_entity_type AS ENUM (
    'video', 'post', 'collective', 'profile'
);

-- Create reaction type enum for comment reactions  
CREATE TYPE reaction_type AS ENUM (
    'like', 'heart', 'laugh', 'angry', 'sad', 'wow'
);

-- Create report status enum for comment moderation
CREATE TYPE report_status AS ENUM (
    'pending', 'reviewed', 'resolved', 'dismissed'
);

-- Core polymorphic comments table
CREATE TABLE comments_v2 (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type comment_entity_type NOT NULL,
    entity_id UUID NOT NULL,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    parent_id UUID REFERENCES comments_v2(id) ON DELETE CASCADE,
    thread_depth INTEGER DEFAULT 0,
    reply_count INTEGER DEFAULT 0,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ NULL,
    
    -- Ensure thread depth consistency
    CONSTRAINT valid_thread_depth CHECK (
        (parent_id IS NULL AND thread_depth = 0) OR
        (parent_id IS NOT NULL AND thread_depth > 0)
    ),
    
    -- Content length validation
    CONSTRAINT comment_content_length CHECK (char_length(content) <= 10000),
    
    -- Entity reference uniqueness for threading
    CONSTRAINT unique_entity_comment UNIQUE (entity_type, entity_id, id)
);

-- Comment reactions table (polymorphic reactions on comments)
CREATE TABLE comment_reactions_v2 (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    comment_id UUID NOT NULL REFERENCES comments_v2(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reaction_type reaction_type NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Prevent duplicate reactions (one reaction type per user per comment)
    UNIQUE(comment_id, user_id, reaction_type)
);

-- Comment reports for moderation
CREATE TABLE comment_reports_v2 (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    comment_id UUID NOT NULL REFERENCES comments_v2(id) ON DELETE CASCADE,
    reporter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reason TEXT NOT NULL,
    details TEXT,
    status report_status DEFAULT 'pending',
    moderator_id UUID REFERENCES users(id),
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Prevent duplicate reports from same user
    UNIQUE(comment_id, reporter_id)
);

-- Pinned comments by entity owners
CREATE TABLE comment_pins_v2 (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    comment_id UUID NOT NULL REFERENCES comments_v2(id) ON DELETE CASCADE,
    entity_type comment_entity_type NOT NULL,
    entity_id UUID NOT NULL,
    pinned_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    pin_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- One pin per comment per entity
    UNIQUE(entity_type, entity_id, comment_id)
);

-- Performance optimization indexes
CREATE INDEX idx_comments_v2_entity_created ON comments_v2(entity_type, entity_id, created_at DESC);
CREATE INDEX idx_comments_v2_parent_created ON comments_v2(parent_id, created_at) WHERE parent_id IS NOT NULL;
CREATE INDEX idx_comments_v2_user_created ON comments_v2(user_id, created_at DESC);
CREATE INDEX idx_comments_v2_thread_depth ON comments_v2(thread_depth) WHERE thread_depth > 0;
CREATE INDEX idx_comments_v2_deleted ON comments_v2(deleted_at) WHERE deleted_at IS NOT NULL;

-- Reaction aggregation indexes
CREATE INDEX idx_comment_reactions_v2_comment ON comment_reactions_v2(comment_id, reaction_type);
CREATE INDEX idx_comment_reactions_v2_user ON comment_reactions_v2(user_id, created_at DESC);

-- Moderation query indexes  
CREATE INDEX idx_comment_reports_v2_status ON comment_reports_v2(status, created_at) WHERE status != 'resolved';
CREATE INDEX idx_comment_reports_v2_comment ON comment_reports_v2(comment_id);

-- Pinned comments indexes
CREATE INDEX idx_comment_pins_v2_entity ON comment_pins_v2(entity_type, entity_id, pin_order);

-- RPC function: Get comment thread with reactions and user data
CREATE OR REPLACE FUNCTION get_comment_thread_v2(
    p_entity_type comment_entity_type,
    p_entity_id UUID,
    p_limit INTEGER DEFAULT 20,
    p_offset INTEGER DEFAULT 0
) RETURNS TABLE (
    comment_data JSONB
) AS $$
BEGIN
    RETURN QUERY
    WITH comment_tree AS (
        -- Base comments with user and reaction data
        SELECT 
            c.*,
            u.username,
            u.avatar_url,
            u.full_name,
            COALESCE(
                json_agg(
                    json_build_object(
                        'type', cr.reaction_type,
                        'count', COUNT(cr.id)
                    )
                ) FILTER (WHERE cr.id IS NOT NULL),
                '[]'::json
            ) as reactions,
            -- Check if comment is pinned
            CASE WHEN cp.id IS NOT NULL THEN true ELSE false END as is_pinned,
            COALESCE(cp.pin_order, 999999) as pin_order
        FROM comments_v2 c
        JOIN users u ON c.user_id = u.id
        LEFT JOIN comment_reactions_v2 cr ON c.id = cr.comment_id
        LEFT JOIN comment_pins_v2 cp ON c.id = cp.comment_id AND cp.entity_type = p_entity_type AND cp.entity_id = p_entity_id
        WHERE c.entity_type = p_entity_type 
          AND c.entity_id = p_entity_id
          AND c.parent_id IS NULL
          AND c.deleted_at IS NULL
        GROUP BY c.id, u.username, u.avatar_url, u.full_name, cp.id, cp.pin_order
        ORDER BY 
            -- Pinned comments first, then by creation date
            CASE WHEN cp.id IS NOT NULL THEN cp.pin_order ELSE 999999 END,
            c.created_at DESC
        LIMIT p_limit OFFSET p_offset
    )
    SELECT json_build_object(
        'id', ct.id,
        'content', ct.content,
        'user', json_build_object(
            'id', ct.user_id,
            'username', ct.username,
            'full_name', ct.full_name,
            'avatar_url', ct.avatar_url
        ),
        'reactions', ct.reactions,
        'reply_count', ct.reply_count,
        'thread_depth', ct.thread_depth,
        'is_pinned', ct.is_pinned,
        'created_at', ct.created_at,
        'updated_at', ct.updated_at
    )::JSONB
    FROM comment_tree ct;
END;
$$ LANGUAGE plpgsql STABLE;

-- RPC function: Get comment replies
CREATE OR REPLACE FUNCTION get_comment_replies_v2(
    p_parent_id UUID,
    p_limit INTEGER DEFAULT 10,
    p_offset INTEGER DEFAULT 0
) RETURNS TABLE (
    comment_data JSONB
) AS $$
BEGIN
    RETURN QUERY
    WITH reply_tree AS (
        SELECT 
            c.*,
            u.username,
            u.avatar_url,
            u.full_name,
            COALESCE(
                json_agg(
                    json_build_object(
                        'type', cr.reaction_type,
                        'count', COUNT(cr.id)
                    )
                ) FILTER (WHERE cr.id IS NOT NULL),
                '[]'::json
            ) as reactions
        FROM comments_v2 c
        JOIN users u ON c.user_id = u.id
        LEFT JOIN comment_reactions_v2 cr ON c.id = cr.comment_id
        WHERE c.parent_id = p_parent_id
          AND c.deleted_at IS NULL
        GROUP BY c.id, u.username, u.avatar_url, u.full_name
        ORDER BY c.created_at ASC
        LIMIT p_limit OFFSET p_offset
    )
    SELECT json_build_object(
        'id', rt.id,
        'content', rt.content,
        'user', json_build_object(
            'id', rt.user_id,
            'username', rt.username,
            'full_name', rt.full_name,
            'avatar_url', rt.avatar_url
        ),
        'reactions', rt.reactions,
        'reply_count', rt.reply_count,
        'thread_depth', rt.thread_depth,
        'parent_id', rt.parent_id,
        'created_at', rt.created_at,
        'updated_at', rt.updated_at
    )::JSONB
    FROM reply_tree rt;
END;
$$ LANGUAGE plpgsql STABLE;

-- RPC function: Add comment with thread depth calculation
CREATE OR REPLACE FUNCTION add_comment_v2(
    p_entity_type comment_entity_type,
    p_entity_id UUID,
    p_user_id UUID,
    p_content TEXT,
    p_parent_id UUID DEFAULT NULL
) RETURNS TABLE (
    comment_id UUID,
    thread_depth INTEGER
) AS $$
DECLARE
    v_depth INTEGER := 0;
    v_comment_id UUID;
BEGIN
    -- Calculate thread depth
    IF p_parent_id IS NOT NULL THEN
        SELECT COALESCE(thread_depth + 1, 1)
        INTO v_depth
        FROM comments_v2 
        WHERE id = p_parent_id;
        
        -- Limit thread depth to prevent infinite nesting
        IF v_depth > 5 THEN
            RAISE EXCEPTION 'Maximum thread depth exceeded';
        END IF;
    END IF;
    
    -- Insert comment
    INSERT INTO comments_v2 (
        entity_type, entity_id, user_id, content, parent_id, thread_depth
    ) VALUES (
        p_entity_type, p_entity_id, p_user_id, p_content, p_parent_id, v_depth
    ) RETURNING id INTO v_comment_id;
    
    -- Update parent reply count
    IF p_parent_id IS NOT NULL THEN
        UPDATE comments_v2 
        SET reply_count = reply_count + 1,
            updated_at = NOW()
        WHERE id = p_parent_id;
    END IF;
    
    RETURN QUERY SELECT v_comment_id, v_depth;
END;
$$ LANGUAGE plpgsql;

-- RPC function: Toggle comment reaction
CREATE OR REPLACE FUNCTION toggle_comment_reaction_v2(
    p_comment_id UUID,
    p_user_id UUID,
    p_reaction_type reaction_type
) RETURNS TABLE (
    action_taken TEXT,
    reaction_counts JSONB
) AS $$
DECLARE
    v_existing_reaction UUID;
    v_action TEXT;
    v_counts JSONB;
BEGIN
    -- Check for existing reaction
    SELECT id INTO v_existing_reaction
    FROM comment_reactions_v2
    WHERE comment_id = p_comment_id 
      AND user_id = p_user_id 
      AND reaction_type = p_reaction_type;
    
    IF v_existing_reaction IS NOT NULL THEN
        -- Remove existing reaction
        DELETE FROM comment_reactions_v2 WHERE id = v_existing_reaction;
        v_action := 'removed';
    ELSE
        -- Add new reaction
        INSERT INTO comment_reactions_v2 (comment_id, user_id, reaction_type)
        VALUES (p_comment_id, p_user_id, p_reaction_type);
        v_action := 'added';
    END IF;
    
    -- Get updated reaction counts
    SELECT json_agg(
        json_build_object(
            'type', reaction_type,
            'count', count
        )
    ) INTO v_counts
    FROM (
        SELECT reaction_type, COUNT(*) as count
        FROM comment_reactions_v2
        WHERE comment_id = p_comment_id
        GROUP BY reaction_type
    ) reaction_summary;
    
    RETURN QUERY SELECT v_action, COALESCE(v_counts, '[]'::JSONB);
END;
$$ LANGUAGE plpgsql;

-- RPC function: Get comment count for entity
CREATE OR REPLACE FUNCTION get_comment_count_v2(
    p_entity_type comment_entity_type,
    p_entity_id UUID
) RETURNS INTEGER AS $$
BEGIN
    RETURN (
        SELECT COUNT(*)::INTEGER
        FROM comments_v2
        WHERE entity_type = p_entity_type
          AND entity_id = p_entity_id
          AND deleted_at IS NULL
    );
END;
$$ LANGUAGE plpgsql STABLE;

-- Trigger: Update reply count when comment is deleted
CREATE OR REPLACE FUNCTION update_reply_count_on_delete_v2() RETURNS TRIGGER AS $$
BEGIN
    IF OLD.parent_id IS NOT NULL THEN
        UPDATE comments_v2 
        SET reply_count = reply_count - 1,
            updated_at = NOW()
        WHERE id = OLD.parent_id;
    END IF;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_reply_count_on_delete_v2
    AFTER DELETE ON comments_v2
    FOR EACH ROW
    EXECUTE FUNCTION update_reply_count_on_delete_v2();

-- Trigger: Update timestamps
CREATE OR REPLACE FUNCTION update_comment_timestamp_v2() RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_comment_timestamp_v2
    BEFORE UPDATE ON comments_v2
    FOR EACH ROW
    EXECUTE FUNCTION update_comment_timestamp_v2();

-- Comments on tables for documentation
COMMENT ON TABLE comments_v2 IS 'Universal polymorphic comment system supporting any entity type';
COMMENT ON COLUMN comments_v2.entity_type IS 'Type of entity this comment belongs to (video, post, collective, profile)';
COMMENT ON COLUMN comments_v2.entity_id IS 'ID of the entity this comment belongs to';
COMMENT ON COLUMN comments_v2.thread_depth IS 'Depth in the comment thread (0 = top level, 1+ = reply)';
COMMENT ON COLUMN comments_v2.reply_count IS 'Cached count of direct replies to this comment';
COMMENT ON COLUMN comments_v2.metadata IS 'Additional comment metadata (mentions, formatting, etc.)';

COMMENT ON TABLE comment_reactions_v2 IS 'Reactions (like, heart, etc.) on comments';
COMMENT ON TABLE comment_reports_v2 IS 'User reports for content moderation';
COMMENT ON TABLE comment_pins_v2 IS 'Comments pinned by entity owners';

-- Row Level Security policies (commented out for now, will be enabled during migration)
-- ALTER TABLE comments_v2 ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE comment_reactions_v2 ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE comment_reports_v2 ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE comment_pins_v2 ENABLE ROW LEVEL SECURITY; 