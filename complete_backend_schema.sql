

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE EXTENSION IF NOT EXISTS "pg_net" WITH SCHEMA "extensions";






COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgjwt" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE TYPE "public"."notification_type" AS ENUM (
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


ALTER TYPE "public"."notification_type" OWNER TO "postgres";


CREATE TYPE "public"."post_type_enum" AS ENUM (
    'text',
    'video'
);


ALTER TYPE "public"."post_type_enum" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."cleanup_old_notifications"() RETURNS integer
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  deleted_count integer;
BEGIN
  DELETE FROM notifications
  WHERE created_at < now() - interval '90 days';

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;


ALTER FUNCTION "public"."cleanup_old_notifications"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_default_notification_preferences"("p_user_id" "uuid", "p_notification_type" "public"."notification_type") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  INSERT INTO notification_preferences (user_id, notification_type, email_enabled, push_enabled, in_app_enabled)
  VALUES (p_user_id, p_notification_type, true, true, true)
  ON CONFLICT (user_id, notification_type) DO NOTHING;
END;
$$;


ALTER FUNCTION "public"."create_default_notification_preferences"("p_user_id" "uuid", "p_notification_type" "public"."notification_type") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_notification"("p_recipient_id" "uuid", "p_actor_id" "uuid", "p_type" "public"."notification_type", "p_title" "text", "p_message" "text", "p_entity_type" "text" DEFAULT NULL::"text", "p_entity_id" "uuid" DEFAULT NULL::"uuid", "p_metadata" "jsonb" DEFAULT '{}'::"jsonb") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
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
$$;


ALTER FUNCTION "public"."create_notification"("p_recipient_id" "uuid", "p_actor_id" "uuid", "p_type" "public"."notification_type", "p_title" "text", "p_message" "text", "p_entity_type" "text", "p_entity_id" "uuid", "p_metadata" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."extract_name_from_email"("email" "text") RETURNS "text"
    LANGUAGE "plpgsql" IMMUTABLE
    AS $$
BEGIN
  -- Extract the part before @ and replace common separators with spaces
  -- e.g., john.doe@email.com -> John Doe
  RETURN INITCAP(REPLACE(REPLACE(REPLACE(SPLIT_PART(email, '@', 1), '.', ' '), '_', ' '), '-', ' '));
END;
$$;


ALTER FUNCTION "public"."extract_name_from_email"("email" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_unread_message_count"("p_user_id" "uuid", "p_conversation_id" "uuid") RETURNS integer
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  last_read_at TIMESTAMP WITH TIME ZONE;
  unread_count INTEGER;
BEGIN
  -- Get the user's last read timestamp for this conversation
  SELECT cp.last_read_at INTO last_read_at
  FROM conversation_participants cp
  WHERE cp.user_id = p_user_id AND cp.conversation_id = p_conversation_id;
  
  -- If user is not a participant, return 0
  IF last_read_at IS NULL THEN
    RETURN 0;
  END IF;
  
  -- Count messages created after last read time
  SELECT COUNT(*)::INTEGER INTO unread_count
  FROM messages m
  WHERE m.conversation_id = p_conversation_id
    AND m.created_at > last_read_at
    AND m.sender_id != p_user_id
    AND m.deleted_at IS NULL;
    
  RETURN unread_count;
END;
$$;


ALTER FUNCTION "public"."get_unread_message_count"("p_user_id" "uuid", "p_conversation_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_unread_notification_count"("p_user_id" "uuid") RETURNS integer
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  unread_count integer;
BEGIN
  SELECT COUNT(*)::integer INTO unread_count
  FROM notifications
  WHERE recipient_id = p_user_id AND read_at IS NULL;

  RETURN unread_count;
END;
$$;


ALTER FUNCTION "public"."get_unread_notification_count"("p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_email"("user_id" "uuid") RETURNS "text"
    LANGUAGE "sql" SECURITY DEFINER
    AS $$
  SELECT email FROM auth.users WHERE id = user_id;
$$;


ALTER FUNCTION "public"."get_user_email"("user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."mark_messages_as_read"("p_user_id" "uuid", "p_conversation_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  -- Update participant's last_read_at
  UPDATE conversation_participants
  SET last_read_at = NOW()
  WHERE user_id = p_user_id AND conversation_id = p_conversation_id;
  
  -- Insert read receipts for unread messages
  INSERT INTO message_read_receipts (message_id, user_id, read_at)
  SELECT m.id, p_user_id, NOW()
  FROM messages m
  LEFT JOIN message_read_receipts mrr ON mrr.message_id = m.id AND mrr.user_id = p_user_id
  WHERE m.conversation_id = p_conversation_id
    AND m.sender_id != p_user_id
    AND m.deleted_at IS NULL
    AND mrr.id IS NULL;
END;
$$;


ALTER FUNCTION "public"."mark_messages_as_read"("p_user_id" "uuid", "p_conversation_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."mark_notifications_as_read"("p_user_id" "uuid", "p_notification_ids" "uuid"[] DEFAULT NULL::"uuid"[]) RETURNS integer
    LANGUAGE "plpgsql"
    AS $$
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
$$;


ALTER FUNCTION "public"."mark_notifications_as_read"("p_user_id" "uuid", "p_notification_ids" "uuid"[]) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_user_from_auth"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  -- Update or insert user data
  INSERT INTO public.users (id, full_name, username, avatar_url, updated_at)
  VALUES (
    NEW.id,
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name',
      extract_name_from_email(NEW.email)
    ),
    COALESCE(
      NEW.raw_user_meta_data->>'username',
      LOWER(SPLIT_PART(NEW.email, '@', 1))
    ),
    NEW.raw_user_meta_data->>'avatar_url',
    NOW()
  )
  ON CONFLICT (id) DO UPDATE
  SET 
    full_name = COALESCE(
      EXCLUDED.full_name, 
      users.full_name,
      extract_name_from_email(NEW.email)
    ),
    username = COALESCE(
      EXCLUDED.username,
      users.username,
      LOWER(SPLIT_PART(NEW.email, '@', 1))
    ),
    avatar_url = COALESCE(EXCLUDED.avatar_url, users.avatar_url),
    updated_at = NOW();
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."sync_user_from_auth"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trigger_bookmark_notification"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
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
$$;


ALTER FUNCTION "public"."trigger_bookmark_notification"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trigger_comment_notification"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
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
$$;


ALTER FUNCTION "public"."trigger_comment_notification"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trigger_follow_notification"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
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
$$;


ALTER FUNCTION "public"."trigger_follow_notification"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trigger_post_like_notification"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
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
$$;


ALTER FUNCTION "public"."trigger_post_like_notification"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_conversation_last_message"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  UPDATE conversations 
  SET 
    last_message_at = NOW(),
    updated_at = NOW()
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_conversation_last_message"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_live_streams_tsv"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.tsv := to_tsvector('english', 
    COALESCE(NEW.title, '') || ' ' ||
    COALESCE(NEW.description, '')
  );
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_live_streams_tsv"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_upload_sessions_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_upload_sessions_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_video_assets_tsv"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.tsv := to_tsvector('english', 
    COALESCE(NEW.title, '') || ' ' ||
    COALESCE(NEW.description, '') || ' ' ||
    COALESCE(NEW.original_filename, '')
  );
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_video_assets_tsv"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."collective_invites" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "collective_id" "uuid" NOT NULL,
    "email" "text" NOT NULL,
    "role" "text" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "invite_code" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "accepted_at" timestamp with time zone,
    "invited_by_user_id" "uuid"
);


ALTER TABLE "public"."collective_invites" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."collective_members" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "collective_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "member_id" "uuid" NOT NULL,
    "member_type" "text" DEFAULT 'user'::"text",
    "role" "text" DEFAULT 'author'::"text",
    "share_percentage" numeric,
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "collective_members_member_type_check" CHECK (("member_type" = ANY (ARRAY['user'::"text", 'collective'::"text"]))),
    CONSTRAINT "collective_members_role_check" CHECK (("role" = ANY (ARRAY['admin'::"text", 'editor'::"text", 'author'::"text", 'owner'::"text"])))
);


ALTER TABLE "public"."collective_members" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."collectives" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "cover_image_url" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "description" "text",
    "governance_model" "text",
    "intro_video_url" "text",
    "logo_url" "text",
    "name" "text" NOT NULL,
    "owner_id" "uuid",
    "pinned_post_id" "uuid",
    "slug" "text" NOT NULL,
    "stripe_account_id" "text",
    "stripe_account_type" "text",
    "stripe_customer_id" "text",
    "tags" "text"[],
    "tsv" "tsvector",
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."collectives" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."comment_reactions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "comment_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "type" "text" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "comment_reactions_type_check" CHECK (("type" = ANY (ARRAY['like'::"text", 'dislike'::"text", 'love'::"text", 'laugh'::"text", 'angry'::"text", 'sad'::"text"])))
);


ALTER TABLE "public"."comment_reactions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."comments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "content" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "parent_id" "uuid",
    "post_id" "uuid" NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "user_id" "uuid" NOT NULL
);


ALTER TABLE "public"."comments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."conversation_participants" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "conversation_id" "uuid",
    "user_id" "uuid",
    "role" character varying(50) DEFAULT 'member'::character varying,
    "joined_at" timestamp with time zone DEFAULT "now"(),
    "last_read_at" timestamp with time zone DEFAULT "now"(),
    "is_muted" boolean DEFAULT false,
    "is_pinned" boolean DEFAULT false,
    CONSTRAINT "conversation_participants_role_check" CHECK ((("role")::"text" = ANY ((ARRAY['admin'::character varying, 'moderator'::character varying, 'member'::character varying])::"text"[])))
);


