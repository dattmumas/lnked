-- Database Naming Convention Cleanup Migration
-- This migration standardizes table names and removes versioned tables
-- Run this after ensuring all application code uses the new table names

BEGIN;

-- ============================================================================
-- STEP 1: Rename versioned tables to clean names
-- ============================================================================

-- Rename comments_v2 to comments (drop old comments table first)
DROP TABLE IF EXISTS public.comments CASCADE;
ALTER TABLE public.comments_v2 RENAME TO comments;

-- Rename comment_reactions_v2 to comment_reactions (drop old table first)  
DROP TABLE IF EXISTS public.comment_reactions CASCADE;
ALTER TABLE public.comment_reactions_v2 RENAME TO comment_reactions;

-- Rename comment_reports_v2 to comment_reports
ALTER TABLE public.comment_reports_v2 RENAME TO comment_reports;

-- Rename comment_pins_v2 to comment_pins
ALTER TABLE public.comment_pins_v2 RENAME TO comment_pins;

-- ============================================================================
-- STEP 2: Update function names to remove v2 suffix
-- ============================================================================

-- Rename comment-related functions
DROP FUNCTION IF EXISTS public.get_comment_thread_v2(comment_entity_type, uuid, integer, integer);
DROP FUNCTION IF EXISTS public.get_comment_replies_v2(uuid, integer, integer);
DROP FUNCTION IF EXISTS public.get_comment_count_v2(comment_entity_type, uuid);
DROP FUNCTION IF EXISTS public.add_comment_v2(comment_entity_type, uuid, uuid, text, uuid);
DROP FUNCTION IF EXISTS public.toggle_comment_reaction_v2(uuid, uuid, reaction_type);
DROP FUNCTION IF EXISTS public.update_comment_timestamp_v2();
DROP FUNCTION IF EXISTS public.update_reply_count_on_delete_v2();

-- Recreate functions with clean names
CREATE OR REPLACE FUNCTION get_comment_thread(
    p_entity_type comment_entity_type,
    p_entity_id UUID,
    p_limit INTEGER DEFAULT 20,
    p_offset INTEGER DEFAULT 0
) RETURNS TABLE (comment_data JSONB) AS $$
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
        JOIN users u ON c.user_id = u.id
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

CREATE OR REPLACE FUNCTION get_comment_replies(
    p_parent_id UUID,
    p_limit INTEGER DEFAULT 10,
    p_offset INTEGER DEFAULT 0
) RETURNS TABLE (comment_data JSONB) AS $$
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

