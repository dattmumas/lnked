-- Chat system tables for remote Supabase
-- Only creates chat-specific tables, avoiding conflicts with existing schema

-- Create conversations table
CREATE TABLE IF NOT EXISTS public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255),
  type VARCHAR(50) NOT NULL DEFAULT 'direct' CHECK (type IN ('direct', 'group', 'channel')),
  description TEXT,
  is_private BOOLEAN DEFAULT true,
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_message_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  archived BOOLEAN DEFAULT false
);

-- Create conversation participants table
CREATE TABLE IF NOT EXISTS public.conversation_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  role VARCHAR(50) DEFAULT 'member' CHECK (role IN ('admin', 'moderator', 'member')),
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_read_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_muted BOOLEAN DEFAULT false,
  is_pinned BOOLEAN DEFAULT false,
  UNIQUE(conversation_id, user_id)
);

-- Create messages table
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  message_type VARCHAR(50) DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'file', 'system')),
  metadata JSONB DEFAULT '{}',
  reply_to_id UUID REFERENCES public.messages(id) ON DELETE SET NULL,
  edited_at TIMESTAMP WITH TIME ZONE,
  deleted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create message reactions table
CREATE TABLE IF NOT EXISTS public.message_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID REFERENCES public.messages(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  emoji VARCHAR(100) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(message_id, user_id, emoji)
);

-- Create message read receipts table
CREATE TABLE IF NOT EXISTS public.message_read_receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID REFERENCES public.messages(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  read_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(message_id, user_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_conversations_created_by ON public.conversations(created_by);
CREATE INDEX IF NOT EXISTS idx_conversations_updated_at ON public.conversations(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversations_last_message_at ON public.conversations(last_message_at DESC);

CREATE INDEX IF NOT EXISTS idx_conversation_participants_conversation_id ON public.conversation_participants(conversation_id);
CREATE INDEX IF NOT EXISTS idx_conversation_participants_user_id ON public.conversation_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_conversation_participants_last_read_at ON public.conversation_participants(last_read_at);

CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON public.messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON public.messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_reply_to_id ON public.messages(reply_to_id);

CREATE INDEX IF NOT EXISTS idx_message_reactions_message_id ON public.message_reactions(message_id);
CREATE INDEX IF NOT EXISTS idx_message_reactions_user_id ON public.message_reactions(user_id);

CREATE INDEX IF NOT EXISTS idx_message_read_receipts_message_id ON public.message_read_receipts(message_id);
CREATE INDEX IF NOT EXISTS idx_message_read_receipts_user_id ON public.message_read_receipts(user_id);

-- Create function to update conversation last_message_at
CREATE OR REPLACE FUNCTION update_conversation_last_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.conversations 
  SET last_message_at = NOW()
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updating last_message_at
DROP TRIGGER IF EXISTS update_conversation_last_message_trigger ON public.messages;
CREATE TRIGGER update_conversation_last_message_trigger
  AFTER INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION update_conversation_last_message();

-- Create function to get unread message count (if not exists)
CREATE OR REPLACE FUNCTION get_unread_message_count(p_user_id UUID, p_conversation_id UUID)
RETURNS INTEGER AS $$
DECLARE
  unread_count INTEGER;
  last_read_at TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Get user's last read timestamp for this conversation
  SELECT cp.last_read_at INTO last_read_at
  FROM public.conversation_participants cp
  WHERE cp.user_id = p_user_id AND cp.conversation_id = p_conversation_id;
  
  -- If user is not a participant, return 0
  IF last_read_at IS NULL THEN
    RETURN 0;
  END IF;
  
  -- Count messages created after last read time
  SELECT COUNT(*)::INTEGER INTO unread_count
  FROM public.messages m
  WHERE m.conversation_id = p_conversation_id
    AND m.created_at > last_read_at
    AND m.sender_id != p_user_id
    AND m.deleted_at IS NULL;
    
  RETURN COALESCE(unread_count, 0);
END;
$$ LANGUAGE plpgsql;

-- Create function to mark messages as read
CREATE OR REPLACE FUNCTION mark_messages_as_read(p_user_id UUID, p_conversation_id UUID)
RETURNS VOID AS $$
BEGIN
  -- Update participant's last read timestamp
  UPDATE public.conversation_participants 
  SET last_read_at = NOW()
  WHERE user_id = p_user_id AND conversation_id = p_conversation_id;
END;
$$ LANGUAGE plpgsql;

-- Enable Row Level Security
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_read_receipts ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for conversations
CREATE POLICY "Users can view conversations they participate in" ON public.conversations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.conversation_participants cp
      WHERE cp.conversation_id = public.conversations.id
        AND cp.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create conversations" ON public.conversations
  FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Conversation admins can update conversations" ON public.conversations
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.conversation_participants cp
      WHERE cp.conversation_id = public.conversations.id
        AND cp.user_id = auth.uid()
        AND cp.role IN ('admin')
    )
  );

-- Create RLS policies for conversation_participants
CREATE POLICY "Users can view participants in their conversations" ON public.conversation_participants
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.conversation_participants cp
      WHERE cp.conversation_id = public.conversation_participants.conversation_id
        AND cp.user_id = auth.uid()
    )
  );

