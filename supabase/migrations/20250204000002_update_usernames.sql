-- Update usernames for users who have full_name but no username
UPDATE public.users u
SET 
  username = COALESCE(
    u.username,
    (SELECT LOWER(SPLIT_PART(email, '@', 1)) FROM auth.users WHERE id = u.id)
  ),
  updated_at = NOW()
WHERE (u.username IS NULL OR u.username = '') 
  AND u.full_name IS NOT NULL 
  AND u.full_name != ''; 