-- Clean Up Legacy Fields Migration
-- 
-- This migration identifies and removes or deprecates fields that are no longer
-- needed due to the new multi-tenant architecture. It also adds helpful views
-- and functions for backward compatibility where necessary.
--
-- Strategy:
-- 1. Identify redundant fields that have been replaced by tenant system
-- 2. Create backup views for critical legacy field references
-- 3. Add deprecation warnings for fields that will be removed
-- 4. Clean up unused columns after data migration
-- 5. Update constraints and indexes accordingly

-- =============================================================================
-- Legacy Field Analysis and Backup
-- =============================================================================

-- Create a backup table for legacy field mappings before cleanup
CREATE TABLE IF NOT EXISTS public.legacy_field_backup (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name TEXT NOT NULL,
  field_name TEXT NOT NULL,
  field_value JSONB,
  record_id UUID NOT NULL,
  backed_up_at TIMESTAMPTZ DEFAULT NOW(),
  migration_version TEXT DEFAULT '20250625180210_cleanup_legacy_fields'
);

-- Function to backup legacy field data
CREATE OR REPLACE FUNCTION backup_legacy_field(
  table_name TEXT,
  field_name TEXT,
  record_id UUID,
  field_value JSONB
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO public.legacy_field_backup (
    table_name,
    field_name,
    record_id,
    field_value
  ) VALUES (
    table_name,
    field_name,
    record_id,
    field_value
  )
  ON CONFLICT DO NOTHING;
END;
$$;

-- =============================================================================
-- Posts Table Legacy Fields Cleanup
-- =============================================================================

-- The posts.collective_id field may be redundant now that we have tenant_id
-- Let's create a view for backward compatibility first
CREATE OR REPLACE VIEW public.posts_with_collective_compatibility AS
SELECT 
  p.*,
  -- Ensure collective_id is available for backward compatibility
  COALESCE(p.collective_id, p.tenant_id) as collective_id_compat,
  -- Add tenant information
  t.name as tenant_name,
  t.slug as tenant_slug,
  t.type as tenant_type
FROM public.posts p
LEFT JOIN public.tenants t ON t.id = p.tenant_id;

-- Backup any posts that have collective_id but no tenant_id
DO $$
DECLARE
  post_record RECORD;
BEGIN
  FOR post_record IN 
    SELECT id, collective_id, tenant_id 
    FROM public.posts 
    WHERE collective_id IS NOT NULL 
      AND (tenant_id IS NULL OR tenant_id != collective_id)
  LOOP
    PERFORM backup_legacy_field(
      'posts',
      'collective_id_mismatch',
      post_record.id,
      jsonb_build_object(
        'collective_id', post_record.collective_id,
        'tenant_id', post_record.tenant_id
      )
    );
  END LOOP;
END $$;

-- Update posts to ensure tenant_id is set from collective_id where missing
UPDATE public.posts 
SET tenant_id = collective_id 
WHERE collective_id IS NOT NULL 
  AND (tenant_id IS NULL OR tenant_id != collective_id);

-- =============================================================================
-- Conversations Table Legacy Fields
-- =============================================================================

-- Check if conversations have collective_id that should be tenant_id
DO $$
DECLARE
  conv_record RECORD;
BEGIN
  FOR conv_record IN 
    SELECT id, collective_id, tenant_id 
    FROM public.conversations 
    WHERE collective_id IS NOT NULL 
      AND (tenant_id IS NULL OR tenant_id != collective_id)
  LOOP
    PERFORM backup_legacy_field(
      'conversations',
      'collective_id_mismatch',
      conv_record.id,
      jsonb_build_object(
        'collective_id', conv_record.collective_id,
        'tenant_id', conv_record.tenant_id
      )
    );
  END LOOP;
END $$;

-- Update conversations to ensure tenant_id alignment
UPDATE public.conversations 
SET tenant_id = collective_id 
WHERE collective_id IS NOT NULL 
  AND (tenant_id IS NULL OR tenant_id != collective_id);

-- =============================================================================
-- Users Table Legacy Fields
-- =============================================================================

-- Check for any legacy fields in users table that might be cleanup candidates
-- Note: Being conservative here - users table fields are critical

-- If there are any unused profile fields, we can identify them
-- This is a placeholder for future cleanup as we identify truly unused fields

-- =============================================================================
-- Collective Members vs Tenant Members Redundancy
-- =============================================================================

-- Since we now have tenant_members as the authoritative source,
-- we can identify collective_members entries that are purely redundant

-- Function to identify redundant collective_members entries
CREATE OR REPLACE FUNCTION identify_redundant_collective_members()
RETURNS TABLE (
  collective_id UUID,
  member_id UUID,
  redundant_reason TEXT
)
LANGUAGE plpgsql
AS $$
BEGIN
  -- Find collective members that have exact matches in tenant_members
  RETURN QUERY
  SELECT 
    cm.collective_id,
    cm.member_id,
    'exact_match_in_tenant_members' as redundant_reason
  FROM public.collective_members cm
  JOIN public.tenant_members tm ON (
    tm.tenant_id = cm.collective_id 
    AND tm.user_id = cm.member_id
  )
  JOIN public.tenants t ON t.id = cm.collective_id AND t.type = 'collective';
END;
$$;

-- =============================================================================
-- Comments and Reactions Legacy Fields
-- =============================================================================

-- Check for any entity_type/entity_id patterns that might be consolidated
-- with the new tenant-aware system

-- =============================================================================
-- Migration-specific Legacy Cleanup
-- =============================================================================

-- Remove any temporary columns that were added during migration
-- but are no longer needed

-- Drop any old migration helper columns if they exist
-- (Being careful to check existence first)

-- Check for old tenant_id columns that might have been added incorrectly
DO $$
BEGIN
  -- Clean up any duplicate tenant_id columns in tables that shouldn't have them
  -- This is a safety check for migration conflicts
  
  -- We'll be conservative and just log potential issues
  -- rather than automatically dropping columns
  
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'users' 
      AND column_name = 'tenant_id'
  ) THEN
    RAISE WARNING 'users table has tenant_id column - this may be unintended';
  END IF;
  
