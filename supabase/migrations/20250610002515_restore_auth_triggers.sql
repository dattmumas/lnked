-- Restore auth triggers that were missing after database reset
-- These triggers sync auth.users to public.users

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;

-- Create trigger for new user signups
CREATE TRIGGER on_auth_user_created 
  AFTER INSERT ON auth.users 
  FOR EACH ROW 
  EXECUTE FUNCTION public.sync_user_from_auth();

-- Create trigger for user profile updates
CREATE TRIGGER on_auth_user_updated 
  AFTER UPDATE ON auth.users 
  FOR EACH ROW 
  EXECUTE FUNCTION public.sync_user_from_auth();
