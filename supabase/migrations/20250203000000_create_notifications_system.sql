-- Create notifications system tables and functions

-- Create notification types enum
CREATE TYPE notification_type AS ENUM (
  'follow',
  'unfollow',
  'post_like',
  'post_comment',
  'comment_reply',
  'comment_like',
  'post_published',
  'collective_invite',
  'collective_join',
  'collective_leave',
  'subscription_created',
  'subscription_cancelled',
  'mention',
  'post_bookmark',
  'featured_post'
);

-- Create notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  actor_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  type notification_type NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  entity_type text CHECK (entity_type IN ('post', 'comment', 'user', 'collective', 'subscription')),
  entity_id uuid,
  metadata jsonb DEFAULT '{}',
  read_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create notification preferences table
CREATE TABLE IF NOT EXISTS public.notification_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  notification_type notification_type NOT NULL,
  email_enabled boolean DEFAULT true,
  push_enabled boolean DEFAULT true,
  in_app_enabled boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, notification_type)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_notifications_recipient_id ON public.notifications(recipient_id);
CREATE INDEX IF NOT EXISTS idx_notifications_actor_id ON public.notifications(actor_id);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON public.notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_read_at ON public.notifications(read_at);
CREATE INDEX IF NOT EXISTS idx_notifications_entity ON public.notifications(entity_type, entity_id);

CREATE INDEX IF NOT EXISTS idx_notification_preferences_user_id ON public.notification_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_preferences_type ON public.notification_preferences(notification_type);

-- Function to create a notification
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

  -- If no preferences exist, create default ones
  IF NOT FOUND THEN
    INSERT INTO notification_preferences (user_id, notification_type)
    VALUES (p_recipient_id, p_type);
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
$$ LANGUAGE plpgsql;

-- Function to mark notifications as read
CREATE OR REPLACE FUNCTION mark_notifications_as_read(
  p_user_id uuid,
  p_notification_ids uuid[] DEFAULT NULL
)
RETURNS integer AS $$
DECLARE
  updated_count integer;
BEGIN
  IF p_notification_ids IS NULL THEN
    -- Mark all unread notifications as read
    UPDATE notifications
    SET read_at = now(), updated_at = now()
    WHERE recipient_id = p_user_id AND read_at IS NULL;
  ELSE
    -- Mark specific notifications as read
    UPDATE notifications
    SET read_at = now(), updated_at = now()
    WHERE recipient_id = p_user_id 
      AND id = ANY(p_notification_ids)
      AND read_at IS NULL;
  END IF;

  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$ LANGUAGE plpgsql;

-- Function to get unread notification count
CREATE OR REPLACE FUNCTION get_unread_notification_count(p_user_id uuid)
RETURNS integer AS $$
DECLARE
  unread_count integer;
BEGIN
  SELECT COUNT(*)::integer INTO unread_count
  FROM notifications
  WHERE recipient_id = p_user_id AND read_at IS NULL;

  RETURN unread_count;
END;
$$ LANGUAGE plpgsql;

-- Function to clean up old notifications (older than 90 days)
CREATE OR REPLACE FUNCTION cleanup_old_notifications()
RETURNS integer AS $$
DECLARE
  deleted_count integer;
BEGIN
  DELETE FROM notifications
  WHERE created_at < now() - interval '90 days';

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Trigger function for follow notifications
CREATE OR REPLACE FUNCTION trigger_follow_notification()
RETURNS TRIGGER AS $$
DECLARE
  actor_name text;
  recipient_id uuid;
  notification_title text;
  notification_message text;