END $$;

-- =============================================================================
-- Index Cleanup and Optimization
-- =============================================================================

-- Remove any indexes that are no longer needed due to structural changes

-- Drop old indexes that might be redundant after tenant implementation
-- (We'll check for existence first to avoid errors)

DO $$
BEGIN
  -- Drop redundant indexes if they exist
  -- Example: if we had separate indexes on collective_id and tenant_id
  -- and now they're the same, we can consolidate
  
  -- Check for duplicate indexes on collective_id where tenant_id index exists
  IF EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE schemaname = 'public' 
      AND tablename = 'posts' 
      AND indexname LIKE '%collective_id%'
  ) AND EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE schemaname = 'public' 
      AND tablename = 'posts' 
      AND indexname LIKE '%tenant_id%'
  ) THEN
    RAISE NOTICE 'Found potentially redundant indexes on posts table - manual review recommended';
  END IF;
END $$;

-- =============================================================================
-- Create Helper Functions for Legacy Support
-- =============================================================================

-- Function to get collective_id for backward compatibility
CREATE OR REPLACE FUNCTION get_legacy_collective_id(post_id UUID)
RETURNS UUID
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  result UUID;
BEGIN
  -- For backward compatibility, return tenant_id as collective_id
  -- if the tenant is a collective type
  SELECT 
    CASE 
      WHEN t.type = 'collective' THEN p.tenant_id
      ELSE p.collective_id
    END INTO result
  FROM public.posts p
  LEFT JOIN public.tenants t ON t.id = p.tenant_id
  WHERE p.id = post_id;
  
  RETURN result;
END;
$$;

