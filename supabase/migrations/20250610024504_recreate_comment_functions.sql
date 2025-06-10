-- Recreate missing comment functions with clean names
-- All tables already have clean names (no _v2), so functions should match

-- 1. Create get_comment_thread function
CREATE OR REPLACE FUNCTION get_comment_thread(
    p_entity_type comment_entity_type,
    p_entity_id UUID,
    p_limit INTEGER DEFAULT 20,
    p_offset INTEGER DEFAULT 0
) RETURNS TABLE (
    comment_data JSONB
) AS $$
BEGIN
    RETURN QUERY
    WITH comment_reactions AS (
        -- Pre-aggregate reactions by comment
        SELECT 
            comment_id,
            json_agg(
                json_build_object(
                    'type', reaction_type,
                    'count', reaction_count
                )
            ) as reactions
        FROM (
            SELECT 
                comment_id,
                reaction_type,
                COUNT(*) as reaction_count
            FROM comment_reactions
            GROUP BY comment_id, reaction_type
        ) reaction_counts
        GROUP BY comment_id
    ),
    comment_tree AS (
        -- Base comments with user data
        SELECT 
            c.*,
            u.username,
            u.avatar_url,
            u.full_name,
            COALESCE(cr.reactions, '[]'::json) as reactions,
            -- Check if comment is pinned
            CASE WHEN cp.id IS NOT NULL THEN true ELSE false END as is_pinned,
            COALESCE(cp.pin_order, 999999) as pin_order
        FROM comments c
        JOIN users u ON c.user_id = u.id
        LEFT JOIN comment_reactions cr ON c.id = cr.comment_id
        LEFT JOIN comment_pins cp ON c.id = cp.comment_id AND cp.entity_type = p_entity_type AND cp.entity_id = p_entity_id
        WHERE c.entity_type = p_entity_type 
          AND c.entity_id = p_entity_id
          AND c.parent_id IS NULL
          AND c.deleted_at IS NULL
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

-- 2. Create get_comment_replies function
CREATE OR REPLACE FUNCTION get_comment_replies(
    p_parent_id UUID,
    p_limit INTEGER DEFAULT 10,
    p_offset INTEGER DEFAULT 0
) RETURNS TABLE (
    comment_data JSONB
) AS $$
BEGIN
    RETURN QUERY
    WITH reply_reactions AS (
        -- Pre-aggregate reactions by comment
        SELECT 
            comment_id,
            json_agg(
                json_build_object(
                    'type', reaction_type,
                    'count', reaction_count
                )
            ) as reactions
        FROM (
            SELECT 
                comment_id,
                reaction_type,
                COUNT(*) as reaction_count
            FROM comment_reactions
            GROUP BY comment_id, reaction_type
        ) reaction_counts
        GROUP BY comment_id
    ),
    reply_tree AS (
        SELECT 
            c.*,
            u.username,
            u.avatar_url,
            u.full_name,
            COALESCE(rr.reactions, '[]'::json) as reactions
        FROM comments c
        JOIN users u ON c.user_id = u.id
        LEFT JOIN reply_reactions rr ON c.id = rr.comment_id
        WHERE c.parent_id = p_parent_id
          AND c.deleted_at IS NULL
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

-- 3. Create add_comment function
CREATE OR REPLACE FUNCTION add_comment(
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
        SELECT COALESCE(c.thread_depth + 1, 1)
        INTO v_depth
        FROM comments c
        WHERE c.id = p_parent_id;
        
        -- Limit thread depth to prevent infinite nesting
        IF v_depth > 5 THEN
            RAISE EXCEPTION 'Maximum thread depth exceeded';
        END IF;
    END IF;
    
    -- Insert comment
    INSERT INTO comments (
        entity_type, entity_id, user_id, content, parent_id, thread_depth
    ) VALUES (
        p_entity_type, p_entity_id, p_user_id, p_content, p_parent_id, v_depth
    ) RETURNING id INTO v_comment_id;
    
    -- Update parent reply count
    IF p_parent_id IS NOT NULL THEN
        UPDATE comments 
        SET reply_count = reply_count + 1,
            updated_at = NOW()
        WHERE id = p_parent_id;
    END IF;
    
    RETURN QUERY SELECT v_comment_id, v_depth;
END;
$$ LANGUAGE plpgsql;

-- 4. Create toggle_comment_reaction function
CREATE OR REPLACE FUNCTION toggle_comment_reaction(
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
    FROM comment_reactions
    WHERE comment_id = p_comment_id 
      AND user_id = p_user_id 
      AND reaction_type = p_reaction_type;
    
    IF v_existing_reaction IS NOT NULL THEN
        -- Remove existing reaction
        DELETE FROM comment_reactions WHERE id = v_existing_reaction;
        v_action := 'removed';
    ELSE
        -- Add new reaction
        INSERT INTO comment_reactions (comment_id, user_id, reaction_type)
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
        FROM comment_reactions
        WHERE comment_id = p_comment_id
        GROUP BY reaction_type
    ) reaction_summary;
    
    RETURN QUERY SELECT v_action, COALESCE(v_counts, '[]'::JSONB);
END;
$$ LANGUAGE plpgsql;

-- 5. Create get_comment_count function
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

-- 6. Grant permissions on functions
GRANT ALL ON FUNCTION get_comment_thread(comment_entity_type, uuid, integer, integer) TO authenticated;
GRANT ALL ON FUNCTION get_comment_replies(uuid, integer, integer) TO authenticated;
GRANT ALL ON FUNCTION add_comment(comment_entity_type, uuid, uuid, text, uuid) TO authenticated;
GRANT ALL ON FUNCTION toggle_comment_reaction(uuid, uuid, reaction_type) TO authenticated;
GRANT ALL ON FUNCTION get_comment_count(comment_entity_type, uuid) TO authenticated;

-- Verify functions were created
DO $$
BEGIN
    RAISE NOTICE 'Functions created successfully';
    RAISE NOTICE 'get_comment_thread exists: %', EXISTS(SELECT 1 FROM pg_proc WHERE proname = 'get_comment_thread');
    RAISE NOTICE 'get_comment_replies exists: %', EXISTS(SELECT 1 FROM pg_proc WHERE proname = 'get_comment_replies');
    RAISE NOTICE 'add_comment exists: %', EXISTS(SELECT 1 FROM pg_proc WHERE proname = 'add_comment');
    RAISE NOTICE 'toggle_comment_reaction exists: %', EXISTS(SELECT 1 FROM pg_proc WHERE proname = 'toggle_comment_reaction');
    RAISE NOTICE 'get_comment_count exists: %', EXISTS(SELECT 1 FROM pg_proc WHERE proname = 'get_comment_count');
END $$;
