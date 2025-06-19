-- Migration: Align comments table with repository schema
-- Date: January 15, 2025
-- Description: Updates comments table to match repository expectations:
-- 1. Rename user_id to author_id
-- 2. Add missing is_pinned column
-- 3. Update all related functions and foreign keys

-- Step 1: Add the missing is_pinned column to comments table
ALTER TABLE public.comments 
ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT FALSE;

-- Step 2: Rename user_id to author_id in comments table
DO $$
BEGIN
    -- Check if user_id column exists before renaming
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'comments' 
        AND column_name = 'user_id'
    ) THEN
        -- Rename the column
        ALTER TABLE public.comments RENAME COLUMN user_id TO author_id;
        
        -- Update the foreign key constraint name for clarity
        ALTER TABLE public.comments 
        DROP CONSTRAINT IF EXISTS comments_v2_user_id_fkey,
        ADD CONSTRAINT comments_author_id_fkey 
        FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Step 3: Update comment_reactions table foreign key naming for consistency
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'comment_reactions_v2_user_id_fkey'
        AND table_name = 'comment_reactions'
    ) THEN
        ALTER TABLE public.comment_reactions 
        DROP CONSTRAINT comment_reactions_v2_user_id_fkey,
        ADD CONSTRAINT comment_reactions_user_id_fkey 
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Step 4: Update comment_reports table foreign key naming for consistency  
DO $$
BEGIN
    -- Update reporter_id constraint
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'comment_reports_v2_reporter_id_fkey'
        AND table_name = 'comment_reports'
    ) THEN
        ALTER TABLE public.comment_reports 
        DROP CONSTRAINT comment_reports_v2_reporter_id_fkey,
        ADD CONSTRAINT comment_reports_reporter_id_fkey 
        FOREIGN KEY (reporter_id) REFERENCES users(id) ON DELETE CASCADE;
    END IF;
    
    -- Update moderator_id constraint
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'comment_reports_v2_moderator_id_fkey'
        AND table_name = 'comment_reports'
    ) THEN
        ALTER TABLE public.comment_reports 
        DROP CONSTRAINT comment_reports_v2_moderator_id_fkey,
        ADD CONSTRAINT comment_reports_moderator_id_fkey 
        FOREIGN KEY (moderator_id) REFERENCES users(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Step 5: Update comment_pins table foreign key naming for consistency
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'comment_pins_v2_pinned_by_fkey'
        AND table_name = 'comment_pins'
    ) THEN
        ALTER TABLE public.comment_pins 
        DROP CONSTRAINT comment_pins_v2_pinned_by_fkey,
        ADD CONSTRAINT comment_pins_pinned_by_fkey 
        FOREIGN KEY (pinned_by) REFERENCES users(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Step 6: Update all functions to use author_id instead of user_id

-- Update get_comment_thread function
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
            c.*,
            u.username,
            u.avatar_url,
            u.full_name,
            COALESCE(cr.reactions, '[]'::json) as reactions,
            CASE WHEN cp.id IS NOT NULL THEN true ELSE false END as is_pinned,
            COALESCE(cp.pin_order, 999999) as pin_order
        FROM comments c
        JOIN users u ON c.author_id = u.id  -- Updated to use author_id
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
        'author', json_build_object(  -- Updated key name to match repository expectation
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

-- Update get_comment_replies function  
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
        JOIN users u ON c.author_id = u.id  -- Updated to use author_id
        LEFT JOIN reply_reactions rr ON c.id = rr.comment_id
        WHERE c.parent_id = p_parent_id
          AND c.deleted_at IS NULL
        ORDER BY c.created_at ASC
        LIMIT p_limit OFFSET p_offset
    )
    SELECT json_build_object(
        'id', rt.id,
        'content', rt.content,
        'author', json_build_object(  -- Updated key name to match repository expectation
            'id', rt.author_id,
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

-- Update add_comment function
CREATE OR REPLACE FUNCTION add_comment(
    p_entity_type comment_entity_type,
    p_entity_id UUID,
    p_author_id UUID,  -- Updated parameter name
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
    IF p_parent_id IS NOT NULL THEN
        SELECT COALESCE(c.thread_depth + 1, 1)
        INTO v_depth
        FROM comments c
        WHERE c.id = p_parent_id;
        
        IF v_depth > 5 THEN
            RAISE EXCEPTION 'Maximum thread depth exceeded';
        END IF;
    END IF;
    
    INSERT INTO comments (
        entity_type, entity_id, author_id, content, parent_id, thread_depth  -- Updated to use author_id
    ) VALUES (
        p_entity_type, p_entity_id, p_author_id, p_content, p_parent_id, v_depth
    ) RETURNING id INTO v_comment_id;
    
    IF p_parent_id IS NOT NULL THEN
        UPDATE comments 
        SET reply_count = reply_count + 1,
            updated_at = NOW()
        WHERE id = p_parent_id;
    END IF;
    
    RETURN QUERY SELECT v_comment_id, v_depth;
END;
$$ LANGUAGE plpgsql;

-- Step 7: Update indexes to use author_id
DROP INDEX IF EXISTS idx_comments_user_created;
CREATE INDEX IF NOT EXISTS idx_comments_author_created ON public.comments(author_id, created_at DESC);

-- Step 8: Grant permissions on updated functions
GRANT ALL ON FUNCTION get_comment_thread(comment_entity_type, uuid, integer, integer) TO authenticated;
GRANT ALL ON FUNCTION get_comment_replies(uuid, integer, integer) TO authenticated;
GRANT ALL ON FUNCTION add_comment(comment_entity_type, uuid, uuid, text, uuid) TO authenticated;

-- Step 9: Add comments for documentation
COMMENT ON COLUMN public.comments.author_id IS 'ID of the user who authored this comment (renamed from user_id for repository compatibility)';
COMMENT ON COLUMN public.comments.is_pinned IS 'Whether this comment is pinned by the entity owner (for repository compatibility)';

-- Verification: Check that the migration completed successfully
DO $$
BEGIN
    RAISE NOTICE 'Migration completed successfully!';
    RAISE NOTICE 'Comments table now has author_id column: %', 
        EXISTS(SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'comments' AND column_name = 'author_id');
    RAISE NOTICE 'Comments table now has is_pinned column: %', 
        EXISTS(SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'comments' AND column_name = 'is_pinned');
END $$; 