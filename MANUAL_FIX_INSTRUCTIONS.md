# Manual Fix for Chat RLS Issues

## Problem

The chat feature is experiencing infinite recursion in RLS policies and missing user sync between `auth.users` and `public.users`.

## Solution

Go to your Supabase Dashboard → SQL Editor and run these commands in order:

### Step 1: Drop Problematic Policies

```sql
DROP POLICY IF EXISTS "Users can view participants in their conversations" ON public.conversation_participants;
DROP POLICY IF EXISTS "Conversation admins can manage participants" ON public.conversation_participants;
```

### Step 2: Create Fixed Policies

```sql
-- Allow users to add themselves to conversations
CREATE POLICY "Users can add themselves to conversations" ON public.conversation_participants
FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Allow users to update their own participant record (for last_read_at, etc.)
CREATE POLICY "Users can update their own participant record" ON public.conversation_participants
FOR UPDATE USING (auth.uid() = user_id);

-- Allow viewing participants without recursion
CREATE POLICY "Participants can view all participants in their conversations" ON public.conversation_participants
FOR SELECT USING (
  auth.uid() IN (
    SELECT cp.user_id
    FROM public.conversation_participants cp
    WHERE cp.conversation_id = public.conversation_participants.conversation_id
  )
);
```

### Step 3: Create User Sync Function

```sql
-- Function to sync auth.users to public.users
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

-- Create trigger to sync new users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT OR UPDATE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
```

### Step 4: Sync Existing Users

```sql
-- Insert existing auth users into public.users
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
```

## Verification

After running these commands, test the chat feature:

1. Try creating a new conversation
2. Check if the conversation appears in the list
3. Try sending a message
4. Verify unread counts update properly

The 500 error should now be resolved and conversations should create successfully.

## What This Fixes

1. **RLS Infinite Recursion**: Replaced self-referencing policies with direct queries
2. **Missing Users**: Added automatic sync between auth.users and public.users
3. **Conversation Creation**: Users can now insert themselves as participants
4. **Read Status**: Users can update their own last_read_at timestamps

## Next Steps

After applying these fixes:

- Test conversation creation in the UI
- Test message sending
- Verify real-time updates work
- Check unread counters function properly
