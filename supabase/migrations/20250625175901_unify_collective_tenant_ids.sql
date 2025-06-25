-- Unify Collective ID and Tenant ID Migration
-- 
-- This migration ensures that collective.id = tenant.id for collectives,
-- eliminating confusion and simplifying the multi-tenant architecture.
--
-- Strategy:
-- 1. For existing collectives without matching tenants, create tenants with same ID
-- 2. For existing tenants without matching collectives, leave as-is (personal tenants)
-- 3. Add foreign key constraint to ensure consistency
-- 4. Update RPC functions to maintain this relationship

-- =============================================================================
-- Data Consistency Check and Repair
-- =============================================================================

-- Function to sync existing collectives with tenants
CREATE OR REPLACE FUNCTION sync_collective_tenant_ids()
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  collective_record RECORD;
  tenant_record RECORD;
  synced_count INTEGER := 0;
BEGIN
  -- For each collective that doesn't have a matching tenant, create one
  FOR collective_record IN 
    SELECT c.id, c.name, c.slug, c.description, c.is_public, c.owner_id, c.created_at
    FROM public.collectives c
    LEFT JOIN public.tenants t ON c.id = t.id
    WHERE t.id IS NULL
  LOOP
    -- Create matching tenant with same ID
    INSERT INTO public.tenants (
      id,
      name,
      slug,
      description,
      type,
      is_public,
      created_at,
      updated_at
    ) VALUES (
      collective_record.id,
      collective_record.name,
      collective_record.slug,
      collective_record.description,
      'collective',
      COALESCE(collective_record.is_public, false),
      collective_record.created_at,
      NOW()
    );
    
    -- Ensure the collective owner is in tenant_members
    INSERT INTO public.tenant_members (
      tenant_id,
      user_id,
      role,
      joined_at
    ) VALUES (
      collective_record.id,
      collective_record.owner_id,
      'owner',
      collective_record.created_at
    )
    ON CONFLICT (tenant_id, user_id) DO UPDATE SET
      role = EXCLUDED.role,
      joined_at = LEAST(tenant_members.joined_at, EXCLUDED.joined_at);
    
    synced_count := synced_count + 1;
  END LOOP;
  
  RETURN synced_count;
END;
$$;

-- Execute the sync function
SELECT sync_collective_tenant_ids() as synced_collectives;

-- =============================================================================
-- Add Foreign Key Constraint
-- =============================================================================

-- Add foreign key constraint to ensure collective.id references tenants.id
-- Only if the constraint doesn't already exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.table_constraints 
    WHERE constraint_schema = 'public' 
      AND table_name = 'collectives' 
      AND constraint_name = 'collectives_id_fkey'
  ) THEN
    ALTER TABLE public.collectives 
    ADD CONSTRAINT collectives_id_fkey 
    FOREIGN KEY (id) REFERENCES public.tenants(id) ON DELETE CASCADE;
  END IF;
END $$;

-- =============================================================================
-- Update RPC Functions for Unified ID Management
-- =============================================================================

