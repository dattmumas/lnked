-- Fix infinite recursion in RLS policies
-- Remove all existing policies first
DROP POLICY IF EXISTS "Users can view conversations they participate in" ON public.conversations;
DROP POLICY IF EXISTS "Users can create conversations" ON public.conversations;
DROP POLICY IF EXISTS "Conversation admins can update conversations" ON public.conversations;

DROP POLICY IF EXISTS "Users can view participants in their conversations" ON public.conversation_participants;
DROP POLICY IF EXISTS "Conversation admins can manage participants" ON public.conversation_participants;
DROP POLICY IF EXISTS "Participant can add self to conversation" ON public.conversation_participants;
DROP POLICY IF EXISTS "Participant can update self participant row" ON public.conversation_participants;
DROP POLICY IF EXISTS "Participant can view own participant row" ON public.conversation_participants;

DROP POLICY IF EXISTS "Users can view messages in their conversations" ON public.messages;
DROP POLICY IF EXISTS "Users can send messages to their conversations" ON public.messages;
DROP POLICY IF EXISTS "Users can edit their own messages" ON public.messages;

DROP POLICY IF EXISTS "Users can view reactions in their conversations" ON public.message_reactions;
DROP POLICY IF EXISTS "Users can manage their own reactions" ON public.message_reactions;

DROP POLICY IF EXISTS "Users can view read receipts in their conversations" ON public.message_read_receipts;
DROP POLICY IF EXISTS "Users can manage their own read receipts" ON public.message_read_receipts;

-- Create new simplified policies without recursion

-- Conversations policies
CREATE POLICY "Users can view conversations they participate in" ON public.conversations
  FOR SELECT USING (
    auth.uid() IN (
      SELECT cp.user_id FROM public.conversation_participants cp
      WHERE cp.conversation_id = public.conversations.id
    )
  );

CREATE POLICY "Users can create conversations" ON public.conversations
  FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Conversation admins can update conversations" ON public.conversations
  FOR UPDATE USING (
    auth.uid() IN (
      SELECT cp.user_id FROM public.conversation_participants cp
      WHERE cp.conversation_id = public.conversations.id AND cp.role = 'admin'
    )
  );

-- Conversation participants policies
CREATE POLICY "Participants can view all participants in their conversations" ON public.conversation_participants
  FOR SELECT USING (
    auth.uid() IN (
      SELECT cp.user_id FROM public.conversation_participants cp
      WHERE cp.conversation_id = public.conversation_participants.conversation_id
    )
  );

CREATE POLICY "Users can add themselves to conversations" ON public.conversation_participants
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own participant record" ON public.conversation_participants
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage participants" ON public.conversation_participants
  FOR ALL USING (
    auth.uid() IN (
      SELECT cp.user_id FROM public.conversation_participants cp
      WHERE cp.conversation_id = public.conversation_participants.conversation_id AND cp.role = 'admin'
    )
  );

-- Messages policies
CREATE POLICY "Users can view messages in their conversations" ON public.messages
  FOR SELECT USING (
    auth.uid() IN (
      SELECT cp.user_id FROM public.conversation_participants cp
      WHERE cp.conversation_id = public.messages.conversation_id
    )
  );

CREATE POLICY "Users can send messages to their conversations" ON public.messages
  FOR INSERT WITH CHECK (
    auth.uid() = sender_id AND
    auth.uid() IN (
      SELECT cp.user_id FROM public.conversation_participants cp
      WHERE cp.conversation_id = public.messages.conversation_id
    )
  );

CREATE POLICY "Users can edit their own messages" ON public.messages
  FOR UPDATE USING (auth.uid() = sender_id);

-- Message reactions policies
CREATE POLICY "Users can view reactions in their conversations" ON public.message_reactions
  FOR SELECT USING (
    auth.uid() IN (
      SELECT cp.user_id FROM public.conversation_participants cp
      JOIN public.messages m ON m.conversation_id = cp.conversation_id
      WHERE m.id = public.message_reactions.message_id
    )
  );

CREATE POLICY "Users can manage their own reactions" ON public.message_reactions
  FOR ALL USING (auth.uid() = user_id);

-- Message read receipts policies
CREATE POLICY "Users can view read receipts in their conversations" ON public.message_read_receipts
  FOR SELECT USING (
    auth.uid() IN (
      SELECT cp.user_id FROM public.conversation_participants cp
      JOIN public.messages m ON m.conversation_id = cp.conversation_id
      WHERE m.id = public.message_read_receipts.message_id
    )
  );

CREATE POLICY "Users can manage their own read receipts" ON public.message_read_receipts
  FOR ALL USING (auth.uid() = user_id);

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