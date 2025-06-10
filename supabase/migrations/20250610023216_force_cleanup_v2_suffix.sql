-- Force migration 20250610015411_cleanup_comments.sql to run
-- This script will ensure the _v2 suffix is removed from all tables and functions

-- First, let's check what exists
DO $$
BEGIN
    RAISE NOTICE 'Checking current state...';
    
    -- Check for v2 functions
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_comment_thread_v2') THEN
        RAISE NOTICE 'Found get_comment_thread_v2 - will rename';
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_comment_thread') THEN
        RAISE NOTICE 'Found get_comment_thread - will drop first';
    END IF;
END $$;

-- Drop any non-v2 versions first (if they exist)
DROP FUNCTION IF EXISTS public.add_comment(public.comment_entity_type, uuid, uuid, text, uuid);
DROP FUNCTION IF EXISTS public.get_comment_thread(public.comment_entity_type, uuid, integer, integer);
DROP FUNCTION IF EXISTS public.get_comment_replies(uuid, integer, integer);
DROP FUNCTION IF EXISTS public.get_comment_count(public.comment_entity_type, uuid);
DROP FUNCTION IF EXISTS public.toggle_comment_reaction(uuid, uuid, public.reaction_type);

-- Now rename v2 functions to clean names
DO $$ 
BEGIN
    -- Rename get_comment_thread_v2
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_comment_thread_v2') THEN
        ALTER FUNCTION public.get_comment_thread_v2(public.comment_entity_type, uuid, integer, integer) 
            RENAME TO get_comment_thread;
        RAISE NOTICE 'Renamed get_comment_thread_v2 to get_comment_thread';
    END IF;
    
    -- Rename get_comment_replies_v2
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_comment_replies_v2') THEN
        ALTER FUNCTION public.get_comment_replies_v2(uuid, integer, integer) 
            RENAME TO get_comment_replies;
        RAISE NOTICE 'Renamed get_comment_replies_v2 to get_comment_replies';
    END IF;
    
    -- Rename add_comment_v2
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'add_comment_v2') THEN
        ALTER FUNCTION public.add_comment_v2(public.comment_entity_type, uuid, uuid, text, uuid) 
            RENAME TO add_comment;
        RAISE NOTICE 'Renamed add_comment_v2 to add_comment';
    END IF;
    
    -- Rename get_comment_count_v2
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_comment_count_v2') THEN
        ALTER FUNCTION public.get_comment_count_v2(public.comment_entity_type, uuid) 
            RENAME TO get_comment_count;
        RAISE NOTICE 'Renamed get_comment_count_v2 to get_comment_count';
    END IF;
    
    -- Rename toggle_comment_reaction_v2
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'toggle_comment_reaction_v2') THEN
        ALTER FUNCTION public.toggle_comment_reaction_v2(uuid, uuid, public.reaction_type) 
            RENAME TO toggle_comment_reaction;
        RAISE NOTICE 'Renamed toggle_comment_reaction_v2 to toggle_comment_reaction';
    END IF;
END $$;

-- Verify the result
SELECT 
    'Functions after migration:' as status,
    string_agg(proname, ', ') as function_names
FROM pg_proc 
WHERE proname IN (
    'get_comment_thread',
    'get_comment_thread_v2',
    'get_comment_replies',
    'get_comment_replies_v2',
    'add_comment',
    'add_comment_v2',
    'toggle_comment_reaction',
    'toggle_comment_reaction_v2',
    'get_comment_count',
    'get_comment_count_v2'
); 