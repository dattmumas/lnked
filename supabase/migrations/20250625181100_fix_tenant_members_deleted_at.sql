-- Fix tenant_members.deleted_at reference in get_tenant_conversations RPC function
-- The tenant_members table does not have a deleted_at column

-- Drop and recreate the function without the deleted_at reference
DROP FUNCTION IF EXISTS get_tenant_conversations(UUID);

CREATE OR REPLACE FUNCTION get_tenant_conversations(target_tenant_id UUID)
RETURNS TABLE (
    id UUID,
    title TEXT,
    type TEXT,
    description TEXT,
    is_private BOOLEAN,
    last_message_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ,
    created_by UUID,
    tenant_id UUID,
    collective_id UUID,
    unread_count BIGINT,
    participant_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    current_user_id UUID;
BEGIN
    -- Get current user
    current_user_id := auth.uid();
    
    IF current_user_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;
    
    -- Check if user has access to this tenant (removed deleted_at check since column doesn't exist)
    IF NOT EXISTS (
        SELECT 1 FROM tenant_members 
        WHERE tenant_members.tenant_id = target_tenant_id 
        AND tenant_members.user_id = current_user_id
    ) THEN
        RAISE EXCEPTION 'No access to this tenant';
    END IF;
    
    -- Return tenant-scoped conversations with properly qualified columns
    RETURN QUERY
    SELECT 
        c.id,
        c.title,
        c.type,
        c.description,
        c.is_private,
        c.last_message_at,
        c.created_at,
        c.created_by,
        c.tenant_id,
        c.collective_id,
        COALESCE(unread.count, 0) as unread_count,
        COALESCE(participant.count, 0) as participant_count
    FROM conversations c
    INNER JOIN conversation_participants cp ON c.id = cp.conversation_id
    LEFT JOIN (
        SELECT 
            m.conversation_id,
            COUNT(*) as count
        FROM messages m
        INNER JOIN conversation_participants cp2 ON m.conversation_id = cp2.conversation_id
        WHERE cp2.user_id = current_user_id
        AND m.created_at > COALESCE(cp2.last_read_at, '1970-01-01'::timestamptz)
        AND m.sender_id != current_user_id
        AND m.deleted_at IS NULL
        GROUP BY m.conversation_id
    ) unread ON c.id = unread.conversation_id
    LEFT JOIN (
        SELECT 
            cp3.conversation_id,
            COUNT(*) as count
        FROM conversation_participants cp3
        WHERE cp3.deleted_at IS NULL
        GROUP BY cp3.conversation_id
    ) participant ON c.id = participant.conversation_id
    WHERE c.tenant_id = target_tenant_id
    AND cp.user_id = current_user_id
    AND cp.deleted_at IS NULL
    ORDER BY c.last_message_at DESC NULLS LAST;
END;
$$; 