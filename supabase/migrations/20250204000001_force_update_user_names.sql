-- Force update all existing users to ensure they have names
-- This will trigger the sync_user_from_auth trigger

-- First, let's manually update users who don't have full_name
UPDATE public.users u
SET 
  full_name = COALESCE(
    u.full_name,
    (SELECT raw_user_meta_data->>'full_name' FROM auth.users WHERE id = u.id),
    (SELECT raw_user_meta_data->>'name' FROM auth.users WHERE id = u.id),
    (SELECT email FROM auth.users WHERE id = u.id)
  ),
  updated_at = NOW()
WHERE u.full_name IS NULL OR u.full_name = '';

-- Also update username if it's null, using email prefix
UPDATE public.users u
SET 
  username = COALESCE(
    u.username,
    (SELECT LOWER(SPLIT_PART(email, '@', 1)) FROM auth.users WHERE id = u.id)
  ),
  updated_at = NOW()
WHERE u.username IS NULL OR u.username = '';

-- Create a function that extracts a readable name from email
CREATE OR REPLACE FUNCTION public.extract_name_from_email(email TEXT)
RETURNS TEXT AS $$
BEGIN
  -- Extract the part before @ and replace common separators with spaces
  -- e.g., john.doe@email.com -> John Doe
  RETURN INITCAP(REPLACE(REPLACE(REPLACE(SPLIT_PART(email, '@', 1), '.', ' '), '_', ' '), '-', ' '));
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Update the sync function to use better name extraction and prioritize username from metadata
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
      extract_name_from_email(NEW.email)
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
      extract_name_from_email(NEW.email)
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

-- Force update all auth.users to trigger the sync
UPDATE auth.users 
SET updated_at = NOW() 
WHERE id IN (
  SELECT id FROM public.users 
  WHERE full_name IS NULL 
     OR full_name = '' 
     OR username IS NULL 
     OR username = ''
); 