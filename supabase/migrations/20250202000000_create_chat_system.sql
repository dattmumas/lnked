-- Create chat system tables and functions

-- Create conversations table
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255),
  type VARCHAR(50) NOT NULL DEFAULT 'direct' CHECK (type IN ('direct', 'group', 'channel')),
  description TEXT,
  is_private BOOLEAN DEFAULT true,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_message_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  archived BOOLEAN DEFAULT false
);

-- Create conversation participants table
CREATE TABLE conversation_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(50) DEFAULT 'member' CHECK (role IN ('admin', 'moderator', 'member')),
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_read_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_muted BOOLEAN DEFAULT false,
  is_pinned BOOLEAN DEFAULT false,
  UNIQUE(conversation_id, user_id)
);

-- Create messages table
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES users(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  message_type VARCHAR(50) DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'file', 'system')),
  metadata JSONB DEFAULT '{}',
  reply_to_id UUID REFERENCES messages(id) ON DELETE SET NULL,
  edited_at TIMESTAMP WITH TIME ZONE,
  deleted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create message reactions table
CREATE TABLE message_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID REFERENCES messages(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  emoji VARCHAR(100) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(message_id, user_id, emoji)
);

-- Create message read receipts table
CREATE TABLE message_read_receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID REFERENCES messages(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  read_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(message_id, user_id)
);

-- Create indexes for performance
CREATE INDEX idx_conversations_created_by ON conversations(created_by);
CREATE INDEX idx_conversations_updated_at ON conversations(updated_at DESC);
CREATE INDEX idx_conversations_last_message_at ON conversations(last_message_at DESC);

CREATE INDEX idx_conversation_participants_conversation_id ON conversation_participants(conversation_id);
CREATE INDEX idx_conversation_participants_user_id ON conversation_participants(user_id);
CREATE INDEX idx_conversation_participants_last_read_at ON conversation_participants(last_read_at);

CREATE INDEX idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX idx_messages_sender_id ON messages(sender_id);
CREATE INDEX idx_messages_created_at ON messages(created_at DESC);
CREATE INDEX idx_messages_reply_to_id ON messages(reply_to_id);

CREATE INDEX idx_message_reactions_message_id ON message_reactions(message_id);
CREATE INDEX idx_message_reactions_user_id ON message_reactions(user_id);

CREATE INDEX idx_message_read_receipts_message_id ON message_read_receipts(message_id);
CREATE INDEX idx_message_read_receipts_user_id ON message_read_receipts(user_id);

-- Create function to update conversation last_message_at
CREATE OR REPLACE FUNCTION update_conversation_last_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE conversations 
  SET 
    last_message_at = NOW(),
    updated_at = NOW()
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updating conversation last_message_at
CREATE TRIGGER trigger_update_conversation_last_message
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION update_conversation_last_message();

-- Create function to get unread message count for a user
CREATE OR REPLACE FUNCTION get_unread_message_count(
  p_user_id UUID,
  p_conversation_id UUID
)
RETURNS INTEGER AS $$
DECLARE
  last_read_at TIMESTAMP WITH TIME ZONE;
  unread_count INTEGER;
BEGIN
  -- Get the user's last read timestamp for this conversation
  SELECT cp.last_read_at INTO last_read_at
  FROM conversation_participants cp
  WHERE cp.user_id = p_user_id AND cp.conversation_id = p_conversation_id;
  
  -- If user is not a participant, return 0
  IF last_read_at IS NULL THEN
    RETURN 0;
  END IF;
  
  -- Count messages created after last read time
  SELECT COUNT(*)::INTEGER INTO unread_count
  FROM messages m
  WHERE m.conversation_id = p_conversation_id
    AND m.created_at > last_read_at
    AND m.sender_id != p_user_id
    AND m.deleted_at IS NULL;
    
  RETURN unread_count;
END;
$$ LANGUAGE plpgsql;

-- Create function to mark messages as read
CREATE OR REPLACE FUNCTION mark_messages_as_read(
  p_user_id UUID,
  p_conversation_id UUID
)
RETURNS VOID AS $$
BEGIN
  -- Update participant's last_read_at
  UPDATE conversation_participants
  SET last_read_at = NOW()
  WHERE user_id = p_user_id AND conversation_id = p_conversation_id;
  
  -- Insert read receipts for unread messages
  INSERT INTO message_read_receipts (message_id, user_id, read_at)
  SELECT m.id, p_user_id, NOW()
  FROM messages m
  LEFT JOIN message_read_receipts mrr ON mrr.message_id = m.id AND mrr.user_id = p_user_id
  WHERE m.conversation_id = p_conversation_id
    AND m.sender_id != p_user_id
    AND m.deleted_at IS NULL
    AND mrr.id IS NULL;
END;
$$ LANGUAGE plpgsql;

-- Enable Row Level Security
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_read_receipts ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for conversations
CREATE POLICY "Users can view conversations they participate in" ON conversations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM conversation_participants cp
      WHERE cp.conversation_id = conversations.id
        AND cp.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create conversations" ON conversations
  FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Conversation admins can update conversations" ON conversations
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM conversation_participants cp
      WHERE cp.conversation_id = conversations.id
        AND cp.user_id = auth.uid()
        AND cp.role IN ('admin')
    )
  );

-- Create RLS policies for conversation_participants
CREATE POLICY "Users can view participants in their conversations" ON conversation_participants
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM conversation_participants cp
      WHERE cp.conversation_id = conversation_participants.conversation_id
        AND cp.user_id = auth.uid()
    )
  );

CREATE POLICY "Conversation admins can manage participants" ON conversation_participants
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM conversation_participants cp
      WHERE cp.conversation_id = conversation_participants.conversation_id
        AND cp.user_id = auth.uid()
        AND cp.role IN ('admin')
    )
  );

-- Create RLS policies for messages
CREATE POLICY "Users can view messages in their conversations" ON messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM conversation_participants cp
      WHERE cp.conversation_id = messages.conversation_id
        AND cp.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can send messages to their conversations" ON messages
  FOR INSERT WITH CHECK (
    auth.uid() = sender_id AND
    EXISTS (
      SELECT 1 FROM conversation_participants cp
      WHERE cp.conversation_id = messages.conversation_id
        AND cp.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can edit their own messages" ON messages
  FOR UPDATE USING (auth.uid() = sender_id);

-- Create RLS policies for message_reactions
CREATE POLICY "Users can view reactions in their conversations" ON message_reactions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM messages m
      JOIN conversation_participants cp ON cp.conversation_id = m.conversation_id
      WHERE m.id = message_reactions.message_id
        AND cp.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage their own reactions" ON message_reactions
  FOR ALL USING (auth.uid() = user_id);

-- Create RLS policies for message_read_receipts
CREATE POLICY "Users can view read receipts in their conversations" ON message_read_receipts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM messages m
      JOIN conversation_participants cp ON cp.conversation_id = m.conversation_id
      WHERE m.id = message_read_receipts.message_id
        AND cp.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage their own read receipts" ON message_read_receipts
  FOR ALL USING (auth.uid() = user_id); 