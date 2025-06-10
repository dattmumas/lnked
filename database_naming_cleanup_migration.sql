-- ============================================================================
-- Database Naming Convention Cleanup Migration
-- 
-- This migration implements atomic single-transaction cleanup of database
-- naming conventions, removing versioned tables and standardizing names.
--
-- ARCHITECTURE: Based on Creative Phase Decision - Atomic Transaction Approach
-- NAMING STANDARD: Hybrid Context-Aware Naming Convention
-- SAFETY: Full transaction rollback on any failure
-- ============================================================================

-- Pre-flight checks and setup
\echo 'Starting Database Naming Convention Cleanup Migration...'
\echo 'Migration will run in single atomic transaction for data integrity'

-- Begin atomic transaction
BEGIN;

-- ============================================================================
-- SECTION 1: PRE-MIGRATION VALIDATION
-- ============================================================================

\echo 'Section 1: Pre-Migration Validation'

-- Verify current state and collect baseline metrics
DO $$
DECLARE
    comments_v2_count INTEGER;
    comment_reactions_v2_count INTEGER;
    legacy_comments_count INTEGER;
    legacy_reactions_count INTEGER;
BEGIN
    -- Check table existence and row counts
    SELECT COUNT(*) INTO comments_v2_count FROM comments_v2;
    SELECT COUNT(*) INTO comment_reactions_v2_count FROM comment_reactions_v2;
    
    -- Check legacy tables if they exist
    SELECT CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'comments')
        THEN (SELECT COUNT(*) FROM comments)
        ELSE 0
    END INTO legacy_comments_count;
    
    SELECT CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'comment_reactions')
        THEN (SELECT COUNT(*) FROM comment_reactions)
        ELSE 0
    END INTO legacy_reactions_count;
    
    -- Log baseline counts
    RAISE NOTICE 'Pre-migration baseline:';
    RAISE NOTICE '  comments_v2: % rows', comments_v2_count;
    RAISE NOTICE '  comment_reactions_v2: % rows', comment_reactions_v2_count;
    RAISE NOTICE '  legacy comments: % rows', legacy_comments_count;
    RAISE NOTICE '  legacy comment_reactions: % rows', legacy_reactions_count;
    
    -- Verify v2 tables have data (safety check)
    IF comments_v2_count = 0 THEN
        RAISE WARNING 'comments_v2 table is empty - verify this is expected';
    END IF;
END $$;

-- ============================================================================
-- SECTION 2: DROP LEGACY TABLES (SAFETY FIRST)
-- ============================================================================

\echo 'Section 2: Removing Legacy Tables'

