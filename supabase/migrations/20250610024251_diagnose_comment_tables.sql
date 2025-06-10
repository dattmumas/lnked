-- Diagnostic: Check what comment-related tables and functions exist

-- List all comment-related tables
DO $$
DECLARE
    table_rec RECORD;
BEGIN
    RAISE NOTICE '=== EXISTING TABLES ===';
    FOR table_rec IN 
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
            AND table_name LIKE '%comment%'
        ORDER BY table_name
    LOOP
        RAISE NOTICE 'Table: %', table_rec.table_name;
    END LOOP;
END $$;

-- List all comment-related functions
DO $$
DECLARE
    func_rec RECORD;
BEGIN
    RAISE NOTICE '=== EXISTING FUNCTIONS ===';
    FOR func_rec IN 
        SELECT proname as function_name
        FROM pg_proc 
        WHERE pronamespace = 'public'::regnamespace
            AND proname LIKE '%comment%'
        ORDER BY proname
    LOOP
        RAISE NOTICE 'Function: %', func_rec.function_name;
    END LOOP;
END $$;

-- Check specific tables we care about
SELECT 
    'Comment tables status:' as info,
    EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'comments' AND table_schema = 'public') as has_comments,
    EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'comments_v2' AND table_schema = 'public') as has_comments_v2,
    EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'comment_reactions' AND table_schema = 'public') as has_comment_reactions,
    EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'comment_reactions_v2' AND table_schema = 'public') as has_comment_reactions_v2;

-- Check specific functions we care about  
SELECT 
    'Comment functions status:' as info,
    EXISTS(SELECT 1 FROM pg_proc WHERE proname = 'get_comment_thread') as has_get_comment_thread,
    EXISTS(SELECT 1 FROM pg_proc WHERE proname = 'get_comment_thread_v2') as has_get_comment_thread_v2,
    EXISTS(SELECT 1 FROM pg_proc WHERE proname = 'add_comment') as has_add_comment,
    EXISTS(SELECT 1 FROM pg_proc WHERE proname = 'add_comment_v2') as has_add_comment_v2;
