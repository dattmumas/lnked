-- Migration: Fix ambiguous is_pinned column reference in get_comment_thread
-- Date: January 16, 2025
-- Description: Replace c.* with explicit column selection to avoid ambiguous is_pinned reference

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
        SELECT 
            -- Explicitly select columns instead of c.* to avoid ambiguity
            c.id,
            c.entity_type,
            c.entity_id,
            c.author_id,
            c.content,
            c.parent_id,
            c.thread_depth,
            c.reply_count,
            c.created_at,
            c.updated_at,
            c.deleted_at,
            -- User fields
            u.username,
            u.avatar_url,
            u.full_name,
            -- Computed fields
            COALESCE(cr.reactions, '[]'::json) as reactions,
            CASE WHEN cp.id IS NOT NULL THEN true ELSE false END as is_pinned,
            COALESCE(cp.pin_order, 999999) as pin_order
        FROM comments c
        JOIN users u ON c.author_id = u.id
        LEFT JOIN comment_reactions cr ON c.id = cr.comment_id
        LEFT JOIN comment_pins cp ON c.id = cp.comment_id AND cp.entity_type = p_entity_type AND cp.entity_id = p_entity_id
        WHERE c.entity_type = p_entity_type 
          AND c.entity_id = p_entity_id
          AND c.parent_id IS NULL
          AND c.deleted_at IS NULL
        ORDER BY 
            CASE WHEN cp.id IS NOT NULL THEN cp.pin_order ELSE 999999 END,
            c.created_at DESC
        LIMIT p_limit OFFSET p_offset
    )
    SELECT json_build_object(
        'id', ct.id,
        'content', ct.content,
        'author', json_build_object(
            'id', ct.author_id,
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

-- Grant permissions
GRANT ALL ON FUNCTION get_comment_thread(comment_entity_type, uuid, integer, integer) TO authenticated;
