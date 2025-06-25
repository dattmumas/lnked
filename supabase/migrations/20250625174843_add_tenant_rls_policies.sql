-- Multi-Tenancy Row-Level Security Policies
-- 
-- This migration adds RLS policies to enforce tenant isolation at the database level.
-- These policies provide a safety net in addition to application-level access controls.
--
-- Policy Structure:
-- 1. Users can only access data from tenants they are members of
-- 2. Public tenants have read-only access for non-members (where applicable)
-- 3. Service role bypasses RLS for administrative operations
-- 4. Anonymous access blocked by default

-- =============================================================================
-- Helper Function: Check if user is member of a tenant
-- =============================================================================

CREATE OR REPLACE FUNCTION public.user_is_tenant_member(tenant_uuid UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  current_user_id UUID;
BEGIN
  -- Get current authenticated user ID
  current_user_id := auth.uid();
  
  -- Return false if no authenticated user
  IF current_user_id IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Check if user is a member of the tenant
  RETURN EXISTS (
    SELECT 1 
    FROM public.tenant_members 
    WHERE tenant_id = tenant_uuid 
      AND user_id = current_user_id
  );
END;
$$;

-- =============================================================================
-- Helper Function: Check if tenant is public
-- =============================================================================

CREATE OR REPLACE FUNCTION public.tenant_is_public(tenant_uuid UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM public.tenants 
    WHERE id = tenant_uuid 
      AND is_public = TRUE
  );
END;
$$;

-- =============================================================================
-- Posts Table RLS Policies
-- =============================================================================

-- Enable RLS on posts table
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view posts from tenants they belong to OR public tenants (if post is public)
CREATE POLICY "Users can view posts from accessible tenants"
ON public.posts
FOR SELECT
TO authenticated
USING (
  -- User is member of the tenant
  public.user_is_tenant_member(tenant_id)
  OR
  -- Post is public AND tenant is public
  (is_public = TRUE AND public.tenant_is_public(tenant_id))
);

-- Policy: Users can insert posts only in tenants they are members of
CREATE POLICY "Users can create posts in their tenants"
ON public.posts
FOR INSERT
TO authenticated
WITH CHECK (
  public.user_is_tenant_member(tenant_id)
  AND author_id = auth.uid()
);

-- Policy: Users can update their own posts in tenants they belong to
CREATE POLICY "Users can update their own posts in accessible tenants"
ON public.posts
FOR UPDATE
TO authenticated
USING (
  author_id = auth.uid()
  AND public.user_is_tenant_member(tenant_id)
)
WITH CHECK (
  author_id = auth.uid()
  AND public.user_is_tenant_member(tenant_id)
);

-- Policy: Users can delete their own posts in tenants they belong to
CREATE POLICY "Users can delete their own posts in accessible tenants"
ON public.posts
FOR DELETE
TO authenticated
USING (
  author_id = auth.uid()
  AND public.user_is_tenant_member(tenant_id)
);

-- =============================================================================
-- Conversations Table RLS Policies
-- =============================================================================

-- Enable RLS on conversations table
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view conversations from tenants they belong to
CREATE POLICY "Users can view conversations from accessible tenants"
ON public.conversations
FOR SELECT
TO authenticated
USING (
  public.user_is_tenant_member(tenant_id)
);

-- Policy: Users can create conversations in tenants they belong to
CREATE POLICY "Users can create conversations in their tenants"
ON public.conversations
FOR INSERT
TO authenticated
WITH CHECK (
  public.user_is_tenant_member(tenant_id)
  AND created_by = auth.uid()
);

-- Policy: Users can update conversations they created in accessible tenants
CREATE POLICY "Users can update their conversations in accessible tenants"
ON public.conversations
FOR UPDATE
TO authenticated
USING (
  created_by = auth.uid()
  AND public.user_is_tenant_member(tenant_id)
)
WITH CHECK (
  created_by = auth.uid()
  AND public.user_is_tenant_member(tenant_id)
);

-- Policy: Users can delete conversations they created in accessible tenants
CREATE POLICY "Users can delete their conversations in accessible tenants"
ON public.conversations
FOR DELETE
TO authenticated
USING (
  created_by = auth.uid()
  AND public.user_is_tenant_member(tenant_id)
);

-- =============================================================================
-- Messages Table RLS Policies
-- =============================================================================

-- Enable RLS on messages table
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view messages from conversations in accessible tenants
CREATE POLICY "Users can view messages from accessible conversations"
ON public.messages
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 
    FROM public.conversations 
    WHERE conversations.id = messages.conversation_id
      AND public.user_is_tenant_member(conversations.tenant_id)
  )
);