CREATE OR REPLACE FUNCTION add_comment(
    p_entity_type comment_entity_type,
    p_entity_id UUID,
    p_user_id UUID,
    p_content TEXT,
    p_parent_id UUID DEFAULT NULL
) RETURNS TABLE (comment_id UUID, thread_depth INTEGER) AS $$
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
        entity_type, entity_id, user_id, content, parent_id, thread_depth
    ) VALUES (
        p_entity_type, p_entity_id, p_user_id, p_content, p_parent_id, v_depth
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

CREATE OR REPLACE FUNCTION toggle_comment_reaction(
    p_comment_id UUID,
    p_user_id UUID,
    p_reaction_type reaction_type
) RETURNS TABLE (action_taken TEXT, reaction_counts JSONB) AS $$
DECLARE
    v_existing_reaction UUID;
    v_action TEXT;
    v_counts JSONB;
BEGIN
    SELECT id INTO v_existing_reaction
    FROM comment_reactions
    WHERE comment_id = p_comment_id 
      AND user_id = p_user_id 
      AND reaction_type = p_reaction_type;
    
    IF v_existing_reaction IS NOT NULL THEN
        DELETE FROM comment_reactions WHERE id = v_existing_reaction;
        v_action := 'removed';
    ELSE
        INSERT INTO comment_reactions (comment_id, user_id, reaction_type)
        VALUES (p_comment_id, p_user_id, p_reaction_type);
        v_action := 'added';
    END IF;
    
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

-- ============================================================================
-- STEP 3: Update trigger functions to use new table names
-- ============================================================================

CREATE OR REPLACE FUNCTION update_comment_timestamp() RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_reply_count_on_delete() RETURNS TRIGGER AS $$
BEGIN
    IF OLD.parent_id IS NOT NULL THEN
        UPDATE comments 
        SET reply_count = reply_count - 1,
            updated_at = NOW()
        WHERE id = OLD.parent_id;
    END IF;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- STEP 4: Recreate triggers with new names
-- ============================================================================

DROP TRIGGER IF EXISTS trigger_update_comment_timestamp_v2 ON comments;
DROP TRIGGER IF EXISTS trigger_update_reply_count_on_delete_v2 ON comments;

CREATE TRIGGER update_comment_timestamp_trigger
    BEFORE UPDATE ON comments
    FOR EACH ROW
    EXECUTE FUNCTION update_comment_timestamp();

CREATE TRIGGER update_reply_count_on_delete_trigger
    AFTER DELETE ON comments
    FOR EACH ROW
    EXECUTE FUNCTION update_reply_count_on_delete();

-- ============================================================================
-- STEP 5: Update index names to be consistent
-- ============================================================================

-- Drop old indexes with v2 names
DROP INDEX IF EXISTS idx_comments_v2_entity_created;
DROP INDEX IF EXISTS idx_comments_v2_parent_created;
DROP INDEX IF EXISTS idx_comments_v2_user_created;
DROP INDEX IF EXISTS idx_comments_v2_thread_depth;
DROP INDEX IF EXISTS idx_comments_v2_deleted;
DROP INDEX IF EXISTS idx_comment_reactions_v2_comment;
DROP INDEX IF EXISTS idx_comment_reactions_v2_user;
DROP INDEX IF EXISTS idx_comment_reports_v2_status;
DROP INDEX IF EXISTS idx_comment_reports_v2_comment;
DROP INDEX IF EXISTS idx_comment_pins_v2_entity;

-- Create new indexes with clean names
CREATE INDEX idx_comments_entity_created ON comments(entity_type, entity_id, created_at DESC);
CREATE INDEX idx_comments_parent_created ON comments(parent_id, created_at) WHERE parent_id IS NOT NULL;
CREATE INDEX idx_comments_user_created ON comments(user_id, created_at DESC);
CREATE INDEX idx_comments_thread_depth ON comments(thread_depth) WHERE thread_depth > 0;
CREATE INDEX idx_comments_deleted ON comments(deleted_at) WHERE deleted_at IS NOT NULL;

CREATE INDEX idx_comment_reactions_comment ON comment_reactions(comment_id, reaction_type);
CREATE INDEX idx_comment_reactions_user ON comment_reactions(user_id, created_at DESC);

CREATE INDEX idx_comment_reports_status ON comment_reports(status, created_at) WHERE status != 'resolved';
CREATE INDEX idx_comment_reports_comment ON comment_reports(comment_id);

CREATE INDEX idx_comment_pins_entity ON comment_pins(entity_type, entity_id, pin_order);

-- ============================================================================
-- STEP 6: Standardize other table naming patterns
-- ============================================================================

-- Rename post_reactions to reactions for consistency
ALTER TABLE post_reactions RENAME TO reactions;
ALTER INDEX post_reactions_pkey RENAME TO reactions_pkey;
ALTER INDEX post_reactions_user_post_unique RENAME TO reactions_user_post_unique;
ALTER INDEX idx_likes_post_id RENAME TO idx_reactions_post_id;
ALTER INDEX idx_likes_user_id RENAME TO idx_reactions_user_id;

-- Update foreign key constraint names
ALTER TABLE reactions RENAME CONSTRAINT likes_post_id_fkey TO reactions_post_id_fkey;
ALTER TABLE reactions RENAME CONSTRAINT likes_user_id_fkey TO reactions_user_id_fkey;

-- Rename post_bookmarks to bookmarks for consistency
ALTER TABLE post_bookmarks RENAME TO bookmarks;
ALTER INDEX post_bookmarks_pkey RENAME TO bookmarks_pkey;

-- Update foreign key constraint names
ALTER TABLE bookmarks RENAME CONSTRAINT post_bookmarks_post_id_fkey TO bookmarks_post_id_fkey;
ALTER TABLE bookmarks RENAME CONSTRAINT post_bookmarks_user_id_fkey TO bookmarks_user_id_fkey;

-- ============================================================================
-- STEP 7: Update function references to use new table names
-- ============================================================================

-- Update functions that reference the renamed tables
CREATE OR REPLACE FUNCTION update_post_like_count() RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        UPDATE posts SET like_count = posts.like_count + 1 WHERE id = NEW.post_id;
        RETURN NEW;
    ELSIF (TG_OP = 'DELETE') THEN
        UPDATE posts SET like_count = posts.like_count - 1 WHERE id = OLD.post_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION trigger_post_like_notification() RETURNS TRIGGER AS $$
DECLARE
  actor_name text;
  post_author_id uuid;
  post_title text;
  notification_message text;
BEGIN
  SELECT COALESCE(full_name, username, 'Someone') INTO actor_name
  FROM users WHERE id = NEW.user_id;

  SELECT author_id, title INTO post_author_id, post_title
  FROM posts WHERE id = NEW.post_id;

  notification_message := actor_name || ' liked your post';
  IF post_title IS NOT NULL THEN
    notification_message := notification_message || ': "' || LEFT(post_title, 50) || '"';
  END IF;

  IF post_author_id IS NOT NULL THEN
    PERFORM create_notification(
      post_author_id,
      NEW.user_id,
      'post_like',
      'Post liked',
      notification_message,
      'post',
      NEW.post_id
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION trigger_bookmark_notification() RETURNS TRIGGER AS $$
DECLARE
  actor_name text;
  post_author_id uuid;
  post_title text;
  notification_message text;
BEGIN
  SELECT COALESCE(full_name, username, 'Someone') INTO actor_name
  FROM users WHERE id = NEW.user_id;

  SELECT author_id, title INTO post_author_id, post_title
  FROM posts WHERE id = NEW.post_id;

  notification_message := actor_name || ' bookmarked your post';
  IF post_title IS NOT NULL THEN
    notification_message := notification_message || ': "' || LEFT(post_title, 50) || '"';
  END IF;

  IF post_author_id IS NOT NULL THEN
    PERFORM create_notification(
      post_author_id,
      NEW.user_id,
      'post_bookmark',
      'Post bookmarked',
      notification_message,
      'post',
      NEW.post_id
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- STEP 8: Update trigger references
-- ============================================================================

-- Drop old triggers
DROP TRIGGER IF EXISTS on_like_delete_update_post_like_count ON reactions;
DROP TRIGGER IF EXISTS on_like_insert_update_post_like_count ON reactions;
DROP TRIGGER IF EXISTS trigger_post_like_notification ON reactions;
DROP TRIGGER IF EXISTS trigger_bookmark_notification ON bookmarks;

-- Recreate triggers with updated function references
CREATE TRIGGER on_reaction_delete_update_post_like_count
    AFTER DELETE ON reactions
    FOR EACH ROW
    EXECUTE FUNCTION update_post_like_count();

CREATE TRIGGER on_reaction_insert_update_post_like_count
    AFTER INSERT ON reactions
    FOR EACH ROW
    EXECUTE FUNCTION update_post_like_count();

CREATE TRIGGER post_like_notification_trigger
    AFTER INSERT ON reactions
    FOR EACH ROW
    WHEN (NEW.type = 'like')
    EXECUTE FUNCTION trigger_post_like_notification();

CREATE TRIGGER bookmark_notification_trigger
    AFTER INSERT ON bookmarks
    FOR EACH ROW
    EXECUTE FUNCTION trigger_bookmark_notification();

-- ============================================================================
-- STEP 9: Update RLS policies to reference new table names
-- ============================================================================

-- Enable RLS on renamed tables
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE comment_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE comment_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE comment_pins ENABLE ROW LEVEL SECURITY;
ALTER TABLE reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookmarks ENABLE ROW LEVEL SECURITY;

-- Update policies for comments table
CREATE POLICY "Users can read comments" ON comments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert comments" ON comments FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own comments" ON comments FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own comments" ON comments FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Update policies for reactions table
CREATE POLICY "select_all_reactions" ON reactions FOR SELECT USING (true);
CREATE POLICY "manage_own_reactions" ON reactions USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Update policies for bookmarks table
CREATE POLICY "own_bookmarks" ON bookmarks USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- STEP 10: Update comments and documentation
-- ============================================================================

COMMENT ON TABLE comments IS 'Universal polymorphic comment system supporting any entity type';
COMMENT ON TABLE comment_reactions IS 'Reactions (like, heart, etc.) on comments';
COMMENT ON TABLE comment_reports IS 'User reports for content moderation';
COMMENT ON TABLE comment_pins IS 'Comments pinned by entity owners';
COMMENT ON TABLE reactions IS 'User reactions (likes) on posts';
COMMENT ON TABLE bookmarks IS 'User bookmarks on posts';

COMMIT; 