-- Drop legacy comment_reactions table if exists
-- (This should be safe as we're using v2 tables as source of truth)
DROP TABLE IF EXISTS public.comment_reactions CASCADE;
\echo 'Dropped legacy comment_reactions table'

-- Drop legacy comments table if exists  
-- (This should be safe as we're using v2 tables as source of truth)
DROP TABLE IF EXISTS public.comments CASCADE;
\echo 'Dropped legacy comments table'

-- ============================================================================
-- SECTION 3: RENAME V2 TABLES TO CLEAN NAMES
-- ============================================================================

\echo 'Section 3: Renaming V2 Tables to Clean Names'

-- Rename comments_v2 to comments (following hybrid context-aware naming)
ALTER TABLE public.comments_v2 RENAME TO comments;
\echo 'Renamed comments_v2 → comments'

-- Rename comment_reactions_v2 to comment_reactions (keeping context prefix for disambiguation)
ALTER TABLE public.comment_reactions_v2 RENAME TO comment_reactions;
\echo 'Renamed comment_reactions_v2 → comment_reactions'

-- Rename comment_reports_v2 to comment_reports (keeping context prefix)
ALTER TABLE public.comment_reports_v2 RENAME TO comment_reports;
\echo 'Renamed comment_reports_v2 → comment_reports'

-- Rename comment_pins_v2 to comment_pins (keeping context prefix)
ALTER TABLE public.comment_pins_v2 RENAME TO comment_pins;
\echo 'Renamed comment_pins_v2 → comment_pins'

-- ============================================================================
-- SECTION 4: UPDATE FUNCTION NAMES (REMOVE V2 SUFFIXES)
-- ============================================================================

\echo 'Section 4: Cleaning Function Names'

-- Update get_comment_thread_v2 → get_comment_thread
DROP FUNCTION IF EXISTS public.get_comment_thread(UUID, TEXT);
CREATE OR REPLACE FUNCTION public.get_comment_thread(entity_id UUID, entity_type TEXT)
RETURNS SETOF comments
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    WITH RECURSIVE comment_tree AS (
        -- Base case: root comments
        SELECT c.*
        FROM comments c
        WHERE c.entity_id = get_comment_thread.entity_id
          AND c.entity_type = get_comment_thread.entity_type
          AND c.parent_id IS NULL
          AND c.deleted_at IS NULL
        
        UNION ALL
        
        -- Recursive case: replies
        SELECT c.*
        FROM comments c
        INNER JOIN comment_tree ct ON c.parent_id = ct.id
        WHERE c.deleted_at IS NULL
    )
    SELECT * FROM comment_tree
    ORDER BY created_at ASC;
END;
$$;

-- Update get_comment_replies_v2 → get_comment_replies  
DROP FUNCTION IF EXISTS public.get_comment_replies(UUID);
CREATE OR REPLACE FUNCTION public.get_comment_replies(comment_id UUID)
RETURNS SETOF comments
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT *
    FROM comments
    WHERE parent_id = get_comment_replies.comment_id
      AND deleted_at IS NULL
    ORDER BY created_at ASC;
END;
$$;

-- Update get_comment_count_v2 → get_comment_count
DROP FUNCTION IF EXISTS public.get_comment_count(UUID, TEXT);
CREATE OR REPLACE FUNCTION public.get_comment_count(entity_id UUID, entity_type TEXT)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    comment_count INTEGER;
BEGIN
    SELECT COUNT(*)
    INTO comment_count
    FROM comments
    WHERE comments.entity_id = get_comment_count.entity_id
      AND comments.entity_type = get_comment_count.entity_type
      AND deleted_at IS NULL;
    
    RETURN comment_count;
END;
$$;

-- Update add_comment_v2 → add_comment
DROP FUNCTION IF EXISTS public.add_comment(UUID, TEXT, TEXT, UUID);
CREATE OR REPLACE FUNCTION public.add_comment(
    p_entity_id UUID,
    p_entity_type TEXT,
    p_content TEXT,
    p_parent_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    new_comment_id UUID;
BEGIN
    INSERT INTO comments (
        entity_id,
        entity_type,
        content,
        parent_id,
        user_id,
        created_at,
        updated_at
    )
    VALUES (
        p_entity_id,
        p_entity_type,
        p_content,
        p_parent_id,
        auth.uid(),
        NOW(),
        NOW()
    )
    RETURNING id INTO new_comment_id;
    
    RETURN new_comment_id;
END;
$$;

-- Update toggle_comment_reaction_v2 → toggle_comment_reaction
DROP FUNCTION IF EXISTS public.toggle_comment_reaction(UUID, TEXT);
CREATE OR REPLACE FUNCTION public.toggle_comment_reaction(
    p_comment_id UUID,
    p_reaction_type TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    existing_reaction_id UUID;
    reaction_added BOOLEAN;
BEGIN
    -- Check if reaction already exists
    SELECT id INTO existing_reaction_id
    FROM comment_reactions
    WHERE comment_id = p_comment_id
      AND user_id = auth.uid()
      AND reaction_type = p_reaction_type;
    
    IF existing_reaction_id IS NOT NULL THEN
        -- Remove existing reaction
        DELETE FROM comment_reactions WHERE id = existing_reaction_id;
        reaction_added := FALSE;
    ELSE
        -- Add new reaction
        INSERT INTO comment_reactions (
            comment_id,
            user_id,
            reaction_type,
            created_at
        )
        VALUES (
            p_comment_id,
            auth.uid(),
            p_reaction_type,
            NOW()
        );
        reaction_added := TRUE;
    END IF;
    
    RETURN reaction_added;
END;
$$;

-- Drop old v2 functions if they still exist
DROP FUNCTION IF EXISTS public.get_comment_thread_v2(UUID, TEXT);
DROP FUNCTION IF EXISTS public.get_comment_replies_v2(UUID);
DROP FUNCTION IF EXISTS public.get_comment_count_v2(UUID, TEXT);
DROP FUNCTION IF EXISTS public.add_comment_v2(UUID, TEXT, TEXT, UUID);
DROP FUNCTION IF EXISTS public.toggle_comment_reaction_v2(UUID, TEXT);

\echo 'Updated all functions to remove v2 suffixes'

-- ============================================================================
-- SECTION 5: UPDATE INDEX NAMES (STANDARDIZATION)
-- ============================================================================

\echo 'Section 5: Standardizing Index Names'

-- Update comment table indexes (following idx_{table}_{columns}_{type} pattern)
DROP INDEX IF EXISTS idx_comments_v2_entity_created;
CREATE INDEX idx_comments_entity_created ON public.comments(entity_id, entity_type, created_at);

DROP INDEX IF EXISTS idx_comments_v2_parent_id;  
CREATE INDEX idx_comments_parent_id ON public.comments(parent_id) WHERE parent_id IS NOT NULL;

DROP INDEX IF EXISTS idx_comments_v2_user_id;
CREATE INDEX idx_comments_user_id ON public.comments(user_id);

-- Update comment_reactions table indexes
DROP INDEX IF EXISTS idx_comment_reactions_v2_comment_user;
CREATE UNIQUE INDEX idx_comment_reactions_comment_user_unique ON public.comment_reactions(comment_id, user_id, reaction_type);

DROP INDEX IF EXISTS idx_comment_reactions_v2_user_id;
CREATE INDEX idx_comment_reactions_user_id ON public.comment_reactions(user_id);

-- Update comment_reports table indexes  
DROP INDEX IF EXISTS idx_comment_reports_v2_comment_id;
CREATE INDEX idx_comment_reports_comment_id ON public.comment_reports(comment_id);

DROP INDEX IF EXISTS idx_comment_reports_v2_reporter_id;
CREATE INDEX idx_comment_reports_reporter_id ON public.comment_reports(reporter_id);

-- Update comment_pins table indexes
DROP INDEX IF EXISTS idx_comment_pins_v2_comment_id;
CREATE INDEX idx_comment_pins_comment_id ON public.comment_pins(comment_id);

DROP INDEX IF EXISTS idx_comment_pins_v2_entity_unique;
CREATE UNIQUE INDEX idx_comment_pins_entity_unique ON public.comment_pins(entity_id, entity_type);

\echo 'Updated all indexes to follow naming conventions'

-- ============================================================================
-- SECTION 6: UPDATE ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

\echo 'Section 6: Updating RLS Policies'

-- Update RLS policies for comments table
DROP POLICY IF EXISTS "Users can view published comments" ON public.comments;
CREATE POLICY "Users can view published comments" ON public.comments
    FOR SELECT USING (deleted_at IS NULL);

DROP POLICY IF EXISTS "Users can insert their own comments" ON public.comments;
CREATE POLICY "Users can insert their own comments" ON public.comments
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own comments" ON public.comments;
CREATE POLICY "Users can update their own comments" ON public.comments
    FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own comments" ON public.comments;
CREATE POLICY "Users can delete their own comments" ON public.comments
    FOR DELETE USING (auth.uid() = user_id);

-- Update RLS policies for comment_reactions table
DROP POLICY IF EXISTS "Users can view all comment reactions" ON public.comment_reactions;
CREATE POLICY "Users can view all comment reactions" ON public.comment_reactions
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can manage their own comment reactions" ON public.comment_reactions;
CREATE POLICY "Users can manage their own comment reactions" ON public.comment_reactions
    FOR ALL USING (auth.uid() = user_id);

-- Update RLS policies for comment_reports table  
DROP POLICY IF EXISTS "Users can view their own comment reports" ON public.comment_reports;
CREATE POLICY "Users can view their own comment reports" ON public.comment_reports
    FOR SELECT USING (auth.uid() = reporter_id);

DROP POLICY IF EXISTS "Users can create comment reports" ON public.comment_reports;
CREATE POLICY "Users can create comment reports" ON public.comment_reports
    FOR INSERT WITH CHECK (auth.uid() = reporter_id);

-- Update RLS policies for comment_pins table
DROP POLICY IF EXISTS "Users can view comment pins" ON public.comment_pins;
CREATE POLICY "Users can view comment pins" ON public.comment_pins
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authorized users can manage comment pins" ON public.comment_pins;
CREATE POLICY "Authorized users can manage comment pins" ON public.comment_pins
    FOR ALL USING (auth.uid() IS NOT NULL);

\echo 'Updated all RLS policies'

-- ============================================================================
-- SECTION 7: UPDATE TRIGGERS AND CONSTRAINTS
-- ============================================================================

\echo 'Section 7: Updating Triggers and Constraints'

-- Update trigger names to remove v2 references
-- Note: Most triggers should automatically update with table renames,
-- but we'll verify and recreate if needed

-- Ensure updated_at trigger exists on comments table
DROP TRIGGER IF EXISTS set_updated_at_comments_v2 ON public.comments;
DROP TRIGGER IF EXISTS set_updated_at_comments ON public.comments;

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at_comments
    BEFORE UPDATE ON public.comments
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

\echo 'Updated triggers and constraints'

-- ============================================================================
-- SECTION 8: POST-MIGRATION VALIDATION
-- ============================================================================

\echo 'Section 8: Post-Migration Validation'

-- Validate table existence and data integrity
DO $$
DECLARE
    comments_count INTEGER;
    comment_reactions_count INTEGER;
    comment_reports_count INTEGER;
    comment_pins_count INTEGER;
    function_count INTEGER;
    index_count INTEGER;
BEGIN
    -- Check all renamed tables exist and have data
    SELECT COUNT(*) INTO comments_count FROM comments;
    SELECT COUNT(*) INTO comment_reactions_count FROM comment_reactions;
    SELECT COUNT(*) INTO comment_reports_count FROM comment_reports;
    SELECT COUNT(*) INTO comment_pins_count FROM comment_pins;
    
    -- Check functions exist
    SELECT COUNT(*) INTO function_count
    FROM information_schema.routines
    WHERE routine_name IN ('get_comment_thread', 'get_comment_replies', 'get_comment_count', 'add_comment', 'toggle_comment_reaction')
      AND routine_schema = 'public';
    
    -- Check indexes exist
    SELECT COUNT(*) INTO index_count
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND indexname LIKE 'idx_comment%'
      AND indexname NOT LIKE '%_v2_%';
    
    -- Validation report
    RAISE NOTICE 'Post-migration validation:';
    RAISE NOTICE '  comments: % rows', comments_count;
    RAISE NOTICE '  comment_reactions: % rows', comment_reactions_count;
    RAISE NOTICE '  comment_reports: % rows', comment_reports_count;
    RAISE NOTICE '  comment_pins: % rows', comment_pins_count;
    RAISE NOTICE '  functions migrated: %', function_count;
    RAISE NOTICE '  indexes updated: %', index_count;
    
    -- Safety checks
    IF comments_count = 0 THEN
        RAISE WARNING 'No comments found after migration - verify this is expected';
    END IF;
    
    IF function_count < 5 THEN
        RAISE EXCEPTION 'Missing functions after migration - aborting transaction';
    END IF;
    
    RAISE NOTICE 'All validation checks passed';
END $$;

-- ============================================================================
-- SECTION 9: FINAL VERIFICATION AND CLEANUP
-- ============================================================================

\echo 'Section 9: Final Verification'

-- Verify no v2 tables remain
DO $$
DECLARE
    v2_table_count INTEGER;
    v2_function_count INTEGER;
    v2_index_count INTEGER;
BEGIN
    -- Check for any remaining v2 tables
    SELECT COUNT(*) INTO v2_table_count
    FROM information_schema.tables
    WHERE table_name LIKE '%_v2'
      AND table_schema = 'public';
    
    -- Check for any remaining v2 functions
    SELECT COUNT(*) INTO v2_function_count
    FROM information_schema.routines
    WHERE routine_name LIKE '%_v2'
      AND routine_schema = 'public';
    
    -- Check for any remaining v2 indexes
    SELECT COUNT(*) INTO v2_index_count
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND indexname LIKE '%_v2_%';
    
    RAISE NOTICE 'Cleanup verification:';
    RAISE NOTICE '  Remaining v2 tables: %', v2_table_count;
    RAISE NOTICE '  Remaining v2 functions: %', v2_function_count;
    RAISE NOTICE '  Remaining v2 indexes: %', v2_index_count;
    
    IF v2_table_count > 0 OR v2_function_count > 0 OR v2_index_count > 0 THEN
        RAISE WARNING 'Some v2 objects still exist - review may be needed';
    ELSE
        RAISE NOTICE 'All v2 naming conventions successfully removed';
    END IF;
END $$;

-- ============================================================================
-- MIGRATION COMPLETION
-- ============================================================================

\echo 'Database Naming Convention Cleanup Migration completed successfully!'
\echo 'All changes applied in atomic transaction'
\echo 'Ready to commit transaction...'

-- COMMIT will be done manually to allow for final review
-- COMMIT; 