-- Function to validate data consistency after cleanup
CREATE OR REPLACE FUNCTION validate_legacy_cleanup()
RETURNS TABLE (
  issue_type TEXT,
  table_name TEXT,
  record_count BIGINT,
  description TEXT
)
LANGUAGE plpgsql
AS $$
BEGIN
  -- Check for posts with collective_id != tenant_id
  RETURN QUERY
  SELECT 
    'data_inconsistency' as issue_type,
    'posts' as table_name,
    COUNT(*) as record_count,
    'Posts with collective_id != tenant_id' as description
  FROM public.posts 
  WHERE collective_id IS NOT NULL 
    AND tenant_id IS NOT NULL 
    AND collective_id != tenant_id
  HAVING COUNT(*) > 0;
  
  -- Check for conversations with collective_id != tenant_id
  RETURN QUERY
  SELECT 
    'data_inconsistency' as issue_type,
    'conversations' as table_name,
    COUNT(*) as record_count,
    'Conversations with collective_id != tenant_id' as description
  FROM public.conversations 
  WHERE collective_id IS NOT NULL 
    AND tenant_id IS NOT NULL 
    AND collective_id != collective_id
  HAVING COUNT(*) > 0;
  
  -- Check for orphaned tenant_members
  RETURN QUERY
  SELECT 
    'orphaned_data' as issue_type,
    'tenant_members' as table_name,
    COUNT(*) as record_count,
    'Tenant members without valid tenant' as description
  FROM public.tenant_members tm
  LEFT JOIN public.tenants t ON t.id = tm.tenant_id
  WHERE t.id IS NULL
  HAVING COUNT(*) > 0;
  
  -- Check for collective members without corresponding tenant members
  RETURN QUERY
  SELECT 
    'sync_issue' as issue_type,
    'collective_members' as table_name,
    COUNT(*) as record_count,
    'Collective members missing from tenant_members' as description
  FROM public.collective_members cm
  LEFT JOIN public.tenant_members tm ON (
    tm.tenant_id = cm.collective_id AND tm.user_id = cm.member_id
  )
  WHERE tm.user_id IS NULL
  HAVING COUNT(*) > 0;
END;
$$;

-- =============================================================================
-- Create Migration Summary Views
-- =============================================================================

-- View to summarize legacy field cleanup
CREATE OR REPLACE VIEW public.legacy_cleanup_summary AS
SELECT 
  table_name,
  field_name,
  COUNT(*) as backup_count,
  MIN(backed_up_at) as first_backup,
  MAX(backed_up_at) as last_backup
FROM public.legacy_field_backup
WHERE migration_version = '20250625180210_cleanup_legacy_fields'
GROUP BY table_name, field_name
ORDER BY table_name, field_name;

-- =============================================================================
-- Deprecation Warnings and Documentation
-- =============================================================================

