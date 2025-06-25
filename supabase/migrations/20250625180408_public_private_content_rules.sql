-- Public vs Private Content Rules Migration
-- 
-- This migration establishes comprehensive visibility and access control rules
-- for content in the multi-tenant system. It defines how content visibility
-- works across different tenant types, user roles, and content types.
--
-- Content Visibility Rules:
-- 1. Public tenants: All content visible to everyone
-- 2. Private tenants: Content only visible to members
-- 3. Personal tenants: Content only visible to owner
-- 4. Content-level privacy: Individual posts/content can override tenant defaults
-- 5. Role-based access: Different access levels based on user roles

-- =============================================================================
-- Content Visibility Enums and Types
-- =============================================================================

-- Create content visibility enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'content_visibility') THEN
    CREATE TYPE content_visibility AS ENUM (
      'public',        -- Visible to everyone
      'tenant_only',   -- Visible only to tenant members
      'members_only',  -- Visible only to members with specific role
      'private',       -- Visible only to author
      'inherit'        -- Inherit from parent tenant/collective
    );
  END IF;
END $$;

-- Create content access level enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'content_access_level') THEN
    CREATE TYPE content_access_level AS ENUM (
      'none',          -- No access
      'view',          -- Can view content
      'comment',       -- Can view and comment
      'edit',          -- Can view, comment, and edit
      'admin'          -- Full access including delete
    );
  END IF;
END $$;

-- =============================================================================
-- Content Visibility Columns
-- =============================================================================

-- Add visibility column to posts if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'posts' 
      AND column_name = 'visibility'
  ) THEN
    ALTER TABLE public.posts 
    ADD COLUMN visibility content_visibility DEFAULT 'inherit';
  END IF;
END $$;

-- Add visibility column to conversations if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'conversations' 
      AND column_name = 'visibility'
  ) THEN
    ALTER TABLE public.conversations 
    ADD COLUMN visibility content_visibility DEFAULT 'inherit';
  END IF;
END $$;

-- Add visibility column to messages if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'messages' 
      AND column_name = 'visibility'
  ) THEN
    ALTER TABLE public.messages 
    ADD COLUMN visibility content_visibility DEFAULT 'inherit';
  END IF;
END $$;

-- Add visibility column to video_assets if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'video_assets' 
      AND column_name = 'visibility'
  ) THEN
    ALTER TABLE public.video_assets 
    ADD COLUMN visibility content_visibility DEFAULT 'inherit';
  END IF;
END $$;

-- =============================================================================
-- Core Visibility Functions
-- =============================================================================

-- Function to determine effective visibility for content
CREATE OR REPLACE FUNCTION get_effective_content_visibility(
  content_visibility content_visibility,
  tenant_id UUID,
  fallback_visibility content_visibility DEFAULT 'private'
)
RETURNS content_visibility
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  tenant_is_public BOOLEAN;
  effective_visibility content_visibility;
BEGIN
  -- If content has explicit visibility, use it (unless inherit)
  IF content_visibility != 'inherit' THEN
    RETURN content_visibility;
  END IF;
  
  -- If inherit, check tenant visibility
  IF tenant_id IS NOT NULL THEN
    SELECT is_public INTO tenant_is_public
    FROM public.tenants
    WHERE id = tenant_id;
    
    IF tenant_is_public THEN
      effective_visibility := 'public';
    ELSE
      effective_visibility := 'tenant_only';
    END IF;
  ELSE
    -- No tenant context, use fallback
    effective_visibility := fallback_visibility;
  END IF;
  
  RETURN effective_visibility;
END;
$$;

