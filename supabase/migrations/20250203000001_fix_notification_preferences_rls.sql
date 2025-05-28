-- Fix RLS policies for notification_preferences to allow system functions to create default preferences

-- Drop existing policy
DROP POLICY IF EXISTS "Users can manage their own notification preferences" ON notification_preferences;

-- Create separate policies for different operations
CREATE POLICY "Users can view their own notification preferences" ON notification_preferences
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can update their own notification preferences" ON notification_preferences
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own notification preferences" ON notification_preferences
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own notification preferences" ON notification_preferences
  FOR DELETE USING (user_id = auth.uid());

-- Create a security definer function to create default preferences
-- This function bypasses RLS and can be called by triggers
CREATE OR REPLACE FUNCTION create_default_notification_preferences(
  p_user_id uuid,
  p_notification_type notification_type
)
RETURNS void
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO notification_preferences (user_id, notification_type, email_enabled, push_enabled, in_app_enabled)
  VALUES (p_user_id, p_notification_type, true, true, true)
  ON CONFLICT (user_id, notification_type) DO NOTHING;
END;
$$ LANGUAGE plpgsql;

-- Update the create_notification function to use the security definer function
CREATE OR REPLACE FUNCTION create_notification(
  p_recipient_id uuid,
  p_actor_id uuid,
  p_type notification_type,
  p_title text,
  p_message text,
  p_entity_type text DEFAULT NULL,
  p_entity_id uuid DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'
)
RETURNS uuid AS $$
DECLARE
  notification_id uuid;
  user_preferences record;
BEGIN
  -- Don't create notification if actor and recipient are the same
  IF p_actor_id = p_recipient_id THEN
    RETURN NULL;
  END IF;

  -- Check user preferences
  SELECT * INTO user_preferences
  FROM notification_preferences
  WHERE user_id = p_recipient_id AND notification_type = p_type;

  -- If no preferences exist, create default ones using the security definer function
  IF NOT FOUND THEN
    PERFORM create_default_notification_preferences(p_recipient_id, p_type);
    -- Set default values for the check below
    user_preferences.in_app_enabled := true;
  END IF;

  -- Only create notification if in-app notifications are enabled
  IF user_preferences.in_app_enabled THEN
    INSERT INTO notifications (
      recipient_id,
      actor_id,
      type,
      title,
      message,
      entity_type,
      entity_id,
      metadata
    ) VALUES (
      p_recipient_id,
      p_actor_id,
      p_type,
      p_title,
      p_message,
      p_entity_type,
      p_entity_id,
      p_metadata
    ) RETURNING id INTO notification_id;

    RETURN notification_id;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission on the security definer function to authenticated users
GRANT EXECUTE ON FUNCTION create_default_notification_preferences TO authenticated;
GRANT EXECUTE ON FUNCTION create_notification TO authenticated; 