BEGIN
  -- Get actor's name
  SELECT COALESCE(full_name, username, 'Someone') INTO actor_name
  FROM users WHERE id = NEW.follower_id;

  -- Set recipient based on following type
  IF NEW.following_type = 'user' THEN
    recipient_id := NEW.following_id;
    notification_title := 'New follower';
    notification_message := actor_name || ' started following you';
  ELSIF NEW.following_type = 'collective' THEN
    -- Get collective owner as recipient
    SELECT owner_id INTO recipient_id
    FROM collectives WHERE id = NEW.following_id;
    notification_title := 'New collective follower';
    notification_message := actor_name || ' started following your collective';
  END IF;

  -- Create notification
  IF recipient_id IS NOT NULL THEN
    PERFORM create_notification(
      recipient_id,
      NEW.follower_id,
      'follow',
      notification_title,
      notification_message,
      NEW.following_type,
      NEW.following_id
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger function for post like notifications
CREATE OR REPLACE FUNCTION trigger_post_like_notification()
RETURNS TRIGGER AS $$
DECLARE
  actor_name text;
  post_author_id uuid;
  post_title text;
  notification_message text;
BEGIN
  -- Get actor's name
  SELECT COALESCE(full_name, username, 'Someone') INTO actor_name
  FROM users WHERE id = NEW.user_id;

  -- Get post details
  SELECT author_id, title INTO post_author_id, post_title
  FROM posts WHERE id = NEW.post_id;

  -- Create notification message
  notification_message := actor_name || ' liked your post';
  IF post_title IS NOT NULL THEN
    notification_message := notification_message || ': "' || LEFT(post_title, 50) || '"';
  END IF;

  -- Create notification
  IF post_author_id IS NOT NULL THEN
    PERFORM create_notification(
      post_author_id,
      NEW.user_id,
      'post_like',
      'Post liked',
      notification_message,
      'post',
      NEW.post_id
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger function for comment notifications
CREATE OR REPLACE FUNCTION trigger_comment_notification()
RETURNS TRIGGER AS $$
DECLARE
  actor_name text;
  post_author_id uuid;
  post_title text;
  parent_comment_author_id uuid;
  notification_message text;
BEGIN
  -- Get actor's name
  SELECT COALESCE(full_name, username, 'Someone') INTO actor_name
  FROM users WHERE id = NEW.user_id;

  -- Get post details
  SELECT author_id, title INTO post_author_id, post_title
  FROM posts WHERE id = NEW.post_id;

  -- If this is a reply to another comment
  IF NEW.parent_id IS NOT NULL THEN
    SELECT user_id INTO parent_comment_author_id
    FROM comments WHERE id = NEW.parent_id;

    -- Notify the parent comment author
    IF parent_comment_author_id IS NOT NULL AND parent_comment_author_id != NEW.user_id THEN
      notification_message := actor_name || ' replied to your comment';
      PERFORM create_notification(
        parent_comment_author_id,
        NEW.user_id,
        'comment_reply',
        'Comment reply',
        notification_message,
        'comment',
        NEW.id
      );
    END IF;
  END IF;

  -- Notify the post author (if different from comment author and parent comment author)
  IF post_author_id IS NOT NULL 
     AND post_author_id != NEW.user_id 
     AND (NEW.parent_id IS NULL OR post_author_id != parent_comment_author_id) THEN
    
    notification_message := actor_name || ' commented on your post';
    IF post_title IS NOT NULL THEN
      notification_message := notification_message || ': "' || LEFT(post_title, 50) || '"';
    END IF;

    PERFORM create_notification(
      post_author_id,
      NEW.user_id,
      'post_comment',
      'New comment',
      notification_message,
      'comment',
      NEW.id
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger function for post bookmark notifications
CREATE OR REPLACE FUNCTION trigger_bookmark_notification()
RETURNS TRIGGER AS $$
DECLARE
  actor_name text;
  post_author_id uuid;
  post_title text;
  notification_message text;
BEGIN
  -- Get actor's name
  SELECT COALESCE(full_name, username, 'Someone') INTO actor_name
  FROM users WHERE id = NEW.user_id;

  -- Get post details
  SELECT author_id, title INTO post_author_id, post_title
  FROM posts WHERE id = NEW.post_id;

  -- Create notification message
  notification_message := actor_name || ' bookmarked your post';
  IF post_title IS NOT NULL THEN
    notification_message := notification_message || ': "' || LEFT(post_title, 50) || '"';
  END IF;

  -- Create notification
  IF post_author_id IS NOT NULL THEN
    PERFORM create_notification(
      post_author_id,
      NEW.user_id,
      'post_bookmark',
      'Post bookmarked',
      notification_message,
      'post',
      NEW.post_id
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
CREATE TRIGGER trigger_follow_notification
  AFTER INSERT ON follows
  FOR EACH ROW
  EXECUTE FUNCTION trigger_follow_notification();

CREATE TRIGGER trigger_post_like_notification
  AFTER INSERT ON post_reactions
  FOR EACH ROW
  WHEN (NEW.type = 'like')
  EXECUTE FUNCTION trigger_post_like_notification();

CREATE TRIGGER trigger_comment_notification
  AFTER INSERT ON comments
  FOR EACH ROW
  EXECUTE FUNCTION trigger_comment_notification();

CREATE TRIGGER trigger_bookmark_notification
  AFTER INSERT ON post_bookmarks
  FOR EACH ROW
  EXECUTE FUNCTION trigger_bookmark_notification();

-- Enable Row Level Security
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for notifications
CREATE POLICY "Users can view their own notifications" ON notifications
  FOR SELECT USING (recipient_id = auth.uid());

CREATE POLICY "Users can update their own notifications" ON notifications
  FOR UPDATE USING (recipient_id = auth.uid());

-- Create RLS policies for notification preferences
CREATE POLICY "Users can manage their own notification preferences" ON notification_preferences
  FOR ALL USING (user_id = auth.uid());

-- Insert default notification preferences for existing users
INSERT INTO notification_preferences (user_id, notification_type, email_enabled, push_enabled, in_app_enabled)
SELECT 
  u.id,
  nt.notification_type,
  true,
  true,
  true
FROM users u
CROSS JOIN (
  SELECT unnest(enum_range(NULL::notification_type)) as notification_type
) nt
ON CONFLICT (user_id, notification_type) DO NOTHING; 