ALTER TABLE "public"."conversation_participants" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."conversations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" character varying(255),
    "type" character varying(50) DEFAULT 'direct'::character varying NOT NULL,
    "description" "text",
    "is_private" boolean DEFAULT true,
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "last_message_at" timestamp with time zone DEFAULT "now"(),
    "archived" boolean DEFAULT false,
    CONSTRAINT "conversations_type_check" CHECK ((("type")::"text" = ANY ((ARRAY['direct'::character varying, 'group'::character varying, 'channel'::character varying])::"text"[])))
);


ALTER TABLE "public"."conversations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."customers" (
    "id" "uuid" NOT NULL,
    "stripe_customer_id" "text" NOT NULL
);


ALTER TABLE "public"."customers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."featured_posts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "display_order" integer DEFAULT 0,
    "owner_id" "uuid" NOT NULL,
    "owner_type" "text" NOT NULL,
    "post_id" "uuid" NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "featured_posts_owner_type_check" CHECK (("owner_type" = ANY (ARRAY['user'::"text", 'collective'::"text"])))
);


ALTER TABLE "public"."featured_posts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."follows" (
    "created_at" timestamp with time zone DEFAULT "now"(),
    "follower_id" "uuid" NOT NULL,
    "following_id" "uuid" NOT NULL,
    "following_type" "text" NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "follows_following_type_check" CHECK (("following_type" = ANY (ARRAY['user'::"text", 'collective'::"text"])))
);


ALTER TABLE "public"."follows" OWNER TO "postgres";


COMMENT ON TABLE "public"."follows" IS 'Tracks follow relationships between users and collectives';



CREATE TABLE IF NOT EXISTS "public"."interactions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "entity_id" "uuid" NOT NULL,
    "entity_type" "text" NOT NULL,
    "interaction_type" "text" NOT NULL,
    "metadata" "jsonb",
    "user_id" "uuid" NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "interactions_entity_type_check" CHECK (("entity_type" = ANY (ARRAY['collective'::"text", 'post'::"text", 'user'::"text"]))),
    CONSTRAINT "interactions_interaction_type_check" CHECK (("interaction_type" = ANY (ARRAY['like'::"text", 'unlike'::"text", 'recommended_interested'::"text", 'recommended_not_interested'::"text", 'view'::"text"])))
);


ALTER TABLE "public"."interactions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."live_streams" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "mux_stream_id" "text" NOT NULL,
    "mux_playback_ids" "jsonb" DEFAULT '[]'::"jsonb",
    "stream_key" "text" NOT NULL,
    "status" "text" DEFAULT 'idle'::"text" NOT NULL,
    "latency_mode" "text" DEFAULT 'standard'::"text",
    "reconnect_window" integer DEFAULT 60,
    "max_continuous_duration" integer DEFAULT 43200,
    "title" "text" NOT NULL,
    "description" "text",
    "playback_policy" "text" DEFAULT 'public'::"text",
    "record_stream" boolean DEFAULT false,
    "recorded_asset_id" "uuid",
    "owner_id" "uuid" NOT NULL,
    "collective_id" "uuid",
    "is_public" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "started_at" timestamp with time zone,
    "ended_at" timestamp with time zone,
    "mux_metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "tsv" "tsvector",
    CONSTRAINT "live_streams_latency_mode_check" CHECK (("latency_mode" = ANY (ARRAY['low'::"text", 'reduced'::"text", 'standard'::"text"]))),
    CONSTRAINT "live_streams_playback_policy_check" CHECK (("playback_policy" = ANY (ARRAY['public'::"text", 'signed'::"text"]))),
    CONSTRAINT "live_streams_status_check" CHECK (("status" = ANY (ARRAY['idle'::"text", 'active'::"text", 'disconnected'::"text", 'disabled'::"text"])))
);


ALTER TABLE "public"."live_streams" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."message_reactions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "message_id" "uuid",
    "user_id" "uuid",
    "emoji" character varying(100) NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."message_reactions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."message_read_receipts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "message_id" "uuid",
    "user_id" "uuid",
    "read_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."message_read_receipts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."messages" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "conversation_id" "uuid",
    "sender_id" "uuid",
    "content" "text" NOT NULL,
    "message_type" character varying(50) DEFAULT 'text'::character varying,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "reply_to_id" "uuid",
    "edited_at" timestamp with time zone,
    "deleted_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "messages_message_type_check" CHECK ((("message_type")::"text" = ANY ((ARRAY['text'::character varying, 'image'::character varying, 'file'::character varying, 'system'::character varying])::"text"[])))
);


ALTER TABLE "public"."messages" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."mux_webhooks" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "mux_webhook_id" "text" NOT NULL,
    "webhook_type" "text" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "payload" "jsonb" NOT NULL,
    "signature" "text" NOT NULL,
    "processed_at" timestamp with time zone,
    "error_message" "text",
    "retry_count" integer DEFAULT 0,
    "video_asset_id" "uuid",
    "live_stream_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "mux_webhooks_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'processed'::"text", 'failed'::"text", 'ignored'::"text"])))
);


ALTER TABLE "public"."mux_webhooks" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."notification_preferences" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "notification_type" "public"."notification_type" NOT NULL,
    "email_enabled" boolean DEFAULT true,
    "push_enabled" boolean DEFAULT true,
    "in_app_enabled" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."notification_preferences" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."notifications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "recipient_id" "uuid" NOT NULL,
    "actor_id" "uuid",
    "type" "public"."notification_type" NOT NULL,
    "title" "text" NOT NULL,
    "message" "text" NOT NULL,
    "entity_type" "text",
    "entity_id" "uuid",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "read_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "notifications_entity_type_check" CHECK (("entity_type" = ANY (ARRAY['post'::"text", 'comment'::"text", 'user'::"text", 'collective'::"text", 'subscription'::"text"])))
);


ALTER TABLE "public"."notifications" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."post_bookmarks" (
    "created_at" timestamp with time zone DEFAULT "now"(),
    "post_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."post_bookmarks" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."post_reactions" (
    "created_at" timestamp with time zone DEFAULT "now"(),
    "post_id" "uuid" NOT NULL,
    "type" "text" DEFAULT 'like'::"text" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "post_reactions_type_check" CHECK (("type" = ANY (ARRAY['like'::"text", 'dislike'::"text", 'love'::"text", 'laugh'::"text", 'angry'::"text", 'sad'::"text"])))
);


ALTER TABLE "public"."post_reactions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."post_views" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "post_id" "uuid" NOT NULL,
    "user_id" "uuid",
    "viewed_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."post_views" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."posts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "author" "text",
    "author_id" "uuid" NOT NULL,
    "collective_id" "uuid",
    "content" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "dislike_count" integer DEFAULT 0,
    "is_public" boolean DEFAULT false,
    "like_count" integer DEFAULT 0,
    "meta_description" "text",
    "published_at" timestamp with time zone,
    "seo_title" "text",
    "status" "text" DEFAULT 'draft'::"text",
    "subtitle" "text",
    "title" "text" NOT NULL,
    "tsv" "tsvector",
    "view_count" integer DEFAULT 0,
    "slug" "text",
    "thumbnail_url" "text",
    "post_type" "public"."post_type_enum" DEFAULT 'text'::"public"."post_type_enum" NOT NULL,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "check_author_length" CHECK (("char_length"("author") <= 100)),
    CONSTRAINT "check_meta_description_length" CHECK (("char_length"("meta_description") <= 160)),
    CONSTRAINT "check_metadata_size" CHECK (("pg_column_size"("metadata") <= 65536)),
    CONSTRAINT "check_seo_title_length" CHECK (("char_length"("seo_title") <= 60)),
    CONSTRAINT "check_subtitle_length" CHECK (("char_length"("subtitle") <= 300)),
    CONSTRAINT "check_thumbnail_url_length" CHECK ((("thumbnail_url" IS NULL) OR ("char_length"("thumbnail_url") <= 2048))),
    CONSTRAINT "posts_status_check" CHECK (("status" = ANY (ARRAY['draft'::"text", 'active'::"text", 'removed'::"text"])))
);


ALTER TABLE "public"."posts" OWNER TO "postgres";


