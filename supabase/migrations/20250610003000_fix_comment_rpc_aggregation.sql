-- Fix nested aggregate function calls in comment RPC functions
-- Date: January 10, 2025

-- Drop and recreate get_comment_thread_v2 with fixed aggregation
DROP FUNCTION IF EXISTS get_comment_thread_v2(comment_entity_type, UUID, INTEGER, INTEGER);

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
            FROM comment_reactions_v2
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
        FROM comments_v2 c
        JOIN users u ON c.user_id = u.id
        LEFT JOIN comment_reactions cr ON c.id = cr.comment_id
        LEFT JOIN comment_pins_v2 cp ON c.id = cp.comment_id AND cp.entity_type = p_entity_type AND cp.entity_id = p_entity_id
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

-- Drop and recreate get_comment_replies_v2 with fixed aggregation
DROP FUNCTION IF EXISTS get_comment_replies_v2(UUID, INTEGER, INTEGER);

CREATE OR REPLACE FUNCTION get_comment_replies_v2(
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
            FROM comment_reactions_v2
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
        FROM comments_v2 c
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