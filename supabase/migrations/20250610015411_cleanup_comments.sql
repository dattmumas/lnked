-- 20240609_cleanup_comments_v2.sql
-- Supabase migration: Clean up comments system by removing _v2 suffix
-- This migration renames all _v2 tables/functions to clean names
-- Review and test on staging before applying to production!

-- 1. First drop any old non-v2 tables that might conflict (CASCADE to handle dependencies)
DO $$ 
BEGIN
    -- Drop triggers on old tables if they exist
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'comments') THEN
        DROP TRIGGER IF EXISTS trigger_update_comment_timestamp ON public.comments;
        DROP TRIGGER IF EXISTS trigger_update_reply_count_on_delete ON public.comments;
    END IF;
END $$;

-- Drop old tables if they exist
DROP TABLE IF EXISTS public.comments CASCADE;
DROP TABLE IF EXISTS public.comment_reactions CASCADE;
DROP TABLE IF EXISTS public.comment_reports CASCADE;
DROP TABLE IF EXISTS public.comment_pins CASCADE;

-- 2. Drop old non-v2 functions if they exist
DROP FUNCTION IF EXISTS public.add_comment(public.comment_entity_type, uuid, uuid, text, uuid);
DROP FUNCTION IF EXISTS public.get_comment_thread(public.comment_entity_type, uuid, integer, integer);
DROP FUNCTION IF EXISTS public.get_comment_replies(uuid, integer, integer);
DROP FUNCTION IF EXISTS public.get_comment_count(public.comment_entity_type, uuid);
DROP FUNCTION IF EXISTS public.toggle_comment_reaction(uuid, uuid, public.reaction_type);

-- 3. Now rename v2 tables to clean names
ALTER TABLE IF EXISTS public.comments_v2 RENAME TO comments;
ALTER TABLE IF EXISTS public.comment_reactions_v2 RENAME TO comment_reactions;
ALTER TABLE IF EXISTS public.comment_reports_v2 RENAME TO comment_reports;
ALTER TABLE IF EXISTS public.comment_pins_v2 RENAME TO comment_pins;

-- 4. Rename v2 functions to clean names using DO block to check existence
DO $$ 
BEGIN
    -- Rename add_comment_v2
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'add_comment_v2') THEN
        ALTER FUNCTION public.add_comment_v2(public.comment_entity_type, uuid, uuid, text, uuid) 
            RENAME TO add_comment;
    END IF;
    
    -- Rename get_comment_thread_v2
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_comment_thread_v2') THEN
        ALTER FUNCTION public.get_comment_thread_v2(public.comment_entity_type, uuid, integer, integer) 
            RENAME TO get_comment_thread;
    END IF;
    
    -- Rename get_comment_replies_v2
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_comment_replies_v2') THEN
        ALTER FUNCTION public.get_comment_replies_v2(uuid, integer, integer) 
            RENAME TO get_comment_replies;
    END IF;
    
    -- Rename get_comment_count_v2
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_comment_count_v2') THEN
        ALTER FUNCTION public.get_comment_count_v2(public.comment_entity_type, uuid) 
            RENAME TO get_comment_count;
    END IF;
    
    -- Rename toggle_comment_reaction_v2
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'toggle_comment_reaction_v2') THEN
        ALTER FUNCTION public.toggle_comment_reaction_v2(uuid, uuid, public.reaction_type) 
            RENAME TO toggle_comment_reaction;
    END IF;
END $$;

-- 5. Rename indexes to remove _v2
DROP INDEX IF EXISTS idx_comments_v2_entity_created;
DROP INDEX IF EXISTS idx_comment_reactions_v2_comment;
DROP INDEX IF EXISTS idx_comment_reports_v2_comment;
DROP INDEX IF EXISTS idx_comment_pins_v2_entity;

-- Create new indexes with clean names
CREATE INDEX IF NOT EXISTS idx_comments_entity_created ON public.comments(entity_type, entity_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_comment_reactions_comment ON public.comment_reactions(comment_id, reaction_type);
CREATE INDEX IF NOT EXISTS idx_comment_reports_comment ON public.comment_reports(comment_id);
CREATE INDEX IF NOT EXISTS idx_comment_pins_entity ON public.comment_pins(entity_type, entity_id, pin_order);

-- 6. Update triggers to use clean names
DO $$ 
BEGIN
    -- Drop old v2 triggers
    DROP TRIGGER IF EXISTS trigger_update_comment_timestamp_v2 ON public.comments;
    DROP TRIGGER IF EXISTS trigger_update_reply_count_on_delete_v2 ON public.comments;
    
    -- Create triggers with clean names
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_comment_timestamp_v2') THEN
        CREATE TRIGGER trigger_update_comment_timestamp
            BEFORE UPDATE ON public.comments
            FOR EACH ROW EXECUTE FUNCTION public.update_comment_timestamp_v2();
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_reply_count_on_delete_v2') THEN
        CREATE TRIGGER trigger_update_reply_count_on_delete
            AFTER DELETE ON public.comments
            FOR EACH ROW EXECUTE FUNCTION public.update_reply_count_on_delete_v2();
    END IF;
END $$;

-- 7. Grant permissions on renamed tables
GRANT ALL ON public.comments TO authenticated;
GRANT ALL ON public.comment_reactions TO authenticated;
GRANT ALL ON public.comment_reports TO authenticated;
GRANT ALL ON public.comment_pins TO authenticated;

-- 8. Grant permissions on renamed functions (wrapped in DO block to handle missing functions)
DO $$
BEGIN
    -- Grant permissions only if functions exist
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_comment_thread') THEN
        GRANT ALL ON FUNCTION public.get_comment_thread(public.comment_entity_type, uuid, integer, integer) TO authenticated;
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_comment_replies') THEN
        GRANT ALL ON FUNCTION public.get_comment_replies(uuid, integer, integer) TO authenticated;
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'add_comment') THEN
        GRANT ALL ON FUNCTION public.add_comment(public.comment_entity_type, uuid, uuid, text, uuid) TO authenticated;
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_comment_count') THEN
        GRANT ALL ON FUNCTION public.get_comment_count(public.comment_entity_type, uuid) TO authenticated;
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'toggle_comment_reaction') THEN
        GRANT ALL ON FUNCTION public.toggle_comment_reaction(uuid, uuid, public.reaction_type) TO authenticated;
    END IF;
END $$;

-- 9. Update your application code to use clean names (no _v2)
-- 10. Test thoroughly in staging before deploying to production! 