-- Policy: Users can send messages to conversations in accessible tenants
CREATE POLICY "Users can send messages to accessible conversations"
ON public.messages
FOR INSERT
TO authenticated
WITH CHECK (
  sender_id = auth.uid()
  AND EXISTS (
    SELECT 1 
    FROM public.conversations 
    WHERE conversations.id = messages.conversation_id
      AND public.user_is_tenant_member(conversations.tenant_id)
  )
);

-- Policy: Users can update their own messages in accessible conversations
CREATE POLICY "Users can update their own messages in accessible conversations"
ON public.messages
FOR UPDATE
TO authenticated
USING (
  sender_id = auth.uid()
  AND EXISTS (
    SELECT 1 
    FROM public.conversations 
    WHERE conversations.id = messages.conversation_id
      AND public.user_is_tenant_member(conversations.tenant_id)
  )
)
WITH CHECK (
  sender_id = auth.uid()
  AND EXISTS (
    SELECT 1 
    FROM public.conversations 
    WHERE conversations.id = messages.conversation_id
      AND public.user_is_tenant_member(conversations.tenant_id)
  )
);

-- Policy: Users can delete their own messages in accessible conversations
CREATE POLICY "Users can delete their own messages in accessible conversations"
ON public.messages
FOR DELETE
TO authenticated
USING (
  sender_id = auth.uid()
  AND EXISTS (
    SELECT 1 
    FROM public.conversations 
    WHERE conversations.id = messages.conversation_id
      AND public.user_is_tenant_member(conversations.tenant_id)
  )
);

-- =============================================================================
-- Post-Collectives Junction Table RLS Policies
-- =============================================================================

-- Enable RLS on post_collectives table
ALTER TABLE public.post_collectives ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view post-collective associations for accessible tenants
CREATE POLICY "Users can view post associations for accessible tenants"
ON public.post_collectives
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 
    FROM public.posts 
    WHERE posts.id = post_collectives.post_id
      AND public.user_is_tenant_member(posts.tenant_id)
  )
);

-- Policy: Users can create post-collective associations for their posts in accessible tenants
CREATE POLICY "Users can create post associations for their posts"
ON public.post_collectives
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 
    FROM public.posts 
    WHERE posts.id = post_collectives.post_id
      AND posts.author_id = auth.uid()
      AND public.user_is_tenant_member(posts.tenant_id)
  )
);

-- Policy: Users can update post-collective associations for their posts
CREATE POLICY "Users can update post associations for their posts"
ON public.post_collectives
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 
    FROM public.posts 
    WHERE posts.id = post_collectives.post_id
      AND posts.author_id = auth.uid()
      AND public.user_is_tenant_member(posts.tenant_id)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 
    FROM public.posts 
    WHERE posts.id = post_collectives.post_id
      AND posts.author_id = auth.uid()
      AND public.user_is_tenant_member(posts.tenant_id)
  )
);

-- Policy: Users can delete post-collective associations for their posts
CREATE POLICY "Users can delete post associations for their posts"
ON public.post_collectives
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 
    FROM public.posts 
    WHERE posts.id = post_collectives.post_id
      AND posts.author_id = auth.uid()
      AND public.user_is_tenant_member(posts.tenant_id)
  )
);

-- =============================================================================
-- Video Assets Table RLS Policies (if tenant_id column exists)
-- =============================================================================

