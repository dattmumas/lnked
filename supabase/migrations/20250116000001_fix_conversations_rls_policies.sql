-- Fix conversations table RLS policies
-- The existing policies are too restrictive and causing insert failures

-- First, let's check and drop the existing problematic policies
DROP POLICY IF EXISTS "Users can create conversations" ON conversations;
DROP POLICY IF EXISTS "Users can create direct conversations" ON conversations;
DROP POLICY IF EXISTS "Users can create group conversations" ON conversations;

-- Create a unified policy for creating non-channel conversations
CREATE POLICY "Users can create non-channel conversations" ON conversations
FOR INSERT TO authenticated
WITH CHECK (
    -- User must be the creator
    auth.uid() = created_by
    AND
    -- Type must be direct or group (not channel)
    type IN ('direct', 'group')
);

-- Ensure the channel_insert policy is correct
DROP POLICY IF EXISTS "channel_insert" ON conversations;
CREATE POLICY "Users can create channel conversations" ON conversations
FOR INSERT TO authenticated
WITH CHECK (
    -- Must be channel type
    type = 'channel' 
    AND 
    -- Must have collective_id
    collective_id IS NOT NULL 
    AND 
    -- User must be owner/admin of the collective
    EXISTS (
        SELECT 1
        FROM collective_members m
        WHERE m.collective_id = conversations.collective_id
        AND m.member_id = auth.uid()
        AND m.role IN ('owner', 'admin')
    )
);

-- Also ensure conversation_participants policies exist
-- Check if policy exists, if not create it
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'conversation_participants' 
        AND policyname = 'Users can add participants to conversations they created'
    ) THEN
        CREATE POLICY "Users can add participants to conversations they created" ON conversation_participants
        FOR INSERT TO authenticated
        WITH CHECK (
            EXISTS (
                SELECT 1 FROM conversations
                WHERE conversations.id = conversation_participants.conversation_id
                AND conversations.created_by = auth.uid()
            )
        );
    END IF;
END $$; 