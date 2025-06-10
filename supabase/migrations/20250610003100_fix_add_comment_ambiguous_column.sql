-- Fix ambiguous column reference in add_comment_v2 function
-- Date: January 10, 2025

-- Drop and recreate add_comment_v2 with fixed column reference
DROP FUNCTION IF EXISTS add_comment_v2(comment_entity_type, UUID, UUID, TEXT, UUID);

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
        SELECT COALESCE(c.thread_depth + 1, 1)
        INTO v_depth
        FROM comments_v2 c
        WHERE c.id = p_parent_id;
        
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