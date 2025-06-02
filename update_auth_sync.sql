-- Update the sync function to prioritize username from auth metadata
-- This ensures new sign-ups with username in metadata create users with proper usernames

CREATE OR REPLACE FUNCTION public.sync_user_from_auth()
RETURNS TRIGGER AS $$
BEGIN
  -- Update or insert user data
  INSERT INTO public.users (id, full_name, username, avatar_url, updated_at)
  VALUES (
    NEW.id,
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name',
      NEW.raw_user_meta_data->>'username', -- Use username as display name if no full_name
      public.extract_name_from_email(NEW.email)
    ),
    COALESCE(
      NEW.raw_user_meta_data->>'username', -- Prioritize username from sign-up form
      LOWER(SPLIT_PART(NEW.email, '@', 1))
    ),
    NEW.raw_user_meta_data->>'avatar_url',
    NOW()
  )
  ON CONFLICT (id) DO UPDATE
  SET 
    full_name = COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name', 
      EXCLUDED.full_name, 
      users.full_name,
      NEW.raw_user_meta_data->>'username',
      public.extract_name_from_email(NEW.email)
    ),
    username = COALESCE(
      NEW.raw_user_meta_data->>'username', -- Always prioritize username from metadata
      EXCLUDED.username,
      users.username,
      LOWER(SPLIT_PART(NEW.email, '@', 1))
    ),
    avatar_url = COALESCE(
      NEW.raw_user_meta_data->>'avatar_url',
      EXCLUDED.avatar_url, 
      users.avatar_url
    ),
    updated_at = NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 