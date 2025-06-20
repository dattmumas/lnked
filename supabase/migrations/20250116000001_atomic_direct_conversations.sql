-- Migration: Atomic Direct Conversation Creation
-- Addresses: Race conditions, duplicate DMs, non-atomic rollback

-- 1. Add unique constraint to prevent duplicate direct conversations
-- Create a computed column for ordered participant pair
ALTER TABLE conversations 
ADD COLUMN IF NOT EXISTS participant_hash TEXT 
GENERATED ALWAYS AS (
  CASE 
    WHEN type = 'direct' THEN 
      LEAST(created_by::text, (
        SELECT string_agg(user_id::text, ',' ORDER BY user_id) 
        FROM conversation_participants 
        WHERE conversation_id = conversations.id
      ))
    ELSE NULL 
  END
) STORED;

-- Add unique index for direct conversations by participant pair
CREATE UNIQUE INDEX IF NOT EXISTS idx_direct_conversations_participants
ON conversations (participant_hash)
WHERE type = 'direct' AND participant_hash IS NOT NULL;

-- 2. Add unique constraint on conversation_participants to prevent duplicates
CREATE UNIQUE INDEX IF NOT EXISTS idx_conversation_participants_unique
ON conversation_participants (conversation_id, user_id);

-- 3. Create atomic direct conversation creation function
CREATE OR REPLACE FUNCTION create_direct_conversation_atomic(
  sender_id UUID,
  recipient_id UUID
) RETURNS TABLE (
  conversation_id UUID,
  is_existing BOOLEAN
) AS $$
DECLARE
  conv_id UUID;
  participant_pair_hash TEXT;
  existing_conv_id UUID;
BEGIN
  -- Validate inputs
  IF sender_id = recipient_id THEN
    RAISE EXCEPTION 'Cannot create conversation with yourself';
  END IF;

  -- Create deterministic hash for participant pair (ordered)
  participant_pair_hash := LEAST(sender_id::text, recipient_id::text) || ',' || GREATEST(sender_id::text, recipient_id::text);

  -- Check for existing direct conversation between these users
  SELECT c.id INTO existing_conv_id
  FROM conversations c
  JOIN conversation_participants cp1 ON c.id = cp1.conversation_id AND cp1.user_id = sender_id
  JOIN conversation_participants cp2 ON c.id = cp2.conversation_id AND cp2.user_id = recipient_id
  WHERE c.type = 'direct'
  LIMIT 1;

  IF existing_conv_id IS NOT NULL THEN
    -- Return existing conversation
    RETURN QUERY SELECT existing_conv_id, TRUE;
    RETURN;
  END IF;

  -- Create new conversation atomically
  INSERT INTO conversations (type, created_by)
  VALUES ('direct', sender_id)
  RETURNING id INTO conv_id;

  -- Insert both participants atomically
  INSERT INTO conversation_participants (conversation_id, user_id, role)
  VALUES 
    (conv_id, sender_id, 'admin'),
    (conv_id, recipient_id, 'member');

  -- Return new conversation
  RETURN QUERY SELECT conv_id, FALSE;

EXCEPTION 
  WHEN unique_violation THEN
    -- Handle race condition - another transaction created the same conversation
    SELECT c.id INTO existing_conv_id
    FROM conversations c
    JOIN conversation_participants cp1 ON c.id = cp1.conversation_id AND cp1.user_id = sender_id
    JOIN conversation_participants cp2 ON c.id = cp2.conversation_id AND cp2.user_id = recipient_id
    WHERE c.type = 'direct'
    LIMIT 1;
    
    IF existing_conv_id IS NOT NULL THEN
      RETURN QUERY SELECT existing_conv_id, TRUE;
    ELSE
      RAISE EXCEPTION 'Failed to create or find direct conversation';
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION create_direct_conversation_atomic(UUID, UUID) TO authenticated;

-- 4. Create optimized function for fetching direct conversations with participants
CREATE OR REPLACE FUNCTION get_direct_conversations_with_participants(
  user_id UUID,
  limit_count INTEGER DEFAULT 50
) RETURNS TABLE (
  conversation_id UUID,
  last_message_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ,
  other_user_id UUID,
  other_user_username TEXT,
  other_user_full_name TEXT,
  other_user_avatar_url TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id as conversation_id,
    c.last_message_at,
    c.created_at,
    u.id as other_user_id,
    u.username as other_user_username,
    u.full_name as other_user_full_name,
    u.avatar_url as other_user_avatar_url
  FROM conversations c
  JOIN conversation_participants cp1 ON c.id = cp1.conversation_id AND cp1.user_id = user_id
  JOIN conversation_participants cp2 ON c.id = cp2.conversation_id AND cp2.user_id != user_id
  JOIN users u ON cp2.user_id = u.id
  WHERE c.type = 'direct'
  ORDER BY 
    c.last_message_at DESC NULLS LAST,
    c.created_at DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_direct_conversations_with_participants(UUID, INTEGER) TO authenticated;

-- Add helpful indexes for performance
CREATE INDEX IF NOT EXISTS idx_conversations_type_last_message 
ON conversations (type, last_message_at DESC, created_at DESC)
WHERE type = 'direct';

CREATE INDEX IF NOT EXISTS idx_conversation_participants_user_conversation 
ON conversation_participants (user_id, conversation_id);

-- Add comments for documentation
COMMENT ON FUNCTION create_direct_conversation_atomic(UUID, UUID) IS 
'Atomically creates a direct conversation between two users, preventing duplicates and race conditions';

COMMENT ON FUNCTION get_direct_conversations_with_participants(UUID, INTEGER) IS 
'Efficiently fetches direct conversations for a user with participant details in a single query'; 