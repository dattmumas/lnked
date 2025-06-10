-- Check for RPC functions with broader search

-- List ALL functions in public schema
DO $$
DECLARE
    func_rec RECORD;
BEGIN
    RAISE NOTICE '=== ALL PUBLIC FUNCTIONS ===';
    FOR func_rec IN 
        SELECT 
            p.proname as function_name,
            pg_get_function_identity_arguments(p.oid) as arguments
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public'
            AND p.proname IN (
                'get_comment_thread', 'get_comment_thread_v2',
                'get_comment_replies', 'get_comment_replies_v2',
                'add_comment', 'add_comment_v2',
                'toggle_comment_reaction', 'toggle_comment_reaction_v2',
                'get_comment_count', 'get_comment_count_v2'
            )
        ORDER BY p.proname
    LOOP
        RAISE NOTICE 'Function: % (%)', func_rec.function_name, func_rec.arguments;
    END LOOP;
    
    -- Also check if they might be in a different schema
    RAISE NOTICE '=== CHECKING OTHER SCHEMAS ===';
    FOR func_rec IN 
        SELECT 
            n.nspname as schema_name,
            p.proname as function_name
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE p.proname LIKE '%comment%'
            AND n.nspname NOT IN ('pg_catalog', 'information_schema')
        ORDER BY n.nspname, p.proname
    LOOP
        RAISE NOTICE 'Schema: %, Function: %', func_rec.schema_name, func_rec.function_name;
    END LOOP;
END $$;

-- Check if the functions exist at all (regardless of name)
SELECT 
    'RPC functions check:' as info,
    COUNT(*) as total_functions
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
    AND (
        p.proname LIKE '%comment%' 
        OR p.proname LIKE '%thread%'
        OR p.proname LIKE '%reaction%'
    );