-- Function to check if user can access content
CREATE OR REPLACE FUNCTION user_can_access_content(
  user_id UUID,
  content_tenant_id UUID,
  content_author_id UUID,
  content_visibility content_visibility,
  required_access_level content_access_level DEFAULT 'view'
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  effective_visibility content_visibility;
  user_tenant_role TEXT;
  tenant_is_public BOOLEAN;
BEGIN
  -- Get effective visibility
  effective_visibility := get_effective_content_visibility(
    content_visibility, 
    content_tenant_id, 
    'private'
  );
  
  -- Check visibility rules
  CASE effective_visibility
    WHEN 'public' THEN
      -- Public content is accessible to everyone
      RETURN TRUE;
      
    WHEN 'private' THEN
      -- Private content only accessible to author
      RETURN user_id = content_author_id;
      
    WHEN 'tenant_only' THEN
      -- Content accessible to tenant members
      IF user_id = content_author_id THEN
        RETURN TRUE; -- Author always has access
      END IF;
      
      -- Check if user is member of the tenant
      SELECT role INTO user_tenant_role
      FROM public.tenant_members
      WHERE tenant_id = content_tenant_id AND user_id = user_id;
      
      RETURN user_tenant_role IS NOT NULL;
      
    WHEN 'members_only' THEN
      -- Content accessible to tenant members with sufficient role
      IF user_id = content_author_id THEN
        RETURN TRUE; -- Author always has access
      END IF;
      
      -- Check if user has sufficient role in tenant
      SELECT role INTO user_tenant_role
      FROM public.tenant_members
      WHERE tenant_id = content_tenant_id AND user_id = user_id;
      
      -- For now, any member role is sufficient for 'members_only'
      -- This can be expanded with more granular role checking
      RETURN user_tenant_role IN ('owner', 'admin', 'member');
      
    ELSE
      -- Default to no access for unknown visibility levels
      RETURN FALSE;
  END CASE;
END;
$$;

-- Function to get user's access level for content
CREATE OR REPLACE FUNCTION get_user_content_access_level(
  user_id UUID,
  content_tenant_id UUID,
  content_author_id UUID,
  content_visibility content_visibility
)
RETURNS content_access_level
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  user_tenant_role TEXT;
BEGIN
  -- If user can't access content at all, return none
  IF NOT user_can_access_content(
    user_id, 
    content_tenant_id, 
    content_author_id, 
    content_visibility, 
    'view'
  ) THEN
    RETURN 'none';
  END IF;
  
  -- If user is content author, they get admin access
  IF user_id = content_author_id THEN
    RETURN 'admin';
  END IF;
  
  -- Check user's role in the tenant
  SELECT role INTO user_tenant_role
  FROM public.tenant_members
  WHERE tenant_id = content_tenant_id AND user_id = user_id;
  
  -- Determine access level based on role
  CASE user_tenant_role
    WHEN 'owner' THEN
      RETURN 'admin';
    WHEN 'admin' THEN
      RETURN 'admin';
    WHEN 'member' THEN
      RETURN 'edit';
    WHEN 'viewer' THEN
      RETURN 'view';
    ELSE
      -- For public content, non-members get view access
      IF get_effective_content_visibility(content_visibility, content_tenant_id) = 'public' THEN
        RETURN 'view';
      ELSE
        RETURN 'none';
      END IF;
  END CASE;
END;
$$;

-- =============================================================================
-- Content Discovery Functions
-- =============================================================================

-- Function to get accessible posts for a user
CREATE OR REPLACE FUNCTION get_accessible_posts_for_user(
  target_user_id UUID,
  limit_count INTEGER DEFAULT 50,
  offset_count INTEGER DEFAULT 0
)
RETURNS TABLE (
  post_id UUID,
  title TEXT,
  content TEXT,
  author_id UUID,
  tenant_id UUID,
  visibility content_visibility,
  effective_visibility content_visibility,
  user_access_level content_access_level,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id as post_id,
    p.title,
    p.content,
    p.author_id,
    p.tenant_id,
    p.visibility,
    get_effective_content_visibility(p.visibility, p.tenant_id) as effective_visibility,
    get_user_content_access_level(target_user_id, p.tenant_id, p.author_id, p.visibility) as user_access_level,
    p.created_at
  FROM public.posts p
  WHERE user_can_access_content(
    target_user_id, 
    p.tenant_id, 
    p.author_id, 
    p.visibility
  )
  ORDER BY p.created_at DESC
  LIMIT limit_count
  OFFSET offset_count;
END;
$$;

-- Function to get accessible conversations for a user
CREATE OR REPLACE FUNCTION get_accessible_conversations_for_user(
  target_user_id UUID,
  limit_count INTEGER DEFAULT 50
)
RETURNS TABLE (
  conversation_id UUID,
  title TEXT,
  type TEXT,
  tenant_id UUID,
  visibility content_visibility,
  effective_visibility content_visibility,
  user_access_level content_access_level,
  last_message_at TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id as conversation_id,
    c.title,
    c.type,
    c.tenant_id,
    c.visibility,
    get_effective_content_visibility(c.visibility, c.tenant_id) as effective_visibility,
    get_user_content_access_level(target_user_id, c.tenant_id, c.created_by, c.visibility) as user_access_level,
    c.updated_at as last_message_at
  FROM public.conversations c
  WHERE user_can_access_content(
    target_user_id, 
    c.tenant_id, 
    c.created_by, 
    c.visibility
  )
  OR EXISTS (
    -- User is a participant in the conversation
    SELECT 1 FROM public.conversation_participants cp
    WHERE cp.conversation_id = c.id AND cp.user_id = target_user_id
  )
  ORDER BY c.updated_at DESC
  LIMIT limit_count;
END;
$$;

-- =============================================================================
-- Enhanced Row Level Security Policies
-- =============================================================================

-- Drop existing RLS policies that might conflict
DROP POLICY IF EXISTS "posts_select_policy" ON public.posts;
DROP POLICY IF EXISTS "conversations_select_policy" ON public.conversations;
DROP POLICY IF EXISTS "messages_select_policy" ON public.messages;

-- Enhanced RLS policy for posts
CREATE POLICY "posts_visibility_policy" ON public.posts
  FOR SELECT TO authenticated
  USING (
    user_can_access_content(
      auth.uid(),
      tenant_id,
      author_id,
      visibility
    )
  );

-- Enhanced RLS policy for conversations
CREATE POLICY "conversations_visibility_policy" ON public.conversations
  FOR SELECT TO authenticated
  USING (
    user_can_access_content(
      auth.uid(),
      tenant_id,
      created_by,
      visibility
    )
    OR EXISTS (
      -- User is a participant in the conversation
      SELECT 1 FROM public.conversation_participants cp
      WHERE cp.conversation_id = id AND cp.user_id = auth.uid()
    )
  );

-- Enhanced RLS policy for messages
CREATE POLICY "messages_visibility_policy" ON public.messages
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      -- User can access the conversation
      SELECT 1 FROM public.conversations c
      WHERE c.id = conversation_id
        AND (
          user_can_access_content(
            auth.uid(),
            c.tenant_id,
            c.created_by,
            c.visibility
          )
          OR EXISTS (
            SELECT 1 FROM public.conversation_participants cp
            WHERE cp.conversation_id = c.id AND cp.user_id = auth.uid()
          )
        )
    )
  );

-- =============================================================================
-- Content Visibility Management Functions
-- =============================================================================

-- Function to update content visibility
CREATE OR REPLACE FUNCTION update_content_visibility(
  content_table TEXT,
  content_id UUID,
  new_visibility content_visibility,
  requesting_user_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  content_author_id UUID;
  content_tenant_id UUID;
  user_access_level content_access_level;
BEGIN
  -- Get content details based on table
  CASE content_table
    WHEN 'posts' THEN
      SELECT author_id, tenant_id INTO content_author_id, content_tenant_id
      FROM public.posts WHERE id = content_id;
    WHEN 'conversations' THEN
      SELECT created_by, tenant_id INTO content_author_id, content_tenant_id
      FROM public.conversations WHERE id = content_id;
    ELSE
      RAISE EXCEPTION 'Unsupported content table: %', content_table;
  END CASE;
  
  IF content_author_id IS NULL THEN
    RAISE EXCEPTION 'Content not found';
  END IF;
  
  -- Check if user has permission to change visibility
  user_access_level := get_user_content_access_level(
    requesting_user_id,
    content_tenant_id,
    content_author_id,
    'inherit' -- Current visibility doesn't matter for permission check
  );
  
  IF user_access_level NOT IN ('admin', 'edit') AND requesting_user_id != content_author_id THEN
    RAISE EXCEPTION 'Insufficient permissions to change content visibility';
  END IF;
  
  -- Update visibility based on table
  CASE content_table
    WHEN 'posts' THEN
      UPDATE public.posts SET visibility = new_visibility WHERE id = content_id;
    WHEN 'conversations' THEN
      UPDATE public.conversations SET visibility = new_visibility WHERE id = content_id;
  END CASE;
  
  RETURN TRUE;
END;
$$;

-- Function to bulk update tenant content visibility
CREATE OR REPLACE FUNCTION update_tenant_content_visibility(
  target_tenant_id UUID,
  new_default_visibility content_visibility,
  update_existing_content BOOLEAN DEFAULT FALSE,
  requesting_user_id UUID DEFAULT auth.uid()
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_role TEXT;
  updated_count INTEGER := 0;
BEGIN
  -- Check if user has admin rights in the tenant
  SELECT role INTO user_role
  FROM public.tenant_members
  WHERE tenant_id = target_tenant_id AND user_id = requesting_user_id;
  
  IF user_role NOT IN ('owner', 'admin') THEN
    RAISE EXCEPTION 'Insufficient permissions to update tenant content visibility';
  END IF;
  
  -- Update tenant default visibility (if tenant has this field)
  -- For now, we'll use the tenant's is_public field
  CASE new_default_visibility
    WHEN 'public' THEN
      UPDATE public.tenants SET is_public = TRUE WHERE id = target_tenant_id;
    WHEN 'tenant_only', 'members_only', 'private' THEN
      UPDATE public.tenants SET is_public = FALSE WHERE id = target_tenant_id;
  END CASE;
  
  -- Optionally update existing content
  IF update_existing_content THEN
    -- Update posts that have 'inherit' visibility
    UPDATE public.posts 
    SET visibility = new_default_visibility 
    WHERE tenant_id = target_tenant_id 
      AND visibility = 'inherit';
    
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    
    -- Update conversations that have 'inherit' visibility
    UPDATE public.conversations 
    SET visibility = new_default_visibility 
    WHERE tenant_id = target_tenant_id 
      AND visibility = 'inherit';
    
    GET DIAGNOSTICS updated_count = updated_count + ROW_COUNT;
  END IF;
  
  RETURN updated_count;
END;
$$;

-- =============================================================================
-- Content Visibility Analytics
-- =============================================================================

-- Function to get content visibility statistics for a tenant
CREATE OR REPLACE FUNCTION get_tenant_content_visibility_stats(
  target_tenant_id UUID
)
RETURNS TABLE (
  content_type TEXT,
  visibility content_visibility,
  count BIGINT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
BEGIN
  -- Posts visibility stats
  RETURN QUERY
  SELECT 
    'posts' as content_type,
    get_effective_content_visibility(p.visibility, p.tenant_id) as visibility,
    COUNT(*) as count
  FROM public.posts p
  WHERE p.tenant_id = target_tenant_id
  GROUP BY get_effective_content_visibility(p.visibility, p.tenant_id);
  
  -- Conversations visibility stats
  RETURN QUERY
  SELECT 
    'conversations' as content_type,
    get_effective_content_visibility(c.visibility, c.tenant_id) as visibility,
    COUNT(*) as count
  FROM public.conversations c
  WHERE c.tenant_id = target_tenant_id
  GROUP BY get_effective_content_visibility(c.visibility, c.tenant_id);
END;
$$;

-- =============================================================================
-- Grant Permissions
-- =============================================================================

-- Grant execute permissions on visibility functions
GRANT EXECUTE ON FUNCTION public.get_effective_content_visibility(content_visibility, UUID, content_visibility) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_can_access_content(UUID, UUID, UUID, content_visibility, content_access_level) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_content_access_level(UUID, UUID, UUID, content_visibility) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_accessible_posts_for_user(UUID, INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_accessible_conversations_for_user(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_content_visibility(TEXT, UUID, content_visibility, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_tenant_content_visibility(UUID, content_visibility, BOOLEAN, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_tenant_content_visibility_stats(UUID) TO authenticated;

-- =============================================================================
-- Update Default Visibility for Existing Content
-- =============================================================================

-- Set default visibility for existing content that doesn't have it set
UPDATE public.posts 
SET visibility = 'inherit' 
WHERE visibility IS NULL;

UPDATE public.conversations 
SET visibility = 'inherit' 
WHERE visibility IS NULL;

-- =============================================================================
-- Create Indexes for Performance
-- =============================================================================

-- Indexes for visibility-based queries
CREATE INDEX IF NOT EXISTS idx_posts_visibility_tenant ON public.posts(visibility, tenant_id);
CREATE INDEX IF NOT EXISTS idx_conversations_visibility_tenant ON public.conversations(visibility, tenant_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_visibility ON public.messages(conversation_id) WHERE visibility IS NOT NULL;

-- =============================================================================
-- Comments and Documentation
-- =============================================================================

COMMENT ON TYPE content_visibility IS 
'Defines visibility levels for content: public, tenant_only, members_only, private, inherit';

COMMENT ON TYPE content_access_level IS 
'Defines access levels for content: none, view, comment, edit, admin';

COMMENT ON FUNCTION public.get_effective_content_visibility IS 
'Resolves effective visibility for content, handling inherit rules';

COMMENT ON FUNCTION public.user_can_access_content IS 
'Checks if a user can access specific content based on visibility rules';

COMMENT ON FUNCTION public.get_user_content_access_level IS 
'Returns the access level a user has for specific content';

COMMENT ON FUNCTION public.update_content_visibility IS 
'Updates content visibility with proper permission checks';

-- =============================================================================
-- Migration Success Verification
-- =============================================================================

DO $$
DECLARE
  posts_count INTEGER;
  conversations_count INTEGER;
BEGIN
  -- Count content with visibility settings
  SELECT COUNT(*) INTO posts_count 
  FROM public.posts 
  WHERE visibility IS NOT NULL;
  
  SELECT COUNT(*) INTO conversations_count 
  FROM public.conversations 
  WHERE visibility IS NOT NULL;
  
  RAISE NOTICE 'Content visibility migration completed successfully';
  RAISE NOTICE 'Updated % posts with visibility settings', posts_count;
  RAISE NOTICE 'Updated % conversations with visibility settings', conversations_count;
  RAISE NOTICE 'Enhanced RLS policies are now active for content visibility';
END $$;