COMMENT ON TABLE "public"."posts" IS 'Posts table with metadata support - cache refresh trigger';



COMMENT ON COLUMN "public"."posts"."author" IS 'Optional custom author byline, separate from author_id for display flexibility';



COMMENT ON COLUMN "public"."posts"."meta_description" IS 'Meta description for search engines, max 160 characters';



COMMENT ON COLUMN "public"."posts"."seo_title" IS 'SEO-optimized title for search engines, max 60 characters';



COMMENT ON COLUMN "public"."posts"."subtitle" IS 'Optional subtitle for the post, displayed below the main title';



COMMENT ON COLUMN "public"."posts"."thumbnail_url" IS 'URL to post thumbnail image for display in feeds and previews';



COMMENT ON COLUMN "public"."posts"."post_type" IS 'Type of post content: text for regular posts, video for video posts';



COMMENT ON COLUMN "public"."posts"."metadata" IS 'Flexible JSON storage for post-specific data (video details, custom fields, etc.)';



COMMENT ON COLUMN "public"."posts"."updated_at" IS 'Timestamp of last modification to the post';



CREATE TABLE IF NOT EXISTS "public"."recommendations" (
    "created_at" timestamp with time zone DEFAULT "now"(),
    "score" numeric NOT NULL,
    "suggested_collective_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."recommendations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."subscriptions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "cancel_at" timestamp with time zone,
    "cancel_at_period_end" boolean DEFAULT false,
    "canceled_at" timestamp with time zone,
    "created" timestamp with time zone NOT NULL,
    "current_period_end" timestamp with time zone NOT NULL,
    "current_period_start" timestamp with time zone NOT NULL,
    "ended_at" timestamp with time zone,
    "inserted_at" timestamp with time zone DEFAULT "now"(),
    "metadata" "jsonb",
    "quantity" integer,
    "status" "text" NOT NULL,
    "stripe_price_id" "text",
    "target_entity_id" "uuid" NOT NULL,
    "target_entity_type" "text" NOT NULL,
    "trial_end" timestamp with time zone,
    "trial_start" timestamp with time zone,
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "user_id" "uuid" NOT NULL,
    CONSTRAINT "subscriptions_status_check" CHECK (("status" = ANY (ARRAY['trialing'::"text", 'active'::"text", 'canceled'::"text", 'incomplete'::"text", 'incomplete_expired'::"text", 'past_due'::"text", 'unpaid'::"text", 'paused'::"text"]))),
    CONSTRAINT "subscriptions_target_entity_type_check" CHECK (("target_entity_type" = ANY (ARRAY['user'::"text", 'collective'::"text"])))
);


ALTER TABLE "public"."subscriptions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."upload_sessions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "upload_id" "text" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "filename" "text" NOT NULL,
    "content_type" "text" NOT NULL,
    "file_size" bigint NOT NULL,
    "upload_url" "text" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "progress" "jsonb",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "completed_at" timestamp with time zone,
    "expires_at" timestamp with time zone NOT NULL,
    "error_details" "jsonb",
    "resume_info" "jsonb",
    CONSTRAINT "upload_sessions_completed_at_check" CHECK ((("completed_at" IS NULL) OR ("completed_at" >= "created_at"))),
    CONSTRAINT "upload_sessions_expires_at_check" CHECK (("expires_at" > "created_at")),
    CONSTRAINT "upload_sessions_file_size_check" CHECK (("file_size" > 0)),
    CONSTRAINT "upload_sessions_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'uploading'::"text", 'completed'::"text", 'failed'::"text", 'cancelled'::"text", 'paused'::"text"])))
);


ALTER TABLE "public"."upload_sessions" OWNER TO "postgres";


COMMENT ON TABLE "public"."upload_sessions" IS 'Tracks file upload sessions with progress and resume capability';



COMMENT ON COLUMN "public"."upload_sessions"."upload_id" IS 'MUX upload ID for tracking';



COMMENT ON COLUMN "public"."upload_sessions"."progress" IS 'JSON object containing upload progress information';



COMMENT ON COLUMN "public"."upload_sessions"."metadata" IS 'Video metadata and upload configuration';



COMMENT ON COLUMN "public"."upload_sessions"."error_details" IS 'Error information if upload fails';



COMMENT ON COLUMN "public"."upload_sessions"."resume_info" IS 'Information for resuming chunked uploads';



CREATE TABLE IF NOT EXISTS "public"."users" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "avatar_url" "text",
    "bio" "text",
    "cover_image_url" "text",
    "embedding" "text",
    "full_name" "text",
    "is_profile_public" boolean DEFAULT true,
    "pinned_post_id" "uuid",
    "role" "text",
    "show_comments" boolean DEFAULT true,
    "show_followers" boolean DEFAULT true,
    "show_subscriptions" boolean DEFAULT true,
    "social_links" "jsonb",
    "stripe_account_id" "text",
    "stripe_account_type" "text",
    "stripe_customer_id" "text",
    "tags" "text"[],
    "terms_accepted_at" timestamp with time zone,
    "tsv" "tsvector",
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "username" "text"
);


ALTER TABLE "public"."users" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."video_analytics" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "video_asset_id" "uuid",
    "live_stream_id" "uuid",
    "metric_type" "text" NOT NULL,
    "viewer_id" "uuid",
    "session_id" "text",
    "playback_position" numeric DEFAULT 0,
    "playback_duration" numeric,
    "quality" "text",
    "user_agent" "text",
    "ip_address" "inet",
    "country_code" "text",
    "device_type" "text",
    "browser" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    CONSTRAINT "check_asset_or_stream" CHECK (((("video_asset_id" IS NOT NULL) AND ("live_stream_id" IS NULL)) OR (("video_asset_id" IS NULL) AND ("live_stream_id" IS NOT NULL)))),
    CONSTRAINT "video_analytics_metric_type_check" CHECK (("metric_type" = ANY (ARRAY['view'::"text", 'play'::"text", 'pause'::"text", 'seek'::"text", 'buffer'::"text", 'error'::"text", 'complete'::"text", 'quality_change'::"text", 'fullscreen'::"text", 'mute'::"text", 'unmute'::"text"])))
);


ALTER TABLE "public"."video_analytics" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."video_assets" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "mux_asset_id" "text",
    "mux_upload_id" "text",
    "status" "text" DEFAULT 'preparing'::"text" NOT NULL,
    "encoding_tier" "text" DEFAULT 'smart'::"text",
    "title" "text",
    "description" "text",
    "duration" numeric,
    "aspect_ratio" "text",
    "resolution_tier" "text",
    "max_resolution_tier" "text",
    "file_size" bigint,
    "file_type" "text",
    "original_filename" "text",
    "playback_policy" "text" DEFAULT 'public'::"text",
    "mp4_support" "text" DEFAULT 'none'::"text",
    "normalize_audio" boolean DEFAULT true,
    "created_by" "uuid" NOT NULL,
    "collective_id" "uuid",
    "is_public" boolean DEFAULT false,
    "post_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "processed_at" timestamp with time zone,
    "mux_metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "error_details" "jsonb",
    "tsv" "tsvector",
    "mux_playback_id" "text",
    CONSTRAINT "video_assets_encoding_tier_check" CHECK (("encoding_tier" = ANY (ARRAY['baseline'::"text", 'smart'::"text", 'premium'::"text"]))),
    CONSTRAINT "video_assets_mp4_support_check" CHECK (("mp4_support" = ANY (ARRAY['none'::"text", 'capped-1080p'::"text", 'audio-only'::"text"]))),
    CONSTRAINT "video_assets_playback_policy_check" CHECK (("playback_policy" = ANY (ARRAY['public'::"text", 'signed'::"text"]))),
    CONSTRAINT "video_assets_status_check" CHECK (("status" = ANY (ARRAY['preparing'::"text", 'processing'::"text", 'ready'::"text", 'errored'::"text", 'deleted'::"text"])))
);


ALTER TABLE "public"."video_assets" OWNER TO "postgres";


COMMENT ON COLUMN "public"."video_assets"."mux_asset_id" IS 'MUX asset ID - NULL initially, populated by webhook after upload';



COMMENT ON COLUMN "public"."video_assets"."title" IS 'Video title - optional';



COMMENT ON COLUMN "public"."video_assets"."created_by" IS 'User ID who created/owns this video';



COMMENT ON COLUMN "public"."video_assets"."mux_playback_id" IS 'MUX playback ID for streaming - populated when asset is ready';



ALTER TABLE ONLY "public"."collective_invites"
    ADD CONSTRAINT "collective_invites_invite_code_key" UNIQUE ("invite_code");



ALTER TABLE ONLY "public"."collective_invites"
    ADD CONSTRAINT "collective_invites_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."collective_members"
    ADD CONSTRAINT "collective_members_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."collectives"
    ADD CONSTRAINT "collectives_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."collectives"
    ADD CONSTRAINT "collectives_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."comment_reactions"
    ADD CONSTRAINT "comment_reactions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."comments"
    ADD CONSTRAINT "comments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."conversation_participants"
    ADD CONSTRAINT "conversation_participants_conversation_id_user_id_key" UNIQUE ("conversation_id", "user_id");



