-- Fix sync_user_from_auth function to handle missing metadata
-- This ensures sign-ups work even when user metadata is not provided

CREATE OR REPLACE FUNCTION public.sync_user_from_auth() 
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Insert or update user data with proper fallbacks
  INSERT INTO public.users (id, full_name, username, avatar_url, updated_at)
  VALUES (
    NEW.id,
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name',
      split_part(NEW.email, '@', 1)  -- Extract name from email
    ),
    COALESCE(
      NEW.raw_user_meta_data->>'username',
      lower(regexp_replace(split_part(NEW.email, '@', 1), '[^a-zA-Z0-9]', '', 'g'))  -- Create username from email
    ),
    NEW.raw_user_meta_data->>'avatar_url',
    NOW()
  )
  ON CONFLICT (id) DO UPDATE
  SET 
    full_name = COALESCE(EXCLUDED.full_name, users.full_name),
    username = COALESCE(EXCLUDED.username, users.username),
    avatar_url = COALESCE(EXCLUDED.avatar_url, users.avatar_url),
    updated_at = NOW();
  
  RETURN NEW;
END;
$$;