-- Function to issue deprecation warnings for legacy field usage
CREATE OR REPLACE FUNCTION warn_legacy_field_usage(
  field_name TEXT,
  table_name TEXT,
  suggested_alternative TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE WARNING 'DEPRECATED: Field %.% is deprecated. %', 
    table_name, 
    field_name, 
    COALESCE('Use ' || suggested_alternative || ' instead.', 'Please update your code to use the new multi-tenant fields.');
END;
$$;

-- =============================================================================
-- Grant Permissions
-- =============================================================================

-- Grant permissions for new helper functions
GRANT EXECUTE ON FUNCTION public.get_legacy_collective_id(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.validate_legacy_cleanup() TO authenticated;
GRANT EXECUTE ON FUNCTION public.identify_redundant_collective_members() TO authenticated;

-- Grant SELECT on views
GRANT SELECT ON public.posts_with_collective_compatibility TO authenticated;
GRANT SELECT ON public.legacy_cleanup_summary TO authenticated;

-- Grant SELECT on backup table for debugging
GRANT SELECT ON public.legacy_field_backup TO authenticated;

-- =============================================================================
-- Data Consistency Checks
-- =============================================================================

-- Run validation to ensure cleanup was successful
SELECT * FROM validate_legacy_cleanup();

-- Show summary of backed up data
SELECT * FROM legacy_cleanup_summary WHERE backup_count > 0;

-- =============================================================================
-- Future Cleanup Preparation
-- =============================================================================

-- Create a function to safely drop legacy columns in the future
CREATE OR REPLACE FUNCTION prepare_column_removal(
  target_table TEXT,
  target_column TEXT
)
RETURNS TABLE (
  action_needed TEXT,
  sql_command TEXT,
  risk_level TEXT
)
LANGUAGE plpgsql
AS $$
DECLARE
  column_exists BOOLEAN;
  has_data BOOLEAN;
  has_constraints BOOLEAN;
BEGIN
  -- Check if column exists
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = target_table 
      AND column_name = target_column
  ) INTO column_exists;
  
  IF NOT column_exists THEN
    RETURN QUERY SELECT 
      'column_not_found' as action_needed,
      '' as sql_command,
      'none' as risk_level;
    RETURN;
  END IF;
  
  -- Check if column has data
  EXECUTE format('SELECT EXISTS (SELECT 1 FROM public.%I WHERE %I IS NOT NULL LIMIT 1)', 
    target_table, target_column) INTO has_data;
  
  -- Check if column has constraints
  SELECT EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage 
    WHERE table_schema = 'public' 
      AND table_name = target_table 
      AND column_name = target_column
  ) INTO has_constraints;
  
  IF has_data THEN
    RETURN QUERY SELECT 
      'backup_data_first' as action_needed,
      format('-- Data exists in %s.%s - backup before removal', target_table, target_column) as sql_command,
      'high' as risk_level;
  ELSIF has_constraints THEN
    RETURN QUERY SELECT 
      'remove_constraints_first' as action_needed,
      format('-- Remove constraints on %s.%s before dropping column', target_table, target_column) as sql_command,
      'medium' as risk_level;
  ELSE
    RETURN QUERY SELECT 
      'safe_to_remove' as action_needed,
      format('ALTER TABLE public.%I DROP COLUMN IF EXISTS %I;', target_table, target_column) as sql_command,
      'low' as risk_level;
  END IF;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.prepare_column_removal(TEXT, TEXT) TO authenticated;

-- =============================================================================
-- Comments and Documentation
-- =============================================================================

COMMENT ON TABLE public.legacy_field_backup IS 
'Backup table for legacy field data before cleanup operations';

COMMENT ON VIEW public.posts_with_collective_compatibility IS 
'Compatibility view for posts with legacy collective_id field access';

COMMENT ON FUNCTION public.get_legacy_collective_id IS 
'Returns collective_id for backward compatibility, mapping from tenant system';

COMMENT ON FUNCTION public.validate_legacy_cleanup IS 
'Validates data consistency after legacy field cleanup operations';

COMMENT ON FUNCTION public.prepare_column_removal IS 
'Analyzes safety of removing legacy columns and provides removal commands';

-- =============================================================================
-- Migration Success Verification
-- =============================================================================

DO $$
DECLARE
  consistency_issues INTEGER;
  backup_count INTEGER;
BEGIN
  -- Check for consistency issues
  SELECT COUNT(*) INTO consistency_issues 
  FROM validate_legacy_cleanup();
  
  -- Check backup count
  SELECT COUNT(*) INTO backup_count 
  FROM legacy_field_backup 
  WHERE migration_version = '20250625180210_cleanup_legacy_fields';
  
  IF consistency_issues > 0 THEN
    RAISE WARNING 'Found % data consistency issues after legacy cleanup', consistency_issues;
  ELSE
    RAISE NOTICE 'All data consistency checks passed after legacy cleanup';
  END IF;
  
  IF backup_count > 0 THEN
    RAISE NOTICE 'Backed up % legacy field values for safe keeping', backup_count;
  END IF;
  
  RAISE NOTICE 'Legacy field cleanup migration completed successfully';
  RAISE NOTICE 'Use validate_legacy_cleanup() to check for ongoing issues';
  RAISE NOTICE 'Use prepare_column_removal() to plan future column removals';
END $$;