CREATE POLICY "Conversation admins can manage participants" ON public.conversation_participants
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.conversation_participants cp
      WHERE cp.conversation_id = public.conversation_participants.conversation_id
        AND cp.user_id = auth.uid()
        AND cp.role IN ('admin')
    )
  );

-- Create RLS policies for messages
CREATE POLICY "Users can view messages in their conversations" ON public.messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.conversation_participants cp
      WHERE cp.conversation_id = public.messages.conversation_id
        AND cp.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can send messages to their conversations" ON public.messages
  FOR INSERT WITH CHECK (
    auth.uid() = sender_id AND
    EXISTS (
      SELECT 1 FROM public.conversation_participants cp
      WHERE cp.conversation_id = public.messages.conversation_id
        AND cp.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can edit their own messages" ON public.messages
  FOR UPDATE USING (auth.uid() = sender_id);

-- Create RLS policies for message_reactions
CREATE POLICY "Users can view reactions in their conversations" ON public.message_reactions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.messages m
      JOIN public.conversation_participants cp ON cp.conversation_id = m.conversation_id
      WHERE m.id = public.message_reactions.message_id
        AND cp.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage their own reactions" ON public.message_reactions
  FOR ALL USING (auth.uid() = user_id);

-- Create RLS policies for message_read_receipts
CREATE POLICY "Users can view read receipts in their conversations" ON public.message_read_receipts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.messages m
      JOIN public.conversation_participants cp ON cp.conversation_id = m.conversation_id
      WHERE m.id = public.message_read_receipts.message_id
        AND cp.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage their own read receipts" ON public.message_read_receipts
  FOR ALL USING (auth.uid() = user_id);

-- Additional RLS policies to fix participant insert / update issues

-- Allow any authenticated user to insert their own participant record when creating or joining a conversation
CREATE POLICY "Participant can add self to conversation" ON public.conversation_participants
  FOR INSERT
  WITH CHECK ( auth.uid() = user_id );

-- Allow a participant to update their own row (e.g. to set last_read_at, mute, pin, etc.)
CREATE POLICY "Participant can update self participant row" ON public.conversation_participants
  FOR UPDATE
  USING ( auth.uid() = user_id )
  WITH CHECK ( auth.uid() = user_id );

-- Fine-grained policy to allow conversation admins to manage any participant rows (keeps existing ALL policy but narrows demotion edge-case)
DROP POLICY IF EXISTS "Conversation admins can manage participants" ON public.conversation_participants;
CREATE POLICY "Conversation admins can manage participants" ON public.conversation_participants
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.conversation_participants cp
      WHERE cp.conversation_id = public.conversation_participants.conversation_id
        AND cp.user_id = auth.uid()
        AND cp.role = 'admin'
    )
  );

-- Allow participants to SELECT their own rows explicitly (redundant with existing view policy but adds clarity)
CREATE POLICY "Participant can view own participant row" ON public.conversation_participants
  FOR SELECT
  USING ( auth.uid() = user_id );

-- Create user sync trigger function to ensure auth.users are copied to public.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, full_name, avatar_url, updated_at)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.raw_user_meta_data->>'avatar_url',
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = COALESCE(EXCLUDED.full_name, public.users.full_name),
    avatar_url = COALESCE(EXCLUDED.avatar_url, public.users.avatar_url),
    updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to sync auth.users to public.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT OR UPDATE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Insert current authenticated users into public.users if they don't exist (migration fix)
-- This handles existing users who signed up before the trigger was created
INSERT INTO public.users (id, full_name, updated_at)
SELECT 
  au.id,
  COALESCE(au.raw_user_meta_data->>'full_name', au.email),
  NOW()
FROM auth.users au
WHERE NOT EXISTS (
  SELECT 1 FROM public.users pu WHERE pu.id = au.id
)
ON CONFLICT (id) DO NOTHING; 