-- Check if video_assets table has tenant_id column before applying policies
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'video_assets'
      AND column_name = 'tenant_id'
  ) THEN
    -- Enable RLS on video_assets table
    ALTER TABLE public.video_assets ENABLE ROW LEVEL SECURITY;

    -- Policy: Users can view video assets from accessible tenants
    CREATE POLICY "Users can view video assets from accessible tenants"
    ON public.video_assets
    FOR SELECT
    TO authenticated
    USING (
      tenant_id IS NULL -- Public videos
      OR public.user_is_tenant_member(tenant_id)
    );

    -- Policy: Users can create video assets in accessible tenants
    CREATE POLICY "Users can create video assets in their tenants"
    ON public.video_assets
    FOR INSERT
    TO authenticated
    WITH CHECK (
      created_by = auth.uid()
      AND (
        tenant_id IS NULL -- User's personal uploads
        OR public.user_is_tenant_member(tenant_id)
      )
    );

    -- Policy: Users can update their own video assets
    CREATE POLICY "Users can update their own video assets"
    ON public.video_assets
    FOR UPDATE
    TO authenticated
    USING (
      created_by = auth.uid()
      AND (
        tenant_id IS NULL
        OR public.user_is_tenant_member(tenant_id)
      )
    )
    WITH CHECK (
      created_by = auth.uid()
      AND (
        tenant_id IS NULL
        OR public.user_is_tenant_member(tenant_id)
      )
    );

    -- Policy: Users can delete their own video assets
    CREATE POLICY "Users can delete their own video assets"
    ON public.video_assets
    FOR DELETE
    TO authenticated
    USING (
      created_by = auth.uid()
      AND (
        tenant_id IS NULL
        OR public.user_is_tenant_member(tenant_id)
      )
    );
  ELSE
    -- If no tenant_id column, apply basic owner-only policies
    ALTER TABLE public.video_assets ENABLE ROW LEVEL SECURITY;

    -- Policy: Users can view their own video assets
    CREATE POLICY "Users can view their own video assets"
    ON public.video_assets
    FOR SELECT
    TO authenticated
    USING (created_by = auth.uid());

    -- Policy: Users can create their own video assets
    CREATE POLICY "Users can create video assets"
    ON public.video_assets
    FOR INSERT
    TO authenticated
    WITH CHECK (created_by = auth.uid());

    -- Policy: Users can update their own video assets
    CREATE POLICY "Users can update their own video assets"
    ON public.video_assets
    FOR UPDATE
    TO authenticated
    USING (created_by = auth.uid())
    WITH CHECK (created_by = auth.uid());

    -- Policy: Users can delete their own video assets
    CREATE POLICY "Users can delete their own video assets"
    ON public.video_assets
    FOR DELETE
    TO authenticated
    USING (created_by = auth.uid());
  END IF;
END $$;

-- =============================================================================
-- Chains Table RLS Policies (if tenant_id column exists)
-- =============================================================================

-- Check if chains table has tenant_id column before applying policies
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'chains'
      AND column_name = 'tenant_id'
  ) THEN
    -- Enable RLS on chains table
    ALTER TABLE public.chains ENABLE ROW LEVEL SECURITY;

    -- Policy: Users can view chains from accessible tenants
    CREATE POLICY "Users can view chains from accessible tenants"
    ON public.chains
    FOR SELECT
    TO authenticated
    USING (
      tenant_id IS NULL -- Public chains
      OR public.user_is_tenant_member(tenant_id)
    );

    -- Policy: Users can create chains in accessible tenants
    CREATE POLICY "Users can create chains in their tenants"
    ON public.chains
    FOR INSERT
    TO authenticated
    WITH CHECK (
      author_id = auth.uid()
      AND (
        tenant_id IS NULL -- Personal chains
        OR public.user_is_tenant_member(tenant_id)
      )
    );

    -- Policy: Users can update their own chains
    CREATE POLICY "Users can update their own chains"
    ON public.chains
    FOR UPDATE
    TO authenticated
    USING (
      author_id = auth.uid()
      AND (
        tenant_id IS NULL
        OR public.user_is_tenant_member(tenant_id)
      )
    )
    WITH CHECK (
      author_id = auth.uid()
      AND (
        tenant_id IS NULL
        OR public.user_is_tenant_member(tenant_id)
      )
    );

    -- Policy: Users can delete their own chains
    CREATE POLICY "Users can delete their own chains"
    ON public.chains
    FOR DELETE
    TO authenticated
    USING (
      author_id = auth.uid()
      AND (
        tenant_id IS NULL
        OR public.user_is_tenant_member(tenant_id)
      )
    );
  ELSE
    -- If no tenant_id column, apply basic owner-only policies
    ALTER TABLE public.chains ENABLE ROW LEVEL SECURITY;

    -- Policy: Users can view their own chains
    CREATE POLICY "Users can view their own chains"
    ON public.chains
    FOR SELECT
    TO authenticated
    USING (author_id = auth.uid());

    -- Policy: Users can create chains
    CREATE POLICY "Users can create chains"
    ON public.chains
    FOR INSERT
    TO authenticated
    WITH CHECK (author_id = auth.uid());

    -- Policy: Users can update their own chains
    CREATE POLICY "Users can update their own chains"
    ON public.chains
    FOR UPDATE
    TO authenticated
    USING (author_id = auth.uid())
    WITH CHECK (author_id = auth.uid());

    -- Policy: Users can delete their own chains
    CREATE POLICY "Users can delete their own chains"
    ON public.chains
    FOR DELETE
    TO authenticated
    USING (author_id = auth.uid());
  END IF;
