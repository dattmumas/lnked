-- Fix missing conversation participants
-- Add participants who have sent messages but aren't in the participants table

-- Insert missing participants based on messages sent
INSERT INTO conversation_participants (conversation_id, user_id, role, joined_at, last_read_at, is_muted, is_pinned)
SELECT DISTINCT 
  m.conversation_id,
  m.sender_id as user_id,
  'member' as role,
  MIN(m.created_at) as joined_at,
  NOW() as last_read_at,
  false as is_muted,
  false as is_pinned
FROM messages m
WHERE m.sender_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 
    FROM conversation_participants cp 
    WHERE cp.conversation_id = m.conversation_id 
      AND cp.user_id = m.sender_id
  )
GROUP BY m.conversation_id, m.sender_id;

-- Also ensure conversation creators are participants
INSERT INTO conversation_participants (conversation_id, user_id, role, joined_at, last_read_at, is_muted, is_pinned)
SELECT 
  c.id as conversation_id,
  c.created_by as user_id,
  'admin' as role,
  c.created_at as joined_at,
  NOW() as last_read_at,
  false as is_muted,
  false as is_pinned
FROM conversations c
WHERE c.created_by IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 
    FROM conversation_participants cp 
    WHERE cp.conversation_id = c.id 
      AND cp.user_id = c.created_by
  ); 