ALTER TABLE ONLY "public"."conversation_participants"
    ADD CONSTRAINT "conversation_participants_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."conversations"
    ADD CONSTRAINT "conversations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."customers"
    ADD CONSTRAINT "customers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."featured_posts"
    ADD CONSTRAINT "featured_posts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."follows"
    ADD CONSTRAINT "follows_pkey" PRIMARY KEY ("follower_id", "following_id", "following_type");



ALTER TABLE ONLY "public"."interactions"
    ADD CONSTRAINT "interactions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."live_streams"
    ADD CONSTRAINT "live_streams_mux_stream_id_key" UNIQUE ("mux_stream_id");



ALTER TABLE ONLY "public"."live_streams"
    ADD CONSTRAINT "live_streams_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."message_reactions"
    ADD CONSTRAINT "message_reactions_message_id_user_id_emoji_key" UNIQUE ("message_id", "user_id", "emoji");



ALTER TABLE ONLY "public"."message_reactions"
    ADD CONSTRAINT "message_reactions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."message_read_receipts"
    ADD CONSTRAINT "message_read_receipts_message_id_user_id_key" UNIQUE ("message_id", "user_id");



ALTER TABLE ONLY "public"."message_read_receipts"
    ADD CONSTRAINT "message_read_receipts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."mux_webhooks"
    ADD CONSTRAINT "mux_webhooks_mux_webhook_id_key" UNIQUE ("mux_webhook_id");



ALTER TABLE ONLY "public"."mux_webhooks"
    ADD CONSTRAINT "mux_webhooks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."notification_preferences"
    ADD CONSTRAINT "notification_preferences_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."notification_preferences"
    ADD CONSTRAINT "notification_preferences_user_id_notification_type_key" UNIQUE ("user_id", "notification_type");



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."post_bookmarks"
    ADD CONSTRAINT "post_bookmarks_pkey" PRIMARY KEY ("post_id", "user_id");



ALTER TABLE ONLY "public"."post_reactions"
    ADD CONSTRAINT "post_reactions_pkey" PRIMARY KEY ("post_id", "user_id", "type");



ALTER TABLE ONLY "public"."post_views"
    ADD CONSTRAINT "post_views_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."posts"
    ADD CONSTRAINT "posts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."posts"
    ADD CONSTRAINT "posts_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."recommendations"
    ADD CONSTRAINT "recommendations_user_collective_unique" UNIQUE ("user_id", "suggested_collective_id");



ALTER TABLE ONLY "public"."subscriptions"
    ADD CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."follows"
    ADD CONSTRAINT "unique_follow_relationship" UNIQUE ("follower_id", "following_id", "following_type");



COMMENT ON CONSTRAINT "unique_follow_relationship" ON "public"."follows" IS 'Prevents duplicate follow relationships';



ALTER TABLE ONLY "public"."upload_sessions"
    ADD CONSTRAINT "upload_sessions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."upload_sessions"
    ADD CONSTRAINT "upload_sessions_upload_id_key" UNIQUE ("upload_id");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_username_key" UNIQUE ("username");



ALTER TABLE ONLY "public"."video_analytics"
    ADD CONSTRAINT "video_analytics_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."video_assets"
    ADD CONSTRAINT "video_assets_mux_asset_id_key" UNIQUE ("mux_asset_id");



ALTER TABLE ONLY "public"."video_assets"
    ADD CONSTRAINT "video_assets_pkey" PRIMARY KEY ("id");



CREATE INDEX "idx_collective_invites_collective_id" ON "public"."collective_invites" USING "btree" ("collective_id");



CREATE INDEX "idx_collective_invites_email" ON "public"."collective_invites" USING "btree" ("email");



CREATE INDEX "idx_collective_members_collective_user" ON "public"."collective_members" USING "btree" ("collective_id", "member_id");



CREATE INDEX "idx_collective_members_user_role" ON "public"."collective_members" USING "btree" ("member_id", "role");



CREATE INDEX "idx_collectives_owner_id" ON "public"."collectives" USING "btree" ("owner_id");



CREATE INDEX "idx_collectives_slug" ON "public"."collectives" USING "btree" ("slug");



CREATE INDEX "idx_comment_reactions_comment" ON "public"."comment_reactions" USING "btree" ("comment_id", "type");



CREATE INDEX "idx_comment_reactions_user" ON "public"."comment_reactions" USING "btree" ("user_id", "created_at" DESC);



CREATE INDEX "idx_comments_post_id" ON "public"."comments" USING "btree" ("post_id");



CREATE INDEX "idx_comments_user_id" ON "public"."comments" USING "btree" ("user_id");



CREATE INDEX "idx_conversation_participants_conversation_id" ON "public"."conversation_participants" USING "btree" ("conversation_id");



CREATE INDEX "idx_conversation_participants_last_read_at" ON "public"."conversation_participants" USING "btree" ("last_read_at");



CREATE INDEX "idx_conversation_participants_user_id" ON "public"."conversation_participants" USING "btree" ("user_id");



CREATE INDEX "idx_conversations_created_by" ON "public"."conversations" USING "btree" ("created_by");



CREATE INDEX "idx_conversations_last_message_at" ON "public"."conversations" USING "btree" ("last_message_at" DESC);



CREATE INDEX "idx_conversations_updated_at" ON "public"."conversations" USING "btree" ("updated_at" DESC);



CREATE INDEX "idx_featured_posts_owner" ON "public"."featured_posts" USING "btree" ("owner_id", "owner_type", "display_order");



CREATE INDEX "idx_follows_compound" ON "public"."follows" USING "btree" ("follower_id", "following_type", "created_at" DESC);



CREATE INDEX "idx_follows_follower_id" ON "public"."follows" USING "btree" ("follower_id");



CREATE INDEX "idx_follows_following_compound" ON "public"."follows" USING "btree" ("following_id", "following_type", "created_at" DESC);



CREATE INDEX "idx_follows_following_id_type" ON "public"."follows" USING "btree" ("following_id", "following_type");



CREATE INDEX "idx_interactions_entity" ON "public"."interactions" USING "btree" ("entity_id", "entity_type");



CREATE INDEX "idx_interactions_user_type" ON "public"."interactions" USING "btree" ("user_id", "interaction_type", "created_at" DESC);



CREATE INDEX "idx_live_streams_collective_id" ON "public"."live_streams" USING "btree" ("collective_id");



CREATE INDEX "idx_live_streams_created_at" ON "public"."live_streams" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_live_streams_mux_stream_id" ON "public"."live_streams" USING "btree" ("mux_stream_id");



CREATE INDEX "idx_live_streams_owner_id" ON "public"."live_streams" USING "btree" ("owner_id");



CREATE INDEX "idx_live_streams_status" ON "public"."live_streams" USING "btree" ("status");



CREATE INDEX "idx_live_streams_tsv" ON "public"."live_streams" USING "gin" ("tsv");



CREATE INDEX "idx_message_reactions_message_id" ON "public"."message_reactions" USING "btree" ("message_id");



CREATE INDEX "idx_message_reactions_user_id" ON "public"."message_reactions" USING "btree" ("user_id");



CREATE INDEX "idx_message_read_receipts_message_id" ON "public"."message_read_receipts" USING "btree" ("message_id");



CREATE INDEX "idx_message_read_receipts_user_id" ON "public"."message_read_receipts" USING "btree" ("user_id");



CREATE INDEX "idx_messages_conversation_id" ON "public"."messages" USING "btree" ("conversation_id");



CREATE INDEX "idx_messages_created_at" ON "public"."messages" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_messages_reply_to_id" ON "public"."messages" USING "btree" ("reply_to_id");



CREATE INDEX "idx_messages_sender_id" ON "public"."messages" USING "btree" ("sender_id");



CREATE INDEX "idx_mux_webhooks_created_at" ON "public"."mux_webhooks" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_mux_webhooks_mux_webhook_id" ON "public"."mux_webhooks" USING "btree" ("mux_webhook_id");



CREATE INDEX "idx_mux_webhooks_status" ON "public"."mux_webhooks" USING "btree" ("status");



CREATE INDEX "idx_mux_webhooks_webhook_type" ON "public"."mux_webhooks" USING "btree" ("webhook_type");



CREATE INDEX "idx_notification_preferences_type" ON "public"."notification_preferences" USING "btree" ("notification_type");



CREATE INDEX "idx_notification_preferences_user_id" ON "public"."notification_preferences" USING "btree" ("user_id");



CREATE INDEX "idx_notifications_actor_id" ON "public"."notifications" USING "btree" ("actor_id");



CREATE INDEX "idx_notifications_created_at" ON "public"."notifications" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_notifications_entity" ON "public"."notifications" USING "btree" ("entity_type", "entity_id");