END $$;

-- =============================================================================
-- Notifications Table RLS Policies
-- =============================================================================

-- Enable RLS on notifications table
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own notifications
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
CREATE POLICY "Users can view their own notifications"
ON public.notifications
FOR SELECT
TO authenticated
USING (
  recipient_id = auth.uid()
);

-- Policy: System can create notifications for users
DROP POLICY IF EXISTS "System can create notifications" ON public.notifications;
CREATE POLICY "System can create notifications"
ON public.notifications
FOR INSERT
TO authenticated
WITH CHECK (
  recipient_id IS NOT NULL
);

-- Policy: Users can update their own notifications (mark as read, etc.)
DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications;
CREATE POLICY "Users can update their own notifications"
ON public.notifications
FOR UPDATE
TO authenticated
USING (recipient_id = auth.uid())
WITH CHECK (recipient_id = auth.uid());

-- Policy: Users can delete their own notifications
DROP POLICY IF EXISTS "Users can delete their own notifications" ON public.notifications;
CREATE POLICY "Users can delete their own notifications"
ON public.notifications
FOR DELETE
TO authenticated
USING (recipient_id = auth.uid());

-- =============================================================================
-- Tenant Members Table RLS Policies
-- =============================================================================

-- Enable RLS on tenant_members table
ALTER TABLE public.tenant_members ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view memberships for tenants they belong to
CREATE POLICY "Users can view memberships for accessible tenants"
ON public.tenant_members
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid() -- Users can see their own memberships
  OR public.user_is_tenant_member(tenant_id) -- Members can see other members
);

-- Policy: Admins can manage memberships (handled by application logic)
-- INSERT/UPDATE/DELETE operations should be handled via RPCs for proper validation

-- =============================================================================
-- Tenants Table RLS Policies
-- =============================================================================

-- Enable RLS on tenants table
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view tenants they are members of OR public tenants
CREATE POLICY "Users can view accessible tenants"
ON public.tenants
FOR SELECT
TO authenticated
USING (
  public.user_is_tenant_member(id)
  OR is_public = TRUE
);

-- Policy: Tenant management operations should be handled via RPCs only
-- This prevents direct manipulation of tenant records

-- =============================================================================
-- Comments and Reactions (Multi-Tenant)
-- =============================================================================

-- Note: Comment tables should also have RLS policies, but they would need
-- to check the tenant_id of the parent entity (post, video, etc.)
-- This would require additional helper functions to resolve entity tenant IDs

-- =============================================================================
-- Grant necessary permissions for RLS helper functions
-- =============================================================================

-- Grant execute permissions on helper functions to authenticated users
GRANT EXECUTE ON FUNCTION public.user_is_tenant_member(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.tenant_is_public(UUID) TO authenticated;

-- =============================================================================
-- Security Notes
-- =============================================================================

-- 1. Service role bypasses RLS - ensure server-side code is secure
-- 2. These policies provide defense in depth, not primary security
-- 3. Application logic should still enforce access controls
-- 4. Public tenant access should be carefully reviewed for each entity type
-- 5. RLS policies may impact query performance - monitor and optimize as needed

-- Create indexes to support RLS policy performance
CREATE INDEX IF NOT EXISTS idx_tenant_members_tenant_user 
ON public.tenant_members (tenant_id, user_id);

CREATE INDEX IF NOT EXISTS idx_tenants_public 
ON public.tenants (is_public) 
WHERE is_public = TRUE;

CREATE INDEX IF NOT EXISTS idx_posts_tenant_public 
ON public.posts (tenant_id, is_public) 
WHERE is_public = TRUE;

COMMENT ON FUNCTION public.user_is_tenant_member IS 
'Helper function for RLS policies to check if the current user is a member of the specified tenant';

COMMENT ON FUNCTION public.tenant_is_public IS 
'Helper function for RLS policies to check if the specified tenant is public';