-- Update create_collective_tenant to ensure unified IDs
CREATE OR REPLACE FUNCTION public.create_collective_tenant(
  tenant_name TEXT,
  tenant_slug TEXT,
  tenant_description TEXT DEFAULT NULL,
  is_public BOOLEAN DEFAULT FALSE
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_id UUID;
  current_user_id UUID;
BEGIN
  -- Get current user
  current_user_id := auth.uid();
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated to create a collective tenant';
  END IF;
  
  -- Generate a single UUID for both tenant and collective
  new_id := gen_random_uuid();
  
  -- Create tenant record first
  INSERT INTO public.tenants (
    id,
    name,
    slug,
    description,
    type,
    is_public,
    created_at,
    updated_at
  ) VALUES (
    new_id,
    tenant_name,
    tenant_slug,
    tenant_description,
    'collective',
    is_public,
    NOW(),
    NOW()
  );
  
  -- Create collective record with same ID
  INSERT INTO public.collectives (
    id,
    name,
    slug,
    description,
    owner_id,
    is_public,
    created_at,
    updated_at
  ) VALUES (
    new_id,
    tenant_name,
    tenant_slug,
    tenant_description,
    current_user_id,
    is_public,
    NOW(),
    NOW()
  );
  
  -- Add creator as owner in tenant_members
  INSERT INTO public.tenant_members (
    tenant_id,
    user_id,
    role,
    joined_at
  ) VALUES (
    new_id,
    current_user_id,
    'owner',
    NOW()
  );
  
  -- Also add to collective_members for backward compatibility
  INSERT INTO public.collective_members (
    collective_id,
    member_id,
    role,
    joined_at
  ) VALUES (
    new_id,
    current_user_id,
    'admin',
    NOW()
  )
  ON CONFLICT (collective_id, member_id) DO NOTHING;
  
  RETURN new_id;
END;
$$;

-- =============================================================================
-- Helper Functions for ID Consistency
-- =============================================================================

-- Function to validate collective-tenant ID consistency
CREATE OR REPLACE FUNCTION validate_collective_tenant_consistency()
RETURNS TABLE (
  collective_id UUID,
  tenant_id UUID,
  issue_type TEXT
)
LANGUAGE plpgsql
AS $$
BEGIN
  -- Find collectives without matching tenants
  RETURN QUERY
  SELECT 
    c.id as collective_id,
    NULL::UUID as tenant_id,
    'collective_without_tenant' as issue_type
  FROM public.collectives c
  LEFT JOIN public.tenants t ON c.id = t.id
  WHERE t.id IS NULL;
  
  -- Find collective-type tenants without matching collectives
  RETURN QUERY
  SELECT 
    NULL::UUID as collective_id,
    t.id as tenant_id,
    'tenant_without_collective' as issue_type
  FROM public.tenants t
  LEFT JOIN public.collectives c ON t.id = c.id
  WHERE t.type = 'collective' AND c.id IS NULL;
END;
$$;

-- =============================================================================
-- Update Post Creation Logic to Use Unified IDs
-- =============================================================================

-- Function to get tenant ID for a collective (now they're the same)
CREATE OR REPLACE FUNCTION get_collective_tenant_id(collective_uuid UUID)
RETURNS UUID
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  -- With unified IDs, collective ID = tenant ID
  RETURN collective_uuid;
END;
$$;

-- =============================================================================
-- Trigger to Maintain ID Consistency
-- =============================================================================

-- Trigger function to ensure collective-tenant ID consistency
CREATE OR REPLACE FUNCTION maintain_collective_tenant_consistency()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- When inserting a collective, ensure tenant exists with same ID
    IF NOT EXISTS (SELECT 1 FROM public.tenants WHERE id = NEW.id) THEN
      INSERT INTO public.tenants (
        id, name, slug, description, type, is_public, created_at, updated_at
      ) VALUES (
        NEW.id, NEW.name, NEW.slug, NEW.description, 'collective', 
        COALESCE(NEW.is_public, false), NEW.created_at, NEW.updated_at
      );
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    -- When updating a collective, update corresponding tenant
    UPDATE public.tenants SET
      name = NEW.name,
      slug = NEW.slug,
      description = NEW.description,
      is_public = COALESCE(NEW.is_public, false),
      updated_at = NEW.updated_at
    WHERE id = NEW.id AND type = 'collective';
  ELSIF TG_OP = 'DELETE' THEN
    -- When deleting a collective, delete corresponding tenant
    DELETE FROM public.tenants 
    WHERE id = OLD.id AND type = 'collective';
    RETURN OLD;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to maintain consistency
DROP TRIGGER IF EXISTS trigger_maintain_collective_tenant_consistency ON public.collectives;
CREATE TRIGGER trigger_maintain_collective_tenant_consistency
  AFTER INSERT OR UPDATE OR DELETE ON public.collectives
  FOR EACH ROW
  EXECUTE FUNCTION maintain_collective_tenant_consistency();

-- =============================================================================
-- Update Existing Helper Functions
-- =============================================================================

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_collective_tenant_id(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.validate_collective_tenant_consistency() TO authenticated;

-- =============================================================================
-- Data Validation and Cleanup
-- =============================================================================

-- Run validation to check for any remaining inconsistencies
-- This will return any issues that need manual resolution
SELECT * FROM validate_collective_tenant_consistency();

-- Update any posts that might reference collective_id as tenant_id
-- (This ensures posts have correct tenant_id)
UPDATE public.posts 
SET tenant_id = collective_id 
WHERE collective_id IS NOT NULL 
  AND (tenant_id IS NULL OR tenant_id != collective_id);

-- =============================================================================
-- Clean up temporary functions
-- =============================================================================

DROP FUNCTION IF EXISTS sync_collective_tenant_ids();

-- =============================================================================
-- Comments and Documentation
-- =============================================================================

COMMENT ON CONSTRAINT collectives_id_fkey ON public.collectives IS 
'Ensures collective.id always references a valid tenant.id, maintaining unified ID structure';

COMMENT ON FUNCTION public.get_collective_tenant_id IS 
'Returns tenant ID for a collective (now always the same as collective ID)';

COMMENT ON FUNCTION public.validate_collective_tenant_consistency IS 
'Validates that all collectives have corresponding tenants with matching IDs';

COMMENT ON FUNCTION public.create_collective_tenant IS 
'Creates a new collective and tenant with unified ID, ensuring consistency';

-- =============================================================================
-- Migration Success Verification
-- =============================================================================

-- Verify no orphaned collectives or tenants
DO $$
DECLARE
  orphaned_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO orphaned_count 
  FROM validate_collective_tenant_consistency();
  
  IF orphaned_count > 0 THEN
    RAISE WARNING 'Found % orphaned collective/tenant relationships that may need manual resolution', orphaned_count;
  ELSE
    RAISE NOTICE 'All collective-tenant ID relationships are consistent';
  END IF;
END $$;