CREATE INDEX "idx_notifications_read_at" ON "public"."notifications" USING "btree" ("read_at");



CREATE INDEX "idx_notifications_recipient_id" ON "public"."notifications" USING "btree" ("recipient_id");



CREATE INDEX "idx_notifications_type" ON "public"."notifications" USING "btree" ("type");



CREATE INDEX "idx_post_bookmarks_user" ON "public"."post_bookmarks" USING "btree" ("user_id", "created_at" DESC);



CREATE INDEX "idx_post_reactions_compound" ON "public"."post_reactions" USING "btree" ("post_id", "type", "created_at" DESC);



CREATE INDEX "idx_post_reactions_user" ON "public"."post_reactions" USING "btree" ("user_id", "created_at" DESC);



CREATE INDEX "idx_post_views_post" ON "public"."post_views" USING "btree" ("post_id", "viewed_at" DESC);



CREATE INDEX "idx_post_views_user" ON "public"."post_views" USING "btree" ("user_id", "viewed_at" DESC);



CREATE INDEX "idx_posts_author_id" ON "public"."posts" USING "btree" ("author_id");



CREATE INDEX "idx_posts_collective_id" ON "public"."posts" USING "btree" ("collective_id");



CREATE INDEX "idx_posts_created_at" ON "public"."posts" USING "btree" ("created_at");



CREATE INDEX "idx_posts_metadata_gin" ON "public"."posts" USING "gin" ("metadata");



CREATE INDEX "idx_posts_post_type" ON "public"."posts" USING "btree" ("post_type");



CREATE INDEX "idx_posts_published_at" ON "public"."posts" USING "btree" ("published_at");



CREATE UNIQUE INDEX "idx_posts_slug" ON "public"."posts" USING "btree" ("slug");



CREATE INDEX "idx_posts_thumbnail_url" ON "public"."posts" USING "btree" ("thumbnail_url") WHERE ("thumbnail_url" IS NOT NULL);



CREATE INDEX "idx_posts_updated_at" ON "public"."posts" USING "btree" ("updated_at");



CREATE INDEX "idx_recommendations_created_at" ON "public"."recommendations" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_recommendations_score" ON "public"."recommendations" USING "btree" ("score" DESC);



CREATE INDEX "idx_recommendations_user_id" ON "public"."recommendations" USING "btree" ("user_id");



CREATE INDEX "idx_subscriptions_target" ON "public"."subscriptions" USING "btree" ("target_entity_id", "target_entity_type");



CREATE INDEX "idx_subscriptions_user_status" ON "public"."subscriptions" USING "btree" ("user_id", "status");



CREATE INDEX "idx_upload_sessions_created_at" ON "public"."upload_sessions" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_upload_sessions_expires_at" ON "public"."upload_sessions" USING "btree" ("expires_at");



CREATE INDEX "idx_upload_sessions_status" ON "public"."upload_sessions" USING "btree" ("status");



CREATE INDEX "idx_upload_sessions_upload_id" ON "public"."upload_sessions" USING "btree" ("upload_id");



CREATE INDEX "idx_upload_sessions_user_id" ON "public"."upload_sessions" USING "btree" ("user_id");



CREATE INDEX "idx_users_updated_at" ON "public"."users" USING "btree" ("updated_at");



CREATE INDEX "idx_users_username" ON "public"."users" USING "btree" ("username");



CREATE INDEX "idx_video_analytics_created_at" ON "public"."video_analytics" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_video_analytics_live_stream_id" ON "public"."video_analytics" USING "btree" ("live_stream_id");



CREATE INDEX "idx_video_analytics_metric_type" ON "public"."video_analytics" USING "btree" ("metric_type");



CREATE INDEX "idx_video_analytics_session_id" ON "public"."video_analytics" USING "btree" ("session_id");



CREATE INDEX "idx_video_analytics_video_asset_id" ON "public"."video_analytics" USING "btree" ("video_asset_id");



CREATE INDEX "idx_video_analytics_viewer_id" ON "public"."video_analytics" USING "btree" ("viewer_id");



CREATE INDEX "idx_video_assets_collective_id" ON "public"."video_assets" USING "btree" ("collective_id");



CREATE INDEX "idx_video_assets_created_at" ON "public"."video_assets" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_video_assets_created_by" ON "public"."video_assets" USING "btree" ("created_by");



CREATE INDEX "idx_video_assets_mux_asset_id" ON "public"."video_assets" USING "btree" ("mux_asset_id");



CREATE INDEX "idx_video_assets_status" ON "public"."video_assets" USING "btree" ("status");



CREATE INDEX "idx_video_assets_tsv" ON "public"."video_assets" USING "gin" ("tsv");



CREATE OR REPLACE TRIGGER "trigger_bookmark_notification" AFTER INSERT ON "public"."post_bookmarks" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_bookmark_notification"();



CREATE OR REPLACE TRIGGER "trigger_comment_notification" AFTER INSERT ON "public"."comments" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_comment_notification"();



CREATE OR REPLACE TRIGGER "trigger_follow_notification" AFTER INSERT ON "public"."follows" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_follow_notification"();



CREATE OR REPLACE TRIGGER "trigger_post_like_notification" AFTER INSERT ON "public"."post_reactions" FOR EACH ROW WHEN (("new"."type" = 'like'::"text")) EXECUTE FUNCTION "public"."trigger_post_like_notification"();



CREATE OR REPLACE TRIGGER "trigger_update_conversation_last_message" AFTER INSERT ON "public"."messages" FOR EACH ROW EXECUTE FUNCTION "public"."update_conversation_last_message"();



CREATE OR REPLACE TRIGGER "trigger_upload_sessions_updated_at" BEFORE UPDATE ON "public"."upload_sessions" FOR EACH ROW EXECUTE FUNCTION "public"."update_upload_sessions_updated_at"();



CREATE OR REPLACE TRIGGER "update_collective_members_updated_at" BEFORE UPDATE ON "public"."collective_members" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_comment_reactions_updated_at" BEFORE UPDATE ON "public"."comment_reactions" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_featured_posts_updated_at" BEFORE UPDATE ON "public"."featured_posts" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_follows_updated_at" BEFORE UPDATE ON "public"."follows" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_interactions_updated_at" BEFORE UPDATE ON "public"."interactions" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_live_streams_tsv_trigger" BEFORE INSERT OR UPDATE ON "public"."live_streams" FOR EACH ROW EXECUTE FUNCTION "public"."update_live_streams_tsv"();



CREATE OR REPLACE TRIGGER "update_live_streams_updated_at" BEFORE UPDATE ON "public"."live_streams" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_mux_webhooks_updated_at" BEFORE UPDATE ON "public"."mux_webhooks" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_post_bookmarks_updated_at" BEFORE UPDATE ON "public"."post_bookmarks" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_post_reactions_updated_at" BEFORE UPDATE ON "public"."post_reactions" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_post_views_updated_at" BEFORE UPDATE ON "public"."post_views" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_posts_updated_at" BEFORE UPDATE ON "public"."posts" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_recommendations_updated_at" BEFORE UPDATE ON "public"."recommendations" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_subscriptions_updated_at" BEFORE UPDATE ON "public"."subscriptions" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_video_assets_tsv_trigger" BEFORE INSERT OR UPDATE ON "public"."video_assets" FOR EACH ROW EXECUTE FUNCTION "public"."update_video_assets_tsv"();



CREATE OR REPLACE TRIGGER "update_video_assets_updated_at" BEFORE UPDATE ON "public"."video_assets" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



ALTER TABLE ONLY "public"."collective_invites"
    ADD CONSTRAINT "collective_invites_collective_id_fkey" FOREIGN KEY ("collective_id") REFERENCES "public"."collectives"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."collective_invites"
    ADD CONSTRAINT "collective_invites_invited_by_user_id_fkey" FOREIGN KEY ("invited_by_user_id") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."collective_members"
    ADD CONSTRAINT "collective_members_collective_id_fkey" FOREIGN KEY ("collective_id") REFERENCES "public"."collectives"("id");



ALTER TABLE ONLY "public"."collective_members"
    ADD CONSTRAINT "collective_members_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."collectives"
    ADD CONSTRAINT "collectives_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."collectives"
    ADD CONSTRAINT "collectives_pinned_post_id_fkey" FOREIGN KEY ("pinned_post_id") REFERENCES "public"."posts"("id");



ALTER TABLE ONLY "public"."comment_reactions"
    ADD CONSTRAINT "comment_reactions_comment_id_fkey" FOREIGN KEY ("comment_id") REFERENCES "public"."comments"("id");



ALTER TABLE ONLY "public"."comment_reactions"
    ADD CONSTRAINT "comment_reactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."comments"
    ADD CONSTRAINT "comments_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "public"."comments"("id");



ALTER TABLE ONLY "public"."comments"
    ADD CONSTRAINT "comments_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id");



