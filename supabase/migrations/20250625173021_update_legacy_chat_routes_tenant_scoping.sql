-- Migration: Update legacy chat routes for tenant scoping
-- Date: December 25, 2025
-- Description: Updates conversations and messages to be properly tenant-scoped

-- Add RPC to get tenant conversations for a user
CREATE OR REPLACE FUNCTION get_tenant_conversations(
    target_tenant_id UUID
)
RETURNS TABLE (
    id UUID,
    title TEXT,
    type conversation_type,
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
    
    -- Check if user has access to this tenant
    IF NOT EXISTS (
        SELECT 1 FROM tenant_members 
        WHERE tenant_id = target_tenant_id 
        AND user_id = current_user_id 
        AND deleted_at IS NULL
    ) THEN
        RAISE EXCEPTION 'No access to this tenant';
    END IF;
    
    -- Return tenant-scoped conversations
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
            conversation_id,
            COUNT(*) as count
        FROM conversation_participants
        WHERE deleted_at IS NULL
        GROUP BY conversation_id
    ) participant ON c.id = participant.conversation_id
    WHERE c.tenant_id = target_tenant_id
    AND cp.user_id = current_user_id
    AND cp.deleted_at IS NULL
    ORDER BY c.last_message_at DESC NULLS LAST;
END;
$$;

-- Add RPC to create tenant-scoped conversation
CREATE OR REPLACE FUNCTION create_tenant_conversation(
    target_tenant_id UUID,
    conversation_title TEXT DEFAULT NULL,
    conversation_type conversation_type DEFAULT 'group',
    conversation_description TEXT DEFAULT NULL,
    is_private_conversation BOOLEAN DEFAULT FALSE,
    participant_user_ids UUID[] DEFAULT ARRAY[]::UUID[]
)
RETURNS TABLE (
    id UUID,
    title TEXT,
    type conversation_type,
    created_at TIMESTAMPTZ,
    tenant_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    current_user_id UUID;
    new_conversation_id UUID;
    participant_id UUID;
BEGIN
    -- Get current user
    current_user_id := auth.uid();
    
    IF current_user_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;
    
    -- Check if user has access to this tenant
    IF NOT EXISTS (
        SELECT 1 FROM tenant_members 
        WHERE tenant_id = target_tenant_id 
        AND user_id = current_user_id 
        AND role IN ('member', 'editor', 'admin', 'owner')
        AND deleted_at IS NULL
    ) THEN
        RAISE EXCEPTION 'No access to this tenant';
    END IF;
    
    -- Create the conversation
    INSERT INTO conversations (
        title,
        type,
        description,
        is_private,
        created_by,
        tenant_id,
        collective_id,
        last_message_at
    ) VALUES (
        conversation_title,
        conversation_type,
        conversation_description,
        is_private_conversation,
        current_user_id,
        target_tenant_id,
        target_tenant_id, -- For backward compatibility
        NOW()
    ) RETURNING conversations.id INTO new_conversation_id;
    
    -- Add creator as admin participant
    INSERT INTO conversation_participants (
        conversation_id,
        user_id,
        role,
        joined_at
    ) VALUES (
        new_conversation_id,
        current_user_id,
        'admin',
        NOW()
    );
    
    -- Add other participants as members
    FOREACH participant_id IN ARRAY participant_user_ids
    LOOP
        -- Verify each participant has access to the tenant
        IF EXISTS (
            SELECT 1 FROM tenant_members 
            WHERE tenant_id = target_tenant_id 
            AND user_id = participant_id 
            AND deleted_at IS NULL
        ) THEN
            INSERT INTO conversation_participants (
                conversation_id,
                user_id,
                role,
                joined_at
            ) VALUES (
                new_conversation_id,
                participant_id,
                'member',
                NOW()
            ) ON CONFLICT (conversation_id, user_id) DO NOTHING;
        END IF;
    END LOOP;
    
    -- Return the created conversation
    RETURN QUERY
    SELECT 
        c.id,
        c.title,
        c.type,
        c.created_at,
        c.tenant_id
    FROM conversations c
    WHERE c.id = new_conversation_id;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_tenant_conversations(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION create_tenant_conversation(UUID, TEXT, conversation_type, TEXT, BOOLEAN, UUID[]) TO authenticated;
