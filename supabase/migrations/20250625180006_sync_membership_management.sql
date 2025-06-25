-- Sync Membership Management Migration
-- 
-- This migration consolidates membership management to use tenant_members
-- as the authoritative source while maintaining backward compatibility
-- with collective_members.
--
-- Strategy:
-- 1. Sync existing collective_members to tenant_members
-- 2. Create triggers to maintain dual writes during transition
-- 3. Add helper functions for unified membership operations
-- 4. Deprecate direct collective_members usage in favor of tenant_members

-- =============================================================================
-- Role Mapping Between Systems
-- =============================================================================

-- Function to map collective roles to tenant roles
CREATE OR REPLACE FUNCTION map_collective_role_to_tenant_role(collective_role TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  -- Map collective member roles to tenant member roles
  CASE collective_role
    WHEN 'owner' THEN RETURN 'owner';
    WHEN 'admin' THEN RETURN 'admin';
    WHEN 'editor' THEN RETURN 'member';
    WHEN 'viewer' THEN RETURN 'viewer';
    WHEN 'member' THEN RETURN 'member';
    ELSE RETURN 'member'; -- Default fallback
  END CASE;
END;
$$;

-- Function to map tenant roles to collective roles
CREATE OR REPLACE FUNCTION map_tenant_role_to_collective_role(tenant_role TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  -- Map tenant member roles to collective member roles
  CASE tenant_role
    WHEN 'owner' THEN RETURN 'admin'; -- Collective doesn't have 'owner' role
    WHEN 'admin' THEN RETURN 'admin';
    WHEN 'member' THEN RETURN 'editor';
    WHEN 'viewer' THEN RETURN 'viewer';
    ELSE RETURN 'editor'; -- Default fallback
  END CASE;
END;
$$;

-- =============================================================================
-- Data Synchronization Functions
-- =============================================================================

-- Function to sync collective_members to tenant_members
CREATE OR REPLACE FUNCTION sync_collective_to_tenant_members()
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  member_record RECORD;
  synced_count INTEGER := 0;
BEGIN
  -- For each collective member, ensure they exist in tenant_members
  FOR member_record IN 
    SELECT 
      cm.collective_id,
      cm.member_id as user_id,
      cm.role as collective_role,
      cm.joined_at,
      cm.created_at,
      c.owner_id
    FROM public.collective_members cm
    JOIN public.collectives c ON c.id = cm.collective_id
  LOOP
    -- Insert or update in tenant_members
    INSERT INTO public.tenant_members (
      tenant_id,
      user_id,
      role,
      joined_at,
      created_at,
      updated_at
    ) VALUES (
      member_record.collective_id, -- collective_id = tenant_id
      member_record.user_id,
      CASE 
        -- If user is the collective owner, they should be 'owner' in tenant
        WHEN member_record.user_id = member_record.owner_id THEN 'owner'
        ELSE map_collective_role_to_tenant_role(member_record.collective_role)
      END,
      member_record.joined_at,
      COALESCE(member_record.created_at, member_record.joined_at),
      NOW()
    )
    ON CONFLICT (tenant_id, user_id) DO UPDATE SET
      role = CASE 
        -- Preserve owner role if user is collective owner
        WHEN member_record.user_id = member_record.owner_id THEN 'owner'
        ELSE map_collective_role_to_tenant_role(member_record.collective_role)
      END,
      joined_at = LEAST(tenant_members.joined_at, EXCLUDED.joined_at),
      updated_at = NOW();
    
    synced_count := synced_count + 1;
  END LOOP;
  
  RETURN synced_count;
END;
$$;

-- Function to sync tenant_members back to collective_members (for backward compatibility)
CREATE OR REPLACE FUNCTION sync_tenant_to_collective_members()
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  member_record RECORD;
  synced_count INTEGER := 0;
BEGIN
  -- For each tenant member in a collective tenant, ensure they exist in collective_members
  FOR member_record IN 
    SELECT 
      tm.tenant_id,
      tm.user_id,
      tm.role as tenant_role,
      tm.joined_at,
      tm.created_at
    FROM public.tenant_members tm
    JOIN public.tenants t ON t.id = tm.tenant_id
    WHERE t.type = 'collective'
  LOOP
    -- Insert or update in collective_members
    INSERT INTO public.collective_members (
      collective_id,
      member_id,
      role,
      joined_at,
      created_at,
      updated_at
    ) VALUES (
      member_record.tenant_id, -- tenant_id = collective_id
      member_record.user_id,
      map_tenant_role_to_collective_role(member_record.tenant_role),
      member_record.joined_at,
      COALESCE(member_record.created_at, member_record.joined_at),
      NOW()
    )
    ON CONFLICT (collective_id, member_id) DO UPDATE SET
      role = map_tenant_role_to_collective_role(member_record.tenant_role),
      joined_at = LEAST(collective_members.joined_at, EXCLUDED.joined_at),
      updated_at = NOW();
    
    synced_count := synced_count + 1;
  END LOOP;
  
  RETURN synced_count;
END;
$$;

-- Execute initial synchronization
SELECT sync_collective_to_tenant_members() as collective_to_tenant_synced;
SELECT sync_tenant_to_collective_members() as tenant_to_collective_synced;

-- =============================================================================
-- Unified Membership Management Functions
-- =============================================================================

-- Function to add a member to a tenant (and collective if applicable)
CREATE OR REPLACE FUNCTION add_tenant_member(
  target_tenant_id UUID,
  target_user_id UUID,
  member_role TEXT DEFAULT 'member'
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  tenant_type TEXT;
BEGIN
  -- Verify tenant exists and get its type
  SELECT type INTO tenant_type 
  FROM public.tenants 
  WHERE id = target_tenant_id;
  
  IF tenant_type IS NULL THEN
    RAISE EXCEPTION 'Tenant not found: %', target_tenant_id;
  END IF;
  
  -- Add to tenant_members (authoritative source)
  INSERT INTO public.tenant_members (
    tenant_id,
    user_id,
    role,
    joined_at
  ) VALUES (
    target_tenant_id,
    target_user_id,
    member_role,
    NOW()
  )
  ON CONFLICT (tenant_id, user_id) DO UPDATE SET
    role = EXCLUDED.role,
    updated_at = NOW();
  
  -- If it's a collective tenant, also add to collective_members for backward compatibility
  IF tenant_type = 'collective' THEN
    INSERT INTO public.collective_members (
      collective_id,
      member_id,
      role,
      joined_at
    ) VALUES (
      target_tenant_id,
      target_user_id,
      map_tenant_role_to_collective_role(member_role),
      NOW()
    )
    ON CONFLICT (collective_id, member_id) DO UPDATE SET
      role = map_tenant_role_to_collective_role(member_role),
      updated_at = NOW();
  END IF;
  
  RETURN TRUE;
END;
$$;

-- Function to remove a member from a tenant (and collective if applicable)
CREATE OR REPLACE FUNCTION remove_tenant_member(
  target_tenant_id UUID,
  target_user_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  tenant_type TEXT;
BEGIN
  -- Verify tenant exists and get its type
  SELECT type INTO tenant_type 
  FROM public.tenants 
  WHERE id = target_tenant_id;
  
  IF tenant_type IS NULL THEN
    RAISE EXCEPTION 'Tenant not found: %', target_tenant_id;
  END IF;
  
  -- Remove from tenant_members (authoritative source)
  DELETE FROM public.tenant_members 
  WHERE tenant_id = target_tenant_id AND user_id = target_user_id;
  
  -- If it's a collective tenant, also remove from collective_members
  IF tenant_type = 'collective' THEN
    DELETE FROM public.collective_members 
    WHERE collective_id = target_tenant_id AND member_id = target_user_id;
  END IF;
  
  RETURN TRUE;
END;
$$;

-- Function to update a member's role in a tenant
CREATE OR REPLACE FUNCTION update_tenant_member_role(
  target_tenant_id UUID,
  target_user_id UUID,
  new_role TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  tenant_type TEXT;
BEGIN
  -- Verify tenant exists and get its type
  SELECT type INTO tenant_type 
  FROM public.tenants 
  WHERE id = target_tenant_id;
  
  IF tenant_type IS NULL THEN
    RAISE EXCEPTION 'Tenant not found: %', target_tenant_id;
  END IF;
  
  -- Update in tenant_members (authoritative source)
  UPDATE public.tenant_members 
  SET role = new_role, updated_at = NOW()
  WHERE tenant_id = target_tenant_id AND user_id = target_user_id;
  
  -- If it's a collective tenant, also update collective_members
  IF tenant_type = 'collective' THEN
    UPDATE public.collective_members 
    SET role = map_tenant_role_to_collective_role(new_role), updated_at = NOW()
    WHERE collective_id = target_tenant_id AND member_id = target_user_id;
  END IF;
  
  RETURN TRUE;
END;
$$;

-- =============================================================================
-- Triggers for Automatic Synchronization
-- =============================================================================

-- Trigger function to sync tenant_members changes to collective_members
CREATE OR REPLACE FUNCTION sync_tenant_member_changes()
RETURNS TRIGGER AS $$
DECLARE
  tenant_type TEXT;
BEGIN
  -- Get tenant type to determine if sync is needed
  SELECT type INTO tenant_type 
  FROM public.tenants 
  WHERE id = COALESCE(NEW.tenant_id, OLD.tenant_id);
  
  -- Only sync for collective tenants
  IF tenant_type != 'collective' THEN
    RETURN COALESCE(NEW, OLD);
  END IF;
  
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    -- Sync to collective_members
    INSERT INTO public.collective_members (
      collective_id,
      member_id,
      role,
      joined_at,
      created_at,
      updated_at
    ) VALUES (
      NEW.tenant_id,
      NEW.user_id,
      map_tenant_role_to_collective_role(NEW.role),
      NEW.joined_at,
      NEW.created_at,
      NEW.updated_at
    )
    ON CONFLICT (collective_id, member_id) DO UPDATE SET
      role = map_tenant_role_to_collective_role(NEW.role),
      joined_at = LEAST(collective_members.joined_at, EXCLUDED.joined_at),
      updated_at = EXCLUDED.updated_at;
    
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    -- Remove from collective_members
    DELETE FROM public.collective_members 
    WHERE collective_id = OLD.tenant_id AND member_id = OLD.user_id;
    
    RETURN OLD;
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on tenant_members
DROP TRIGGER IF EXISTS trigger_sync_tenant_member_changes ON public.tenant_members;
CREATE TRIGGER trigger_sync_tenant_member_changes
  AFTER INSERT OR UPDATE OR DELETE ON public.tenant_members
  FOR EACH ROW
  EXECUTE FUNCTION sync_tenant_member_changes();

-- =============================================================================
-- Membership Query Helper Functions
-- =============================================================================

-- Function to get all members of a tenant with unified data
CREATE OR REPLACE FUNCTION get_tenant_members(target_tenant_id UUID)
RETURNS TABLE (
  user_id UUID,
  role TEXT,
  joined_at TIMESTAMPTZ,
  user_email TEXT,
  user_full_name TEXT,
  user_username TEXT,
  user_avatar_url TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    tm.user_id,
    tm.role,
    tm.joined_at,
    u.email as user_email,
    u.full_name as user_full_name,
    u.username as user_username,
    u.avatar_url as user_avatar_url
  FROM public.tenant_members tm
  JOIN public.users u ON u.id = tm.user_id
  WHERE tm.tenant_id = target_tenant_id
  ORDER BY tm.joined_at ASC;
END;
$$;

-- Function to get user's tenant memberships
CREATE OR REPLACE FUNCTION get_user_tenant_memberships(target_user_id UUID)
RETURNS TABLE (
  tenant_id UUID,
  tenant_name TEXT,
  tenant_slug TEXT,
  tenant_type TEXT,
  user_role TEXT,
  joined_at TIMESTAMPTZ,
  is_public BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    tm.tenant_id,
    t.name as tenant_name,
    t.slug as tenant_slug,
    t.type as tenant_type,
    tm.role as user_role,
    tm.joined_at,
    t.is_public
  FROM public.tenant_members tm
  JOIN public.tenants t ON t.id = tm.tenant_id
  WHERE tm.user_id = target_user_id
  ORDER BY tm.joined_at ASC;
END;
$$;

-- =============================================================================
-- Migration Validation Functions
-- =============================================================================

-- Function to validate membership synchronization
CREATE OR REPLACE FUNCTION validate_membership_sync()
RETURNS TABLE (
  issue_type TEXT,
  tenant_id UUID,
  user_id UUID,
  details TEXT
)
LANGUAGE plpgsql
AS $$
BEGIN
  -- Find collective members not in tenant_members
  RETURN QUERY
  SELECT 
    'collective_member_missing_from_tenant' as issue_type,
    cm.collective_id as tenant_id,
    cm.member_id as user_id,
    'Collective member not found in tenant_members' as details
  FROM public.collective_members cm
  JOIN public.tenants t ON t.id = cm.collective_id AND t.type = 'collective'
  LEFT JOIN public.tenant_members tm ON tm.tenant_id = cm.collective_id AND tm.user_id = cm.member_id
  WHERE tm.user_id IS NULL;
  
  -- Find tenant members (collective tenants) not in collective_members
  RETURN QUERY
  SELECT 
    'tenant_member_missing_from_collective' as issue_type,
    tm.tenant_id,
    tm.user_id,
    'Tenant member not found in collective_members' as details
  FROM public.tenant_members tm
  JOIN public.tenants t ON t.id = tm.tenant_id AND t.type = 'collective'
  LEFT JOIN public.collective_members cm ON cm.collective_id = tm.tenant_id AND cm.member_id = tm.user_id
  WHERE cm.member_id IS NULL;
END;
$$;

-- =============================================================================
-- Grant Permissions
-- =============================================================================

-- Grant execute permissions on new functions
GRANT EXECUTE ON FUNCTION public.add_tenant_member(UUID, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.remove_tenant_member(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_tenant_member_role(UUID, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_tenant_members(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_tenant_memberships(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.validate_membership_sync() TO authenticated;

-- Grant execute on mapping functions
GRANT EXECUTE ON FUNCTION public.map_collective_role_to_tenant_role(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.map_tenant_role_to_collective_role(TEXT) TO authenticated;

-- =============================================================================
-- Clean Up Temporary Functions
-- =============================================================================

DROP FUNCTION IF EXISTS sync_collective_to_tenant_members();
DROP FUNCTION IF EXISTS sync_tenant_to_collective_members();

-- =============================================================================
-- Migration Validation
-- =============================================================================

-- Run validation to check synchronization status
SELECT * FROM validate_membership_sync();

-- =============================================================================
-- Comments and Documentation
-- =============================================================================

COMMENT ON FUNCTION public.add_tenant_member IS 
'Unified function to add a member to a tenant, automatically syncing with collective_members if needed';

COMMENT ON FUNCTION public.remove_tenant_member IS 
'Unified function to remove a member from a tenant, automatically syncing with collective_members if needed';

COMMENT ON FUNCTION public.update_tenant_member_role IS 
'Unified function to update a member role in a tenant, automatically syncing with collective_members if needed';

COMMENT ON FUNCTION public.get_tenant_members IS 
'Get all members of a tenant with their user information and roles';

COMMENT ON FUNCTION public.get_user_tenant_memberships IS 
'Get all tenant memberships for a user with tenant information and roles';

COMMENT ON FUNCTION public.validate_membership_sync IS 
'Validate that tenant_members and collective_members are properly synchronized';

-- =============================================================================
-- Migration Success Summary
-- =============================================================================

DO $$
DECLARE
  sync_issues INTEGER;
BEGIN
  SELECT COUNT(*) INTO sync_issues 
  FROM validate_membership_sync();
  
  IF sync_issues > 0 THEN
    RAISE WARNING 'Found % membership synchronization issues that may need attention', sync_issues;
  ELSE
    RAISE NOTICE 'All membership data is properly synchronized between tables';
  END IF;
  
  RAISE NOTICE 'Membership management migration completed successfully';
  RAISE NOTICE 'tenant_members is now the authoritative source for membership data';
  RAISE NOTICE 'collective_members is maintained for backward compatibility via triggers';
END $$;
