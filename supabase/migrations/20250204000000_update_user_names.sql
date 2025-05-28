-- Update existing users with their email-based names if they don't have full_name
UPDATE public.users u
SET full_name = COALESCE(
  u.full_name,
  (SELECT raw_user_meta_data->>'full_name' FROM auth.users WHERE id = u.id),
  (SELECT email FROM auth.users WHERE id = u.id)
)
WHERE u.full_name IS NULL;

-- Create a function to sync user data from auth.users
CREATE OR REPLACE FUNCTION public.sync_user_from_auth()
RETURNS TRIGGER AS $$
BEGIN
  -- Update or insert user data
  INSERT INTO public.users (id, full_name, avatar_url, updated_at)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.raw_user_meta_data->>'avatar_url',
    NOW()
  )
  ON CONFLICT (id) DO UPDATE
  SET 
    full_name = COALESCE(EXCLUDED.full_name, users.full_name, NEW.email),
    avatar_url = COALESCE(EXCLUDED.avatar_url, users.avatar_url),
    updated_at = NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to sync on auth.users changes
CREATE TRIGGER sync_user_from_auth_trigger
  AFTER INSERT OR UPDATE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_user_from_auth();

-- Also create a function to get user email for display purposes
CREATE OR REPLACE FUNCTION public.get_user_email(user_id UUID)
RETURNS TEXT AS $$
  SELECT email FROM auth.users WHERE id = user_id;
$$ LANGUAGE SQL SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_user_email TO authenticated; 