-- Migration: Atomic Group Conversation Creation with Idempotency
-- Addresses Issues 1-3 from audit: transactional integrity, duplicate prevention, title collisions

-- Add unique_group_hash column for idempotency
ALTER TABLE conversations 
ADD COLUMN IF NOT EXISTS unique_group_hash TEXT;

-- Create unique index for group hash-based idempotency
CREATE UNIQUE INDEX IF NOT EXISTS conversations_unique_group_hash_idx 
ON conversations (unique_group_hash) 
WHERE unique_group_hash IS NOT NULL;

-- Create unique index for title collisions per creator
CREATE UNIQUE INDEX IF NOT EXISTS conversations_unique_title_per_creator_idx 
ON conversations (created_by, lower(title)) 
WHERE title IS NOT NULL AND type = 'group';

-- Function to generate deterministic group hash
CREATE OR REPLACE FUNCTION generate_group_hash(
  creator_id UUID,
  participant_ids UUID[],
  group_title TEXT DEFAULT NULL
) RETURNS TEXT AS $$
DECLARE
  sorted_participants UUID[];
  hash_input TEXT;
BEGIN
  -- Sort participant IDs for consistent hashing
  SELECT array_agg(id ORDER BY id) INTO sorted_participants
  FROM unnest(participant_ids) AS id;
  
  -- Create deterministic hash input
  hash_input := creator_id::TEXT || '|' || 
                array_to_string(sorted_participants, ',') || '|' ||
                COALESCE(lower(trim(group_title)), '');
  
  -- Return SHA-256 hash
  RETURN encode(digest(hash_input, 'sha256'), 'hex');
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Atomic group creation RPC function
CREATE OR REPLACE FUNCTION create_group_conversation_atomic(
  creator_id UUID,
  participant_ids UUID[],
  group_title TEXT DEFAULT NULL,
  check_participants BOOLEAN DEFAULT TRUE
) RETURNS JSON AS $$
DECLARE
  conversation_id UUID;
  group_hash TEXT;
  existing_conversation JSON;
  validated_participants UUID[];
  participant_row RECORD;
  result JSON;
BEGIN
  -- Validate creator exists
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = creator_id) THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Creator not found',
      'error_code', 'INVALID_CREATOR'
    );
  END IF;

  -- Generate idempotency hash
  group_hash := generate_group_hash(creator_id, participant_ids, group_title);
  
  -- Check for existing conversation with same hash
  SELECT json_build_object(
    'success', true,
    'conversation_id', id,
    'participant_count', (
      SELECT count(*) FROM conversation_participants 
      WHERE conversation_id = conversations.id
    ),
    'title', title,
    'is_duplicate', true
  ) INTO existing_conversation
  FROM conversations 
  WHERE unique_group_hash = group_hash
  AND type = 'group'
  LIMIT 1;
  
  IF existing_conversation IS NOT NULL THEN
    RETURN existing_conversation;
  END IF;

  -- Validate participant existence if requested
  IF check_participants THEN
    SELECT array_agg(id) INTO validated_participants
    FROM auth.users 
    WHERE id = ANY(participant_ids);
    
    IF array_length(validated_participants, 1) != array_length(participant_ids, 1) THEN
      RETURN json_build_object(
        'success', false,
        'error', 'One or more participants not found',
        'error_code', 'INVALID_PARTICIPANTS'
      );
    END IF;
  ELSE
    validated_participants := participant_ids;
  END IF;

  -- Begin atomic transaction (implicit in function)
  
  -- Insert conversation
  INSERT INTO conversations (
    type,
    title,
    created_by,
    is_private,
    unique_group_hash
  ) VALUES (
    'group',
    NULLIF(trim(group_title), ''),
    creator_id,
    false,
    group_hash
  ) RETURNING id INTO conversation_id;
  
  -- Insert creator as admin
  INSERT INTO conversation_participants (
    conversation_id,
    user_id,
    role
  ) VALUES (
    conversation_id,
    creator_id,
    'admin'
  );
  
  -- Insert other participants as members (batch insert)
  INSERT INTO conversation_participants (
    conversation_id,
    user_id,
    role
  )
  SELECT 
    conversation_id,
    participant_id,
    'member'
  FROM unnest(validated_participants) AS participant_id
  WHERE participant_id != creator_id; -- Exclude creator (already added as admin)
  
  -- Build success response
  result := json_build_object(
    'success', true,
    'conversation_id', conversation_id,
    'participant_count', array_length(validated_participants, 1) + 1, -- +1 for creator
    'title', NULLIF(trim(group_title), ''),
    'is_duplicate', false,
    'group_hash', group_hash
  );
  
  RETURN result;
  
EXCEPTION
  WHEN unique_violation THEN
    -- Handle race condition - another transaction created same group
    SELECT json_build_object(
      'success', true,
      'conversation_id', id,
      'participant_count', (
        SELECT count(*) FROM conversation_participants 
        WHERE conversation_id = conversations.id
      ),
      'title', title,
      'is_duplicate', true
    ) INTO existing_conversation
    FROM conversations 
    WHERE unique_group_hash = group_hash
    AND type = 'group'
    LIMIT 1;
    
    IF existing_conversation IS NOT NULL THEN
      RETURN existing_conversation;
    END IF;
    
    -- Different unique violation, re-raise
    RAISE;
    
  WHEN OTHERS THEN
    -- Return structured error for any other exception
    RETURN json_build_object(
      'success', false,
      'error', 'Database error during group creation',
      'error_code', 'DATABASE_ERROR',
      'sqlstate', SQLSTATE
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION create_group_conversation_atomic TO authenticated;
GRANT EXECUTE ON FUNCTION generate_group_hash TO authenticated;

-- Add helpful comments
COMMENT ON FUNCTION create_group_conversation_atomic IS 
'Atomically creates a group conversation with participants. Includes idempotency via hash-based deduplication.';

COMMENT ON FUNCTION generate_group_hash IS 
'Generates a deterministic hash for group conversation idempotency based on creator, participants, and title.';

COMMENT ON COLUMN conversations.unique_group_hash IS 
'SHA-256 hash for group conversation idempotency. Prevents duplicate groups with same creator, participants, and title.'; 