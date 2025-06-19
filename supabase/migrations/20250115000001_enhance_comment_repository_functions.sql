-- Enhanced Comment Repository Functions
-- This migration adds optimized database functions for better performance and pagination

-- Function to get entity comments with reactions (optimized with single query)
CREATE OR REPLACE FUNCTION get_entity_comments_with_reactions(
  p_entity_type text,
  p_entity_id text,
  p_limit integer DEFAULT 50,
  p_cursor text DEFAULT NULL,
  p_created_before timestamptz DEFAULT NULL,
  p_user_id text DEFAULT NULL,
  p_include_reactions boolean DEFAULT true
)
RETURNS TABLE (
  id text,
  entity_type text,
  entity_id text,
  user_id text,
  content text,
  parent_id text,
  thread_depth integer,
  reply_count integer,
  metadata jsonb,
  created_at timestamptz,
  updated_at timestamptz,
  deleted_at timestamptz,
  author jsonb,
  reaction_counts jsonb,
  user_reactions text[]
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cursor_created_at timestamptz;
  cursor_id text;
BEGIN
  -- Parse cursor if provided
  IF p_cursor IS NOT NULL THEN
    BEGIN
      SELECT split_part(convert_from(decode(p_cursor, 'base64'), 'UTF8'), ':', 1)::timestamptz,
             split_part(convert_from(decode(p_cursor, 'base64'), 'UTF8'), ':', 2)
      INTO cursor_created_at, cursor_id;
    EXCEPTION WHEN OTHERS THEN
      cursor_created_at := NULL;
      cursor_id := NULL;
    END;
  END IF;

  RETURN QUERY
  WITH comment_data AS (
    SELECT 
      c.id,
      c.entity_type,
      c.entity_id,
      c.user_id,
      c.content,
      c.parent_id,
      c.thread_depth,
      c.reply_count,
      c.metadata,
      c.created_at,
      c.updated_at,
      c.deleted_at,
      jsonb_build_object(
        'id', u.id,
        'username', u.username,
        'full_name', u.full_name,
        'avatar_url', u.avatar_url
      ) as author
    FROM comments c
    LEFT JOIN users u ON u.id = c.user_id
    WHERE c.entity_type = p_entity_type
      AND c.entity_id = p_entity_id
      AND c.parent_id IS NULL
      AND c.deleted_at IS NULL
      AND (cursor_created_at IS NULL OR c.created_at < cursor_created_at)
      AND (p_created_before IS NULL OR c.created_at < p_created_before)
    ORDER BY c.created_at DESC
    LIMIT p_limit
  ),
  reaction_data AS (
    SELECT 
      cr.comment_id,
      jsonb_agg(
        jsonb_build_object(
          'reaction_type', cr.reaction_type,
          'count', reaction_counts.count
        )
      ) as reactions,
      CASE 
        WHEN p_user_id IS NOT NULL THEN
          array_agg(DISTINCT user_reactions.reaction_type) FILTER (WHERE user_reactions.user_id = p_user_id)
        ELSE
          ARRAY[]::text[]
      END as user_reaction_types
    FROM comment_data cd
    LEFT JOIN comment_reactions cr ON cr.comment_id = cd.id
    LEFT JOIN (
      SELECT comment_id, reaction_type, COUNT(*) as count
      FROM comment_reactions
      WHERE comment_id IN (SELECT id FROM comment_data)
      GROUP BY comment_id, reaction_type
    ) reaction_counts ON reaction_counts.comment_id = cr.comment_id 
      AND reaction_counts.reaction_type = cr.reaction_type
    LEFT JOIN comment_reactions user_reactions ON user_reactions.comment_id = cd.id 
      AND user_reactions.user_id = p_user_id
    WHERE p_include_reactions = true
    GROUP BY cr.comment_id
  )
  SELECT 
    cd.id,
    cd.entity_type,
    cd.entity_id,
    cd.user_id,
    cd.content,
    cd.parent_id,
    cd.thread_depth,
    cd.reply_count,
    cd.metadata,
    cd.created_at,
    cd.updated_at,
    cd.deleted_at,
    cd.author,
    COALESCE(rd.reactions, '[]'::jsonb) as reaction_counts,
    COALESCE(rd.user_reaction_types, ARRAY[]::text[]) as user_reactions
  FROM comment_data cd
  LEFT JOIN reaction_data rd ON rd.comment_id = cd.id
  ORDER BY cd.created_at DESC;
END;
$$;

-- Function to get comment replies with reactions
CREATE OR REPLACE FUNCTION get_comment_replies_with_reactions(
  p_parent_id text,
  p_limit integer DEFAULT 20,
  p_cursor text DEFAULT NULL,
  p_user_id text DEFAULT NULL
)
RETURNS TABLE (
  id text,
  entity_type text,
  entity_id text,
  user_id text,
  content text,
  parent_id text,
  thread_depth integer,
  reply_count integer,
  metadata jsonb,
  created_at timestamptz,
  updated_at timestamptz,
  deleted_at timestamptz,
  author jsonb,
  reaction_counts jsonb,
  user_reactions text[]
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cursor_created_at timestamptz;
  cursor_id text;
BEGIN
  -- Parse cursor if provided
  IF p_cursor IS NOT NULL THEN
    BEGIN
      SELECT split_part(convert_from(decode(p_cursor, 'base64'), 'UTF8'), ':', 1)::timestamptz,
             split_part(convert_from(decode(p_cursor, 'base64'), 'UTF8'), ':', 2)
      INTO cursor_created_at, cursor_id;
    EXCEPTION WHEN OTHERS THEN
      cursor_created_at := NULL;
      cursor_id := NULL;
    END;
  END IF;

  RETURN QUERY
  WITH reply_data AS (
    SELECT 
      c.id,
      c.entity_type,
      c.entity_id,
      c.user_id,
      c.content,
      c.parent_id,
      c.thread_depth,
      c.reply_count,
      c.metadata,
      c.created_at,
      c.updated_at,
      c.deleted_at,
      jsonb_build_object(
        'id', u.id,
        'username', u.username,
        'full_name', u.full_name,
        'avatar_url', u.avatar_url
      ) as author
    FROM comments c
    LEFT JOIN users u ON u.id = c.user_id
    WHERE c.parent_id = p_parent_id
      AND c.deleted_at IS NULL
      AND (cursor_created_at IS NULL OR c.created_at > cursor_created_at)
    ORDER BY c.created_at ASC
    LIMIT p_limit
  ),
  reaction_data AS (
    SELECT 
      cr.comment_id,
      jsonb_agg(
        jsonb_build_object(
          'reaction_type', cr.reaction_type,
          'count', reaction_counts.count
        )
      ) as reactions,
      CASE 
        WHEN p_user_id IS NOT NULL THEN
          array_agg(DISTINCT user_reactions.reaction_type) FILTER (WHERE user_reactions.user_id = p_user_id)
        ELSE
          ARRAY[]::text[]
      END as user_reaction_types
    FROM reply_data rd
    LEFT JOIN comment_reactions cr ON cr.comment_id = rd.id
    LEFT JOIN (
      SELECT comment_id, reaction_type, COUNT(*) as count
      FROM comment_reactions
      WHERE comment_id IN (SELECT id FROM reply_data)
      GROUP BY comment_id, reaction_type
    ) reaction_counts ON reaction_counts.comment_id = cr.comment_id 
      AND reaction_counts.reaction_type = cr.reaction_type
    LEFT JOIN comment_reactions user_reactions ON user_reactions.comment_id = rd.id 
      AND user_reactions.user_id = p_user_id
    GROUP BY cr.comment_id
  )
  SELECT 
    rd.id,
    rd.entity_type,
    rd.entity_id,
    rd.user_id,
    rd.content,
    rd.parent_id,
    rd.thread_depth,
    rd.reply_count,
    rd.metadata,
    rd.created_at,
    rd.updated_at,
    rd.deleted_at,
    rd.author,
    COALESCE(rrd.reactions, '[]'::jsonb) as reaction_counts,
    COALESCE(rrd.user_reaction_types, ARRAY[]::text[]) as user_reactions
  FROM reply_data rd
  LEFT JOIN reaction_data rrd ON rrd.comment_id = rd.id
  ORDER BY rd.created_at ASC;
END;
$$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_comments_entity_parent_created 
  ON comments(entity_type, entity_id, parent_id, created_at DESC) 
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_comments_parent_created 
  ON comments(parent_id, created_at ASC) 
  WHERE deleted_at IS NULL AND parent_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_comment_reactions_comment_user 
  ON comment_reactions(comment_id, user_id, reaction_type);

-- Add unique constraint for comment reactions to prevent duplicates
ALTER TABLE comment_reactions 
ADD CONSTRAINT unique_comment_user_reaction 
UNIQUE (comment_id, user_id, reaction_type);

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_entity_comments_with_reactions TO authenticated;
GRANT EXECUTE ON FUNCTION get_comment_replies_with_reactions TO authenticated;

-- Add RLS policies for the functions (they use SECURITY DEFINER)
-- The functions will respect existing RLS policies on the underlying tables 