ALTER TABLE ONLY "public"."comments"
    ADD CONSTRAINT "comments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."conversation_participants"
    ADD CONSTRAINT "conversation_participants_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."conversation_participants"
    ADD CONSTRAINT "conversation_participants_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."conversations"
    ADD CONSTRAINT "conversations_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."customers"
    ADD CONSTRAINT "customers_id_fkey" FOREIGN KEY ("id") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."featured_posts"
    ADD CONSTRAINT "featured_posts_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id");



ALTER TABLE ONLY "public"."follows"
    ADD CONSTRAINT "follows_follower_id_fkey" FOREIGN KEY ("follower_id") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."interactions"
    ADD CONSTRAINT "interactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."live_streams"
    ADD CONSTRAINT "live_streams_collective_id_fkey" FOREIGN KEY ("collective_id") REFERENCES "public"."collectives"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."live_streams"
    ADD CONSTRAINT "live_streams_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."live_streams"
    ADD CONSTRAINT "live_streams_recorded_asset_id_fkey" FOREIGN KEY ("recorded_asset_id") REFERENCES "public"."video_assets"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."message_reactions"
    ADD CONSTRAINT "message_reactions_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "public"."messages"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."message_reactions"
    ADD CONSTRAINT "message_reactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."message_read_receipts"
    ADD CONSTRAINT "message_read_receipts_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "public"."messages"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."message_read_receipts"
    ADD CONSTRAINT "message_read_receipts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_reply_to_id_fkey" FOREIGN KEY ("reply_to_id") REFERENCES "public"."messages"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."mux_webhooks"
    ADD CONSTRAINT "mux_webhooks_live_stream_id_fkey" FOREIGN KEY ("live_stream_id") REFERENCES "public"."live_streams"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."mux_webhooks"
    ADD CONSTRAINT "mux_webhooks_video_asset_id_fkey" FOREIGN KEY ("video_asset_id") REFERENCES "public"."video_assets"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."notification_preferences"
    ADD CONSTRAINT "notification_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_recipient_id_fkey" FOREIGN KEY ("recipient_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."post_bookmarks"
    ADD CONSTRAINT "post_bookmarks_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id");



ALTER TABLE ONLY "public"."post_bookmarks"
    ADD CONSTRAINT "post_bookmarks_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."post_reactions"
    ADD CONSTRAINT "post_reactions_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id");



ALTER TABLE ONLY "public"."post_reactions"
    ADD CONSTRAINT "post_reactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."post_views"
    ADD CONSTRAINT "post_views_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id");



ALTER TABLE ONLY "public"."post_views"
    ADD CONSTRAINT "post_views_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."posts"
    ADD CONSTRAINT "posts_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."posts"
    ADD CONSTRAINT "posts_collective_id_fkey" FOREIGN KEY ("collective_id") REFERENCES "public"."collectives"("id");



ALTER TABLE ONLY "public"."recommendations"
    ADD CONSTRAINT "recommendations_suggested_collective_id_fkey" FOREIGN KEY ("suggested_collective_id") REFERENCES "public"."collectives"("id");



ALTER TABLE ONLY "public"."recommendations"
    ADD CONSTRAINT "recommendations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."subscriptions"
    ADD CONSTRAINT "subscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_pinned_post_id_fkey" FOREIGN KEY ("pinned_post_id") REFERENCES "public"."posts"("id");



ALTER TABLE ONLY "public"."video_analytics"
    ADD CONSTRAINT "video_analytics_live_stream_id_fkey" FOREIGN KEY ("live_stream_id") REFERENCES "public"."live_streams"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."video_analytics"
    ADD CONSTRAINT "video_analytics_video_asset_id_fkey" FOREIGN KEY ("video_asset_id") REFERENCES "public"."video_assets"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."video_analytics"
    ADD CONSTRAINT "video_analytics_viewer_id_fkey" FOREIGN KEY ("viewer_id") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."video_assets"
    ADD CONSTRAINT "video_assets_collective_id_fkey" FOREIGN KEY ("collective_id") REFERENCES "public"."collectives"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."video_assets"
    ADD CONSTRAINT "video_assets_owner_id_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."video_assets"
    ADD CONSTRAINT "video_assets_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE SET NULL;



CREATE POLICY "Anyone can insert video analytics" ON "public"."video_analytics" FOR INSERT WITH CHECK (true);



CREATE POLICY "Collective admins can manage members" ON "public"."collective_members" USING ((EXISTS ( SELECT 1
   FROM "public"."collective_members" "cm"
  WHERE (("cm"."collective_id" = "collective_members"."collective_id") AND ("cm"."member_id" = "auth"."uid"()) AND ("cm"."role" = ANY (ARRAY['admin'::"text", 'owner'::"text"]))))));



CREATE POLICY "Collective members can view collective live streams" ON "public"."live_streams" FOR SELECT USING ((("collective_id" IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM "public"."collective_members" "cm"
  WHERE (("cm"."collective_id" = "live_streams"."collective_id") AND ("cm"."member_id" = "auth"."uid"()) AND ("cm"."role" = ANY (ARRAY['admin'::"text", 'editor'::"text", 'author'::"text", 'owner'::"text"])))))));



CREATE POLICY "Collective members can view collective video assets" ON "public"."video_assets" FOR SELECT USING ((("collective_id" IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM "public"."collective_members" "cm"
  WHERE (("cm"."collective_id" = "video_assets"."collective_id") AND ("cm"."member_id" = "auth"."uid"()) AND ("cm"."role" = ANY (ARRAY['admin'::"text", 'editor'::"text", 'author'::"text", 'owner'::"text"])))))));



CREATE POLICY "Collective members can view membership" ON "public"."collective_members" FOR SELECT USING ((("auth"."uid"() = "member_id") OR (EXISTS ( SELECT 1
   FROM "public"."collective_members" "cm2"
  WHERE (("cm2"."collective_id" = "collective_members"."collective_id") AND ("cm2"."member_id" = "auth"."uid"()))))));



CREATE POLICY "Collective owners can update their collectives" ON "public"."collectives" FOR UPDATE USING (("owner_id" = "auth"."uid"()));



CREATE POLICY "Collectives are viewable by everyone" ON "public"."collectives" FOR SELECT USING (true);



CREATE POLICY "Comments are viewable on public posts" ON "public"."comments" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."posts" "p"
  WHERE (("p"."id" = "comments"."post_id") AND (("p"."is_public" = true) OR ("p"."author_id" = "auth"."uid"()))))));



CREATE POLICY "Conversation admins can manage participants" ON "public"."conversation_participants" USING ((EXISTS ( SELECT 1
   FROM "public"."conversation_participants" "cp"
  WHERE (("cp"."conversation_id" = "conversation_participants"."conversation_id") AND ("cp"."user_id" = "auth"."uid"()) AND (("cp"."role")::"text" = 'admin'::"text")))));



CREATE POLICY "Conversation admins can update conversations" ON "public"."conversations" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."conversation_participants" "cp"
  WHERE (("cp"."conversation_id" = "conversations"."id") AND ("cp"."user_id" = "auth"."uid"()) AND (("cp"."role")::"text" = 'admin'::"text")))));



CREATE POLICY "Entity owners can manage their featured posts" ON "public"."featured_posts" USING (((("owner_type" = 'user'::"text") AND ("auth"."uid"() = "owner_id")) OR (("owner_type" = 'collective'::"text") AND (EXISTS ( SELECT 1
   FROM "public"."collective_members" "cm"
  WHERE (("cm"."collective_id" = "featured_posts"."owner_id") AND ("cm"."member_id" = "auth"."uid"()) AND ("cm"."role" = ANY (ARRAY['admin'::"text", 'owner'::"text"]))))))));



CREATE POLICY "Post authors can view their post analytics" ON "public"."post_views" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."posts" "p"
  WHERE (("p"."id" = "post_views"."post_id") AND ("p"."author_id" = "auth"."uid"())))));



CREATE POLICY "Public posts are viewable by everyone" ON "public"."posts" FOR SELECT USING ((("is_public" = true) OR ("author_id" = "auth"."uid"())));



CREATE POLICY "Service role can access all upload sessions" ON "public"."upload_sessions" USING (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "Service role can manage customer data" ON "public"."customers" USING (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "Service role can manage interactions" ON "public"."interactions" USING (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "Service role can manage post views" ON "public"."post_views" USING (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "Service role can manage recommendations" ON "public"."recommendations" USING (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "Service role can manage subscriptions" ON "public"."subscriptions" USING (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "Service role can manage webhooks" ON "public"."mux_webhooks" USING (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "Users can access their own upload sessions" ON "public"."upload_sessions" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can bookmark public posts" ON "public"."post_bookmarks" FOR INSERT WITH CHECK ((("auth"."uid"() = "user_id") AND (EXISTS ( SELECT 1
   FROM "public"."posts" "p"
  WHERE (("p"."id" = "post_bookmarks"."post_id") AND ("p"."is_public" = true))))));



CREATE POLICY "Users can create collectives" ON "public"."collectives" FOR INSERT WITH CHECK (("owner_id" = "auth"."uid"()));



CREATE POLICY "Users can create conversations" ON "public"."conversations" FOR INSERT WITH CHECK (("auth"."uid"() = "created_by"));



CREATE POLICY "Users can create their own interactions" ON "public"."interactions" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete their own live streams" ON "public"."live_streams" FOR DELETE USING (("auth"."uid"() = "owner_id"));



CREATE POLICY "Users can delete their own notification preferences" ON "public"."notification_preferences" FOR DELETE USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can delete their own notifications" ON "public"."notifications" FOR DELETE USING (("recipient_id" = "auth"."uid"()));



CREATE POLICY "Users can delete their own video assets" ON "public"."video_assets" FOR DELETE USING (("auth"."uid"() = "created_by"));



CREATE POLICY "Users can edit their own messages" ON "public"."messages" FOR UPDATE USING (("auth"."uid"() = "sender_id"));



CREATE POLICY "Users can insert comments on public posts" ON "public"."comments" FOR INSERT WITH CHECK ((("user_id" = "auth"."uid"()) AND (EXISTS ( SELECT 1
   FROM "public"."posts" "p"
  WHERE (("p"."id" = "comments"."post_id") AND ("p"."is_public" = true))))));



CREATE POLICY "Users can insert their own live streams" ON "public"."live_streams" FOR INSERT WITH CHECK (("auth"."uid"() = "owner_id"));



CREATE POLICY "Users can insert their own notification preferences" ON "public"."notification_preferences" FOR INSERT WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can insert their own posts" ON "public"."posts" FOR INSERT WITH CHECK (("author_id" = "auth"."uid"()));



CREATE POLICY "Users can insert their own video assets" ON "public"."video_assets" FOR INSERT WITH CHECK (("auth"."uid"() = "created_by"));



CREATE POLICY "Users can manage their own bookmarks" ON "public"."post_bookmarks" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can manage their own comment reactions" ON "public"."comment_reactions" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can manage their own follows" ON "public"."follows" USING (("auth"."uid"() = "follower_id"));



CREATE POLICY "Users can manage their own reactions" ON "public"."message_reactions" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can manage their own reactions" ON "public"."post_reactions" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can manage their own read receipts" ON "public"."message_read_receipts" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can send messages to their conversations" ON "public"."messages" FOR INSERT WITH CHECK ((("auth"."uid"() = "sender_id") AND (EXISTS ( SELECT 1
   FROM "public"."conversation_participants" "cp"
  WHERE (("cp"."conversation_id" = "messages"."conversation_id") AND ("cp"."user_id" = "auth"."uid"()))))));



CREATE POLICY "Users can update their own live streams" ON "public"."live_streams" FOR UPDATE USING (("auth"."uid"() = "owner_id"));



CREATE POLICY "Users can update their own notification preferences" ON "public"."notification_preferences" FOR UPDATE USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can update their own notifications" ON "public"."notifications" FOR UPDATE USING (("recipient_id" = "auth"."uid"()));



CREATE POLICY "Users can update their own posts" ON "public"."posts" FOR UPDATE USING (("author_id" = "auth"."uid"()));



CREATE POLICY "Users can update their own profile" ON "public"."users" FOR UPDATE USING (("auth"."uid"() = "id"));



CREATE POLICY "Users can update their own video assets" ON "public"."video_assets" FOR UPDATE USING (("auth"."uid"() = "created_by"));



CREATE POLICY "Users can view analytics for their video assets" ON "public"."video_analytics" FOR SELECT USING (((("video_asset_id" IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM "public"."video_assets" "va"
  WHERE (("va"."id" = "video_analytics"."video_asset_id") AND ("va"."created_by" = "auth"."uid"()))))) OR (("live_stream_id" IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM "public"."live_streams" "ls"
  WHERE (("ls"."id" = "video_analytics"."live_stream_id") AND ("ls"."owner_id" = "auth"."uid"())))))));



CREATE POLICY "Users can view comment reactions on public posts" ON "public"."comment_reactions" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM ("public"."comments" "c"
     JOIN "public"."posts" "p" ON (("p"."id" = "c"."post_id")))
  WHERE (("c"."id" = "comment_reactions"."comment_id") AND ("p"."is_public" = true)))));



CREATE POLICY "Users can view conversations they participate in" ON "public"."conversations" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."conversation_participants" "cp"
  WHERE (("cp"."conversation_id" = "conversations"."id") AND ("cp"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can view featured posts for public entities" ON "public"."featured_posts" FOR SELECT USING (((("owner_type" = 'user'::"text") AND (EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."id" = "featured_posts"."owner_id") AND ("u"."is_profile_public" = true))))) OR (("owner_type" = 'collective'::"text") AND (EXISTS ( SELECT 1
   FROM "public"."collectives" "c"
  WHERE ("c"."id" = "c"."owner_id"))))));



CREATE POLICY "Users can view messages in their conversations" ON "public"."messages" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."conversation_participants" "cp"
  WHERE (("cp"."conversation_id" = "messages"."conversation_id") AND ("cp"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can view participants in their conversations" ON "public"."conversation_participants" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."conversation_participants" "cp"
  WHERE (("cp"."conversation_id" = "conversation_participants"."conversation_id") AND ("cp"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can view public live streams" ON "public"."live_streams" FOR SELECT USING (("is_public" = true));



CREATE POLICY "Users can view public profiles" ON "public"."users" FOR SELECT USING ((("is_profile_public" = true) OR ("auth"."uid"() = "id")));



CREATE POLICY "Users can view public video assets" ON "public"."video_assets" FOR SELECT USING (("is_public" = true));



CREATE POLICY "Users can view reactions in their conversations" ON "public"."message_reactions" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM ("public"."messages" "m"
     JOIN "public"."conversation_participants" "cp" ON (("cp"."conversation_id" = "m"."conversation_id")))
  WHERE (("m"."id" = "message_reactions"."message_id") AND ("cp"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can view reactions on public posts" ON "public"."post_reactions" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."posts" "p"
  WHERE (("p"."id" = "post_reactions"."post_id") AND ("p"."is_public" = true)))));



CREATE POLICY "Users can view read receipts in their conversations" ON "public"."message_read_receipts" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM ("public"."messages" "m"
     JOIN "public"."conversation_participants" "cp" ON (("cp"."conversation_id" = "m"."conversation_id")))
  WHERE (("m"."id" = "message_read_receipts"."message_id") AND ("cp"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can view their own customer data" ON "public"."customers" FOR SELECT USING (("auth"."uid"() = "id"));



CREATE POLICY "Users can view their own follow relationships" ON "public"."follows" FOR SELECT USING ((("auth"."uid"() = "follower_id") OR ("auth"."uid"() = "following_id")));



CREATE POLICY "Users can view their own interactions" ON "public"."interactions" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own live streams" ON "public"."live_streams" FOR SELECT USING (("auth"."uid"() = "owner_id"));



CREATE POLICY "Users can view their own notification preferences" ON "public"."notification_preferences" FOR SELECT USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can view their own notifications" ON "public"."notifications" FOR SELECT USING (("recipient_id" = "auth"."uid"()));



CREATE POLICY "Users can view their own post views" ON "public"."post_views" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own recommendations" ON "public"."recommendations" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own subscriptions" ON "public"."subscriptions" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own video assets" ON "public"."video_assets" FOR SELECT USING (("auth"."uid"() = "created_by"));



ALTER TABLE "public"."collective_members" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."collectives" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."comment_reactions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."comments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."conversation_participants" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."conversations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."customers" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."featured_posts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."follows" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."interactions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."live_streams" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."message_reactions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."message_read_receipts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."messages" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."mux_webhooks" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."notification_preferences" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."notifications" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."post_bookmarks" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."post_reactions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."post_views" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."posts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."recommendations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."subscriptions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."upload_sessions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."users" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."video_analytics" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."video_assets" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";





GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";

















































































































































































GRANT ALL ON FUNCTION "public"."cleanup_old_notifications"() TO "anon";
GRANT ALL ON FUNCTION "public"."cleanup_old_notifications"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."cleanup_old_notifications"() TO "service_role";



GRANT ALL ON FUNCTION "public"."create_default_notification_preferences"("p_user_id" "uuid", "p_notification_type" "public"."notification_type") TO "anon";
GRANT ALL ON FUNCTION "public"."create_default_notification_preferences"("p_user_id" "uuid", "p_notification_type" "public"."notification_type") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_default_notification_preferences"("p_user_id" "uuid", "p_notification_type" "public"."notification_type") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_notification"("p_recipient_id" "uuid", "p_actor_id" "uuid", "p_type" "public"."notification_type", "p_title" "text", "p_message" "text", "p_entity_type" "text", "p_entity_id" "uuid", "p_metadata" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."create_notification"("p_recipient_id" "uuid", "p_actor_id" "uuid", "p_type" "public"."notification_type", "p_title" "text", "p_message" "text", "p_entity_type" "text", "p_entity_id" "uuid", "p_metadata" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_notification"("p_recipient_id" "uuid", "p_actor_id" "uuid", "p_type" "public"."notification_type", "p_title" "text", "p_message" "text", "p_entity_type" "text", "p_entity_id" "uuid", "p_metadata" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."extract_name_from_email"("email" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."extract_name_from_email"("email" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."extract_name_from_email"("email" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_unread_message_count"("p_user_id" "uuid", "p_conversation_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_unread_message_count"("p_user_id" "uuid", "p_conversation_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_unread_message_count"("p_user_id" "uuid", "p_conversation_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_unread_notification_count"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_unread_notification_count"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_unread_notification_count"("p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_email"("user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_email"("user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_email"("user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."mark_messages_as_read"("p_user_id" "uuid", "p_conversation_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."mark_messages_as_read"("p_user_id" "uuid", "p_conversation_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."mark_messages_as_read"("p_user_id" "uuid", "p_conversation_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."mark_notifications_as_read"("p_user_id" "uuid", "p_notification_ids" "uuid"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."mark_notifications_as_read"("p_user_id" "uuid", "p_notification_ids" "uuid"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."mark_notifications_as_read"("p_user_id" "uuid", "p_notification_ids" "uuid"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."sync_user_from_auth"() TO "anon";
GRANT ALL ON FUNCTION "public"."sync_user_from_auth"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_user_from_auth"() TO "service_role";



GRANT ALL ON FUNCTION "public"."trigger_bookmark_notification"() TO "anon";
GRANT ALL ON FUNCTION "public"."trigger_bookmark_notification"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trigger_bookmark_notification"() TO "service_role";



GRANT ALL ON FUNCTION "public"."trigger_comment_notification"() TO "anon";
GRANT ALL ON FUNCTION "public"."trigger_comment_notification"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trigger_comment_notification"() TO "service_role";



GRANT ALL ON FUNCTION "public"."trigger_follow_notification"() TO "anon";
GRANT ALL ON FUNCTION "public"."trigger_follow_notification"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trigger_follow_notification"() TO "service_role";



GRANT ALL ON FUNCTION "public"."trigger_post_like_notification"() TO "anon";
GRANT ALL ON FUNCTION "public"."trigger_post_like_notification"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trigger_post_like_notification"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_conversation_last_message"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_conversation_last_message"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_conversation_last_message"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_live_streams_tsv"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_live_streams_tsv"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_live_streams_tsv"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_upload_sessions_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_upload_sessions_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_upload_sessions_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_video_assets_tsv"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_video_assets_tsv"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_video_assets_tsv"() TO "service_role";


















GRANT ALL ON TABLE "public"."collective_invites" TO "anon";
GRANT ALL ON TABLE "public"."collective_invites" TO "authenticated";
GRANT ALL ON TABLE "public"."collective_invites" TO "service_role";



GRANT ALL ON TABLE "public"."collective_members" TO "anon";
GRANT ALL ON TABLE "public"."collective_members" TO "authenticated";
GRANT ALL ON TABLE "public"."collective_members" TO "service_role";



GRANT ALL ON TABLE "public"."collectives" TO "anon";
GRANT ALL ON TABLE "public"."collectives" TO "authenticated";
GRANT ALL ON TABLE "public"."collectives" TO "service_role";



GRANT ALL ON TABLE "public"."comment_reactions" TO "anon";
GRANT ALL ON TABLE "public"."comment_reactions" TO "authenticated";
GRANT ALL ON TABLE "public"."comment_reactions" TO "service_role";



GRANT ALL ON TABLE "public"."comments" TO "anon";
GRANT ALL ON TABLE "public"."comments" TO "authenticated";
GRANT ALL ON TABLE "public"."comments" TO "service_role";



GRANT ALL ON TABLE "public"."conversation_participants" TO "anon";
GRANT ALL ON TABLE "public"."conversation_participants" TO "authenticated";
GRANT ALL ON TABLE "public"."conversation_participants" TO "service_role";



GRANT ALL ON TABLE "public"."conversations" TO "anon";
GRANT ALL ON TABLE "public"."conversations" TO "authenticated";
GRANT ALL ON TABLE "public"."conversations" TO "service_role";



GRANT ALL ON TABLE "public"."customers" TO "anon";
GRANT ALL ON TABLE "public"."customers" TO "authenticated";
GRANT ALL ON TABLE "public"."customers" TO "service_role";



GRANT ALL ON TABLE "public"."featured_posts" TO "anon";
GRANT ALL ON TABLE "public"."featured_posts" TO "authenticated";
GRANT ALL ON TABLE "public"."featured_posts" TO "service_role";



GRANT ALL ON TABLE "public"."follows" TO "anon";
GRANT ALL ON TABLE "public"."follows" TO "authenticated";
GRANT ALL ON TABLE "public"."follows" TO "service_role";



GRANT ALL ON TABLE "public"."interactions" TO "anon";
GRANT ALL ON TABLE "public"."interactions" TO "authenticated";
GRANT ALL ON TABLE "public"."interactions" TO "service_role";



GRANT ALL ON TABLE "public"."live_streams" TO "anon";
GRANT ALL ON TABLE "public"."live_streams" TO "authenticated";
GRANT ALL ON TABLE "public"."live_streams" TO "service_role";



GRANT ALL ON TABLE "public"."message_reactions" TO "anon";
GRANT ALL ON TABLE "public"."message_reactions" TO "authenticated";
GRANT ALL ON TABLE "public"."message_reactions" TO "service_role";



GRANT ALL ON TABLE "public"."message_read_receipts" TO "anon";
GRANT ALL ON TABLE "public"."message_read_receipts" TO "authenticated";
GRANT ALL ON TABLE "public"."message_read_receipts" TO "service_role";



GRANT ALL ON TABLE "public"."messages" TO "anon";
GRANT ALL ON TABLE "public"."messages" TO "authenticated";
GRANT ALL ON TABLE "public"."messages" TO "service_role";



GRANT ALL ON TABLE "public"."mux_webhooks" TO "anon";
GRANT ALL ON TABLE "public"."mux_webhooks" TO "authenticated";
GRANT ALL ON TABLE "public"."mux_webhooks" TO "service_role";



GRANT ALL ON TABLE "public"."notification_preferences" TO "anon";
GRANT ALL ON TABLE "public"."notification_preferences" TO "authenticated";
GRANT ALL ON TABLE "public"."notification_preferences" TO "service_role";



GRANT ALL ON TABLE "public"."notifications" TO "anon";
GRANT ALL ON TABLE "public"."notifications" TO "authenticated";
GRANT ALL ON TABLE "public"."notifications" TO "service_role";



GRANT ALL ON TABLE "public"."post_bookmarks" TO "anon";
GRANT ALL ON TABLE "public"."post_bookmarks" TO "authenticated";
GRANT ALL ON TABLE "public"."post_bookmarks" TO "service_role";



GRANT ALL ON TABLE "public"."post_reactions" TO "anon";
GRANT ALL ON TABLE "public"."post_reactions" TO "authenticated";
GRANT ALL ON TABLE "public"."post_reactions" TO "service_role";



GRANT ALL ON TABLE "public"."post_views" TO "anon";
GRANT ALL ON TABLE "public"."post_views" TO "authenticated";
GRANT ALL ON TABLE "public"."post_views" TO "service_role";



GRANT ALL ON TABLE "public"."posts" TO "anon";
GRANT ALL ON TABLE "public"."posts" TO "authenticated";
GRANT ALL ON TABLE "public"."posts" TO "service_role";



GRANT ALL ON TABLE "public"."recommendations" TO "anon";
GRANT ALL ON TABLE "public"."recommendations" TO "authenticated";
GRANT ALL ON TABLE "public"."recommendations" TO "service_role";



GRANT ALL ON TABLE "public"."subscriptions" TO "anon";
GRANT ALL ON TABLE "public"."subscriptions" TO "authenticated";
GRANT ALL ON TABLE "public"."subscriptions" TO "service_role";



GRANT ALL ON TABLE "public"."upload_sessions" TO "anon";
GRANT ALL ON TABLE "public"."upload_sessions" TO "authenticated";
GRANT ALL ON TABLE "public"."upload_sessions" TO "service_role";



GRANT ALL ON TABLE "public"."users" TO "anon";
GRANT ALL ON TABLE "public"."users" TO "authenticated";
GRANT ALL ON TABLE "public"."users" TO "service_role";



GRANT ALL ON TABLE "public"."video_analytics" TO "anon";
GRANT ALL ON TABLE "public"."video_analytics" TO "authenticated";
GRANT ALL ON TABLE "public"."video_analytics" TO "service_role";



GRANT ALL ON TABLE "public"."video_assets" TO "anon";
GRANT ALL ON TABLE "public"."video_assets" TO "authenticated";
GRANT ALL ON TABLE "public"."video_assets" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "service_role";






























RESET ALL;
