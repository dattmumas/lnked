

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


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgjwt" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "vector" WITH SCHEMA "public";






CREATE TYPE "public"."agreement_type" AS ENUM (
    'subscription',
    'one_time_payment',
    'revenue_share',
    'membership_fee',
    'ownership_transfer',
    'other'
);


ALTER TYPE "public"."agreement_type" OWNER TO "postgres";


CREATE TYPE "public"."collective_member_role" AS ENUM (
    'admin',
    'editor',
    'author',
    'owner'
);


ALTER TYPE "public"."collective_member_role" OWNER TO "postgres";


CREATE TYPE "public"."interaction_entity_type" AS ENUM (
    'collective',
    'post',
    'user'
);


ALTER TYPE "public"."interaction_entity_type" OWNER TO "postgres";


CREATE TYPE "public"."interaction_type" AS ENUM (
    'like',
    'unlike',
    'recommended_interested',
    'recommended_not_interested',
    'view'
);


ALTER TYPE "public"."interaction_type" OWNER TO "postgres";


CREATE TYPE "public"."member_entity_type" AS ENUM (
    'user',
    'collective'
);


ALTER TYPE "public"."member_entity_type" OWNER TO "postgres";


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


CREATE TYPE "public"."post_status_type" AS ENUM (
    'draft',
    'active',
    'removed'
);


ALTER TYPE "public"."post_status_type" OWNER TO "postgres";


CREATE TYPE "public"."post_type_enum" AS ENUM (
    'text',
    'video'
);


ALTER TYPE "public"."post_type_enum" OWNER TO "postgres";


CREATE TYPE "public"."price_interval" AS ENUM (
    'month',
    'year',
    'week',
    'day'
);


ALTER TYPE "public"."price_interval" OWNER TO "postgres";


CREATE TYPE "public"."price_type" AS ENUM (
    'recurring',
    'one_time'
);


ALTER TYPE "public"."price_type" OWNER TO "postgres";


CREATE TYPE "public"."subscription_status" AS ENUM (
    'trialing',
    'active',
    'canceled',
    'incomplete',
    'incomplete_expired',
    'past_due',
    'unpaid',
    'paused'
);


ALTER TYPE "public"."subscription_status" OWNER TO "postgres";


CREATE TYPE "public"."subscription_target_type" AS ENUM (
    'user',
    'collective'
);


ALTER TYPE "public"."subscription_target_type" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."cleanup_expired_cache"() RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  DELETE FROM public.recommendation_cache
  WHERE expires_at < NOW() - INTERVAL '24 hours';
END;
$$;


ALTER FUNCTION "public"."cleanup_expired_cache"() OWNER TO "postgres";


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

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."video_assets" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "mux_asset_id" character varying(255),
    "mux_playback_id" character varying(255),
    "title" character varying(500),
    "description" "text",
    "duration" numeric(10,2),
    "status" character varying(50) DEFAULT 'preparing'::character varying,
    "aspect_ratio" character varying(20),
    "created_by" "uuid",
    "created_at" timestamp without time zone DEFAULT "now"(),
    "updated_at" timestamp without time zone DEFAULT "now"(),
    "mux_upload_id" "text",
    "mp4_support" "text" DEFAULT 'none'::"text",
    CONSTRAINT "check_has_mux_id" CHECK ((("mux_upload_id" IS NOT NULL) OR ("mux_asset_id" IS NOT NULL))),
    CONSTRAINT "check_mux_asset_id_not_upload" CHECK ((("mux_asset_id" IS NULL) OR (("mux_asset_id")::"text" !~~ 'upload-%'::"text"))),
    CONSTRAINT "video_assets_mp4_support_check" CHECK (("mp4_support" = ANY (ARRAY['none'::"text", 'capped-1080p'::"text", 'audio-only'::"text"])))
);


ALTER TABLE "public"."video_assets" OWNER TO "postgres";


COMMENT ON COLUMN "public"."video_assets"."mux_asset_id" IS 'MUX Asset ID after processing is complete';



COMMENT ON COLUMN "public"."video_assets"."mux_upload_id" IS 'MUX Direct Upload ID (starts with "upload-")';



COMMENT ON COLUMN "public"."video_assets"."mp4_support" IS 'MP4 rendition setting: none, capped-1080p, etc.';



CREATE OR REPLACE FUNCTION "public"."find_video_by_mux_id"("p_mux_id" "text") RETURNS SETOF "public"."video_assets"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  RETURN QUERY
  SELECT * FROM video_assets 
  WHERE mux_asset_id = p_mux_id 
     OR mux_upload_id = p_mux_id
  LIMIT 1;
END;
$$;


ALTER FUNCTION "public"."find_video_by_mux_id"("p_mux_id" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_cached_recommendations"("p_user_id" "uuid", "p_cache_key" "text", "p_algorithm_version" "text" DEFAULT 'v1'::"text") RETURNS "jsonb"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_recommendations JSONB;
BEGIN
  SELECT recommendations INTO v_recommendations
  FROM public.recommendation_cache
  WHERE user_id = p_user_id
    AND cache_key = p_cache_key
    AND algorithm_version = p_algorithm_version
    AND expires_at > NOW()
  LIMIT 1;
  
  RETURN v_recommendations;
END;
$$;


ALTER FUNCTION "public"."get_cached_recommendations"("p_user_id" "uuid", "p_cache_key" "text", "p_algorithm_version" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_collective_stats"("collective_id" "uuid") RETURNS "json"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    result JSON;
    member_count INT;
    follower_count INT;
BEGIN
    -- Get member count
    SELECT COUNT(*) INTO member_count
    FROM collective_members 
    WHERE collective_members.collective_id = get_collective_stats.collective_id;
    
    -- Get follower count
    SELECT COUNT(*) INTO follower_count
    FROM follows 
    WHERE follows.following_id = get_collective_stats.collective_id 
      AND follows.following_type = 'collective';
    
    -- Build result JSON (matching TypeScript expectations)
    result := json_build_object(
        'member_count', member_count,
        'follower_count', follower_count
    );
    
    RETURN result;
END;
$$;


ALTER FUNCTION "public"."get_collective_stats"("collective_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_follower_count"("entity_id" "uuid", "entity_type" "text") RETURNS integer
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    RETURN (
        SELECT COUNT(*)::INTEGER
        FROM follows
        WHERE following_id = entity_id AND following_type = entity_type
    );
END;
$$;


ALTER FUNCTION "public"."get_follower_count"("entity_id" "uuid", "entity_type" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_following_count"("user_id" "uuid", "entity_type" "text" DEFAULT NULL::"text") RETURNS integer
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    IF entity_type IS NULL THEN
        RETURN (
            SELECT COUNT(*)::INTEGER
            FROM follows
            WHERE follower_id = user_id
        );
    ELSE
        RETURN (
            SELECT COUNT(*)::INTEGER
            FROM follows
            WHERE follower_id = user_id AND following_type = entity_type
        );
    END IF;
END;
$$;


ALTER FUNCTION "public"."get_following_count"("user_id" "uuid", "entity_type" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_subscriber_count"("entity_id" "uuid", "entity_type" "text") RETURNS integer
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    RETURN (
        SELECT COUNT(*)::INTEGER
        FROM subscriptions
        WHERE target_entity_id = entity_id 
        AND target_entity_type = entity_type::subscription_target_type
        AND status = 'active'
    );
END;
$$;


ALTER FUNCTION "public"."get_subscriber_count"("entity_id" "uuid", "entity_type" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_unread_message_count"("p_user_id" "uuid", "p_conversation_id" "uuid") RETURNS integer
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  unread_count INTEGER;
  last_read_at TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Get user's last read timestamp for this conversation
  SELECT cp.last_read_at INTO last_read_at
  FROM public.conversation_participants cp
  WHERE cp.user_id = p_user_id AND cp.conversation_id = p_conversation_id;
  
  -- If user is not a participant, return 0
  IF last_read_at IS NULL THEN
    RETURN 0;
  END IF;
  
  -- Count messages created after last read time
  SELECT COUNT(*)::INTEGER INTO unread_count
  FROM public.messages m
  WHERE m.conversation_id = p_conversation_id
    AND m.created_at > last_read_at
    AND m.sender_id != p_user_id
    AND m.deleted_at IS NULL;
    
  RETURN COALESCE(unread_count, 0);
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


CREATE OR REPLACE FUNCTION "public"."get_user_dashboard_content"("user_id_param" "uuid", "posts_limit" integer DEFAULT 3) RETURNS "json"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    result JSON;
    user_profile JSON;
    recent_posts JSON;
    owned_collectives JSON;
BEGIN
    -- Get user profile
    SELECT json_build_object(
        'username', u.username,
        'full_name', u.full_name,
        'avatar_url', u.avatar_url
    ) INTO user_profile
    FROM users u
    WHERE u.id = user_id_param;
    
    -- Get recent personal posts (FIXED: corrected subquery structure)
    SELECT json_agg(
        json_build_object(
            'id', p.id,
            'title', p.title,
            'published_at', p.published_at,
            'created_at', p.created_at,
            'is_public', p.is_public,
            'collective_id', p.collective_id
        ) ORDER BY p.created_at DESC
    ) INTO recent_posts
    FROM (
        SELECT p.id, p.title, p.published_at, p.created_at, p.is_public, p.collective_id
        FROM posts p
        WHERE p.author_id = user_id_param 
          AND p.collective_id IS NULL
        ORDER BY p.created_at DESC
        LIMIT posts_limit
    ) p;
    
    -- Get owned collectives
    SELECT json_agg(
        json_build_object(
            'id', c.id,
            'name', c.name,
            'slug', c.slug,
            'description', c.description
        ) ORDER BY c.name ASC
    ) INTO owned_collectives
    FROM collectives c
    WHERE c.owner_id = user_id_param;
    
    -- Build result JSON
    result := json_build_object(
        'profile', user_profile,
        'recent_posts', COALESCE(recent_posts, '[]'::json),
        'owned_collectives', COALESCE(owned_collectives, '[]'::json)
    );
    
    RETURN result;
END;
$$;


ALTER FUNCTION "public"."get_user_dashboard_content"("user_id_param" "uuid", "posts_limit" integer) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_user_dashboard_content"("user_id_param" "uuid", "posts_limit" integer) IS 'FIXED: Consolidates user profile, recent posts, and owned collectives with corrected SQL syntax';



CREATE OR REPLACE FUNCTION "public"."get_user_dashboard_stats"("user_id_param" "uuid") RETURNS TABLE("subscriber_count" bigint, "follower_count" bigint, "total_views" bigint, "total_likes" bigint, "published_this_month" bigint, "total_posts" bigint, "collective_count" bigint)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    RETURN QUERY
    WITH stats AS (
        SELECT COUNT(*) as subs
        FROM subscriptions s
        WHERE s.target_entity_type = 'user' 
          AND s.target_entity_id = user_id_param 
          AND s.status = 'active'
    ),
    followers AS (
        SELECT COUNT(*) as follows
        FROM follows f
        WHERE f.following_id = user_id_param 
          AND f.following_type = 'user'
    ),
    post_stats AS (
        SELECT 
            COALESCE(SUM(p.view_count), 0) as views,
            COALESCE(SUM(p.like_count), 0) as likes
        FROM posts p
        WHERE p.author_id = user_id_param
    ),
    monthly_posts AS (
        SELECT COUNT(*) as monthly
        FROM posts p
        WHERE p.author_id = user_id_param 
          AND p.published_at IS NOT NULL
          AND p.published_at >= DATE_TRUNC('month', CURRENT_DATE)
    ),
    total_posts_count AS (
        SELECT COUNT(*) as total
        FROM posts p
        WHERE p.author_id = user_id_param 
          AND p.collective_id IS NULL
    ),
    collective_count AS (
        SELECT COUNT(*) as collectives
        FROM collectives c
        WHERE c.owner_id = user_id_param
    )
    SELECT 
        stats.subs::BIGINT,
        followers.follows::BIGINT,
        post_stats.views::BIGINT,
        post_stats.likes::BIGINT,
        monthly_posts.monthly::BIGINT,
        total_posts_count.total::BIGINT,
        collective_count.collectives::BIGINT
    FROM stats, followers, post_stats, monthly_posts, total_posts_count, collective_count;
END;
$$;


ALTER FUNCTION "public"."get_user_dashboard_stats"("user_id_param" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_user_dashboard_stats"("user_id_param" "uuid") IS 'FIXED: Consolidates all user dashboard statistics with unambiguous parameter naming';



CREATE OR REPLACE FUNCTION "public"."get_user_dashboard_stats_v2"("user_id_param" "uuid") RETURNS TABLE("subscriber_count" bigint, "follower_count" bigint, "total_views" bigint, "total_likes" bigint, "published_this_month" bigint, "total_posts" bigint, "collective_count" bigint)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    RETURN QUERY
    WITH stats AS (
        -- Get subscriber count
        SELECT COUNT(*) as subs
        FROM subscriptions s
        WHERE s.target_entity_type = 'user' 
          AND s.target_entity_id = user_id_param 
          AND s.status = 'active'
    ),
    followers AS (
        -- Get follower count
        SELECT COUNT(*) as follows
        FROM follows f
        WHERE f.following_id = user_id_param 
          AND f.following_type = 'user'
    ),
    post_stats AS (
        -- Get total views and likes
        SELECT 
            COALESCE(SUM(p.view_count), 0) as views,
            COALESCE(SUM(p.like_count), 0) as likes
        FROM posts p
        WHERE p.author_id = user_id_param
    ),
    monthly_posts AS (
        -- Get posts published this month
        SELECT COUNT(*) as monthly
        FROM posts p
        WHERE p.author_id = user_id_param 
          AND p.published_at IS NOT NULL
          AND p.published_at >= DATE_TRUNC('month', CURRENT_DATE)
    ),
    total_posts_count AS (
        -- Get total posts count
        SELECT COUNT(*) as total
        FROM posts p
        WHERE p.author_id = user_id_param 
          AND p.collective_id IS NULL
    ),
    collective_count AS (
        -- Get owned collectives count
        SELECT COUNT(*) as collectives
        FROM collectives c
        WHERE c.owner_id = user_id_param
    )
    SELECT 
        stats.subs::BIGINT,
        followers.follows::BIGINT,
        post_stats.views::BIGINT,
        post_stats.likes::BIGINT,
        monthly_posts.monthly::BIGINT,
        total_posts_count.total::BIGINT,
        collective_count.collectives::BIGINT
    FROM stats, followers, post_stats, monthly_posts, total_posts_count, collective_count;
END;
$$;


ALTER FUNCTION "public"."get_user_dashboard_stats_v2"("user_id_param" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_feed"("p_user_id" "uuid", "p_limit" integer DEFAULT 20, "p_offset" integer DEFAULT 0) RETURNS TABLE("id" "uuid", "title" "text", "content" "text", "created_at" timestamp with time zone, "published_at" timestamp with time zone, "is_public" boolean, "author_id" "uuid", "author_full_name" "text", "collective_id" "uuid", "collective_name" "text", "collective_slug" "text", "like_count" bigint)
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    subscribed_user_ids uuid[];
    subscribed_collective_ids uuid[];
BEGIN
    SELECT ARRAY(
        SELECT s.target_entity_id 
        FROM public.subscriptions s
        WHERE s.user_id = p_user_id 
          AND s.target_entity_type = 'user' 
          AND s.status IN ('active', 'trialing')
    ) INTO subscribed_user_ids;

    SELECT ARRAY(
        SELECT s.target_entity_id 
        FROM public.subscriptions s
        WHERE s.user_id = p_user_id 
          AND s.target_entity_type = 'collective'
          AND s.status IN ('active', 'trialing')
    ) INTO subscribed_collective_ids;

    RETURN QUERY
    WITH feed_items AS (
        SELECT 
            p.id,
            p.title,
            p.content,
            p.created_at,
            p.published_at,
            p.is_public,
            p.author_id,
            u.full_name as author_full_name,
            NULL::uuid as collective_id,
            NULL::text as collective_name,
            NULL::text as collective_slug,
            (SELECT COUNT(*) FROM public.likes l WHERE l.post_id = p.id) as like_count
        FROM public.posts p
        JOIN public.users u ON p.author_id = u.id
        WHERE p.author_id = ANY(subscribed_user_ids)
          AND p.collective_id IS NULL
          AND p.published_at IS NOT NULL

        UNION ALL

        SELECT 
            p.id,
            p.title,
            p.content,
            p.created_at,
            p.published_at,
            p.is_public,
            p.author_id,
            u.full_name as author_full_name,
            p.collective_id,
            c.name as collective_name,
            c.slug as collective_slug,
            (SELECT COUNT(*) FROM public.likes l WHERE l.post_id = p.id) as like_count
        FROM public.posts p
        JOIN public.users u ON p.author_id = u.id
        JOIN public.collectives c ON p.collective_id = c.id
        WHERE p.collective_id = ANY(subscribed_collective_ids)
          AND p.published_at IS NOT NULL
    )
    SELECT *
    FROM feed_items
    ORDER BY COALESCE(feed_items.published_at, feed_items.created_at) DESC -- Explicitly use CTE alias
    LIMIT p_limit
    OFFSET p_offset;
END;
$$;


ALTER FUNCTION "public"."get_user_feed"("p_user_id" "uuid", "p_limit" integer, "p_offset" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_preference_weights"("p_user_id" "uuid") RETURNS TABLE("content_type" "text", "weight" double precision)
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    key AS content_type,
    (value::text)::float AS weight
  FROM public.user_preferences,
       jsonb_each(content_type_weights)
  WHERE user_id = p_user_id;
END;
$$;


ALTER FUNCTION "public"."get_user_preference_weights"("p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
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
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."increment_view_count"("post_id_to_increment" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
    BEGIN
      UPDATE posts SET view_count = view_count + 1 WHERE id = post_id_to_increment;
    END;
    $$;


ALTER FUNCTION "public"."increment_view_count"("post_id_to_increment" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."invalidate_user_cache"("p_user_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  UPDATE public.recommendation_cache
  SET expires_at = NOW()
  WHERE user_id = p_user_id;
END;
$$;


ALTER FUNCTION "public"."invalidate_user_cache"("p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_collective_owner"("cid" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE
    AS $$
  select exists (
    select 1 from collectives
    where id = cid and owner_id = auth.uid()
  );
$$;


ALTER FUNCTION "public"."is_collective_owner"("cid" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_content_muted"("p_user_id" "uuid", "p_content_id" "uuid", "p_author_id" "uuid", "p_collective_id" "uuid", "p_tags" "text"[]) RETURNS boolean
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_preferences RECORD;
BEGIN
  SELECT * INTO v_preferences
  FROM public.user_preferences
  WHERE user_id = p_user_id;
  
  -- Check muted authors
  IF p_author_id = ANY(v_preferences.muted_authors) THEN
    RETURN true;
  END IF;
  
  -- Check muted collectives
  IF p_collective_id = ANY(v_preferences.muted_collectives) THEN
    RETURN true;
  END IF;
  
  -- Check muted topics
  IF v_preferences.muted_topics && p_tags THEN
    RETURN true;
  END IF;
  
  RETURN false;
END;
$$;


ALTER FUNCTION "public"."is_content_muted"("p_user_id" "uuid", "p_content_id" "uuid", "p_author_id" "uuid", "p_collective_id" "uuid", "p_tags" "text"[]) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_following"("follower_user_id" "uuid", "target_id" "uuid", "target_type" "text") RETURNS boolean
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM follows
        WHERE follower_id = follower_user_id 
        AND following_id = target_id 
        AND following_type = target_type
    );
END;
$$;


ALTER FUNCTION "public"."is_following"("follower_user_id" "uuid", "target_id" "uuid", "target_type" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."mark_messages_as_read"("p_user_id" "uuid", "p_conversation_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  -- Update participant's last read timestamp
  UPDATE public.conversation_participants 
  SET last_read_at = NOW()
  WHERE user_id = p_user_id AND conversation_id = p_conversation_id;
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


CREATE OR REPLACE FUNCTION "public"."set_updated_at_agreements"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."set_updated_at_agreements"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_updated_at_collectives"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."set_updated_at_collectives"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_updated_at_users"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."set_updated_at_users"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_user_from_auth"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  -- Simple insert/update since all required data will be in metadata
  INSERT INTO public.users (id, full_name, username, avatar_url, updated_at)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'username', 
    NEW.raw_user_meta_data->>'avatar_url',
    NOW()
  )
  ON CONFLICT (id) DO UPDATE
  SET 
    full_name = EXCLUDED.full_name,
    username = EXCLUDED.username,
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


CREATE OR REPLACE FUNCTION "public"."update_collective_members_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_collective_members_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_collectives_tsv"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.tsv = to_tsvector('english', coalesce(NEW.name, '') || ' ' || coalesce(NEW.description, '') || ' ' || array_to_string(coalesce(NEW.tags, ARRAY[]::TEXT[]), ' '));
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_collectives_tsv"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_conversation_last_message"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  UPDATE public.conversations 
  SET last_message_at = NOW()
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_conversation_last_message"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_post_like_count"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        UPDATE posts SET like_count = posts.like_count + 1 WHERE id = NEW.post_id;
        RETURN NEW;
    ELSIF (TG_OP = 'DELETE') THEN
        UPDATE posts SET like_count = posts.like_count - 1 WHERE id = OLD.post_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$;


ALTER FUNCTION "public"."update_post_like_count"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_posts_tsv"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.tsv = to_tsvector('english', coalesce(NEW.title, '') || ' ' || coalesce(NEW.content, ''));
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_posts_tsv"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_user_post_count"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE users SET post_count = post_count + 1 WHERE id = NEW.author_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE users SET post_count = post_count - 1 WHERE id = OLD.author_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;


ALTER FUNCTION "public"."update_user_post_count"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_users_tsv"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.tsv = to_tsvector('english', coalesce(NEW.full_name, '') || ' ' || coalesce(NEW.bio, '') || ' ' || array_to_string(coalesce(NEW.tags, ARRAY[]::TEXT[]), ' '));
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_users_tsv"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."validate_collective_subscription"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    price_product_id TEXT;
    product_collective_id UUID;
BEGIN
    IF NEW.target_entity_type::text = 'collective' THEN -- Cast to text if enum type is subscription_target_type
        IF NOT EXISTS (SELECT 1 FROM collectives WHERE id = NEW.target_entity_id) THEN
            RAISE EXCEPTION 'Invalid target_entity_id: No collective found with id %', NEW.target_entity_id;
        END IF;

        SELECT p.product_id INTO price_product_id FROM prices p WHERE p.id = NEW.stripe_price_id;
        IF NOT FOUND THEN
            RAISE EXCEPTION 'Invalid stripe_price_id: No price found with id %', NEW.stripe_price_id;
        END IF;

        SELECT prod.collective_id INTO product_collective_id FROM products prod WHERE prod.id = price_product_id;
        IF NOT FOUND THEN
            RAISE EXCEPTION 'Invalid price: No product found for price id %', NEW.stripe_price_id;
        END IF;

        IF product_collective_id IS NULL OR product_collective_id != NEW.target_entity_id THEN
            RAISE EXCEPTION 'Subscription price does not belong to the target collective. Product collective: %, Target collective: %', product_collective_id, NEW.target_entity_id;
        END IF;
    END IF;
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."validate_collective_subscription"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."validate_follows_target"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    -- Validate target exists based on type
    IF NEW.following_type = 'user' THEN
        IF NOT EXISTS (SELECT 1 FROM users WHERE id = NEW.following_id) THEN
            RAISE EXCEPTION 'User with id % does not exist', NEW.following_id;
        END IF;
    ELSIF NEW.following_type = 'collective' THEN
        IF NOT EXISTS (SELECT 1 FROM collectives WHERE id = NEW.following_id) THEN
            RAISE EXCEPTION 'Collective with id % does not exist', NEW.following_id;
        END IF;
    END IF;
    
    -- Prevent self-following for users
    IF NEW.following_type = 'user' AND NEW.follower_id = NEW.following_id THEN
        RAISE EXCEPTION 'Users cannot follow themselves';
    END IF;
    
    -- Prevent following your own collective
    IF NEW.following_type = 'collective' THEN
        IF EXISTS (
            SELECT 1 FROM collectives 
            WHERE id = NEW.following_id AND owner_id = NEW.follower_id
        ) THEN
            RAISE EXCEPTION 'Users cannot follow their own collective';
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."validate_follows_target"() OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."agreements" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "party_a_type" "public"."member_entity_type" NOT NULL,
    "party_a_id" "uuid" NOT NULL,
    "party_b_type" "public"."member_entity_type" NOT NULL,
    "party_b_id" "uuid" NOT NULL,
    "agreement_type" "public"."agreement_type" NOT NULL,
    "stripe_object_id" "text",
    "terms" "jsonb",
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."agreements" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."follows" (
    "follower_id" "uuid" NOT NULL,
    "following_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "following_type" "text" NOT NULL,
    CONSTRAINT "follows_following_type_check" CHECK (("following_type" = ANY (ARRAY['user'::"text", 'collective'::"text"])))
);

ALTER TABLE ONLY "public"."follows" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."follows" OWNER TO "postgres";


COMMENT ON TABLE "public"."follows" IS 'Tracks follow relationships between users and collectives';



COMMENT ON COLUMN "public"."follows"."follower_id" IS 'The user who is performing the follow action.';



COMMENT ON COLUMN "public"."follows"."following_id" IS 'The user who is being followed.';



CREATE TABLE IF NOT EXISTS "public"."users" (
    "id" "uuid" NOT NULL,
    "full_name" "text",
    "role" "text" DEFAULT 'subscriber'::"text",
    "bio" "text",
    "tags" "text"[],
    "embedding" "public"."vector"(1536),
    "tsv" "tsvector",
    "stripe_customer_id" "text",
    "stripe_account_id" "text",
    "stripe_account_type" "text",
    "terms_accepted_at" timestamp with time zone,
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "avatar_url" "text",
    "cover_image_url" "text",
    "social_links" "jsonb",
    "is_profile_public" boolean DEFAULT true,
    "show_followers" boolean DEFAULT true,
    "show_subscriptions" boolean DEFAULT true,
    "show_comments" boolean DEFAULT true,
    "pinned_post_id" "uuid",
    "username" "text",
    "post_count" integer DEFAULT 0,
    "follower_count" integer DEFAULT 0,
    "following_count" integer DEFAULT 0,
    "created_at" timestamp with time zone,
    CONSTRAINT "users_role_check" CHECK (("role" = ANY (ARRAY['subscriber'::"text", 'writer'::"text", 'admin'::"text"])))
);

ALTER TABLE ONLY "public"."users" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."users" OWNER TO "postgres";


COMMENT ON TABLE "public"."users" IS 'Public user profiles, mirrors auth.users with additional application-specific data.';



COMMENT ON COLUMN "public"."users"."role" IS 'User role: subscriber, writer, admin.';



COMMENT ON COLUMN "public"."users"."bio" IS 'User biography or short description.';



COMMENT ON COLUMN "public"."users"."tags" IS 'User-defined tags or interests as an array of text.';



COMMENT ON COLUMN "public"."users"."embedding" IS 'Vector embedding for profile similarity searches.';



CREATE OR REPLACE VIEW "public"."collective_followers" AS
 SELECT "f"."following_id" AS "collective_id",
    "f"."follower_id",
    "u"."full_name" AS "follower_name",
    "u"."username" AS "follower_username",
    "u"."avatar_url" AS "follower_avatar",
    "f"."created_at"
   FROM ("public"."follows" "f"
     JOIN "public"."users" "u" ON (("f"."follower_id" = "u"."id")))
  WHERE ("f"."following_type" = 'collective'::"text");


ALTER TABLE "public"."collective_followers" OWNER TO "postgres";


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
    "member_id" "uuid" NOT NULL,
    "role" "public"."collective_member_role" DEFAULT 'author'::"public"."collective_member_role" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "member_type" "public"."member_entity_type" DEFAULT 'user'::"public"."member_entity_type" NOT NULL,
    "share_percentage" numeric(5,2)
);

ALTER TABLE ONLY "public"."collective_members" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."collective_members" OWNER TO "postgres";


COMMENT ON TABLE "public"."collective_members" IS 'Tracks user memberships and roles within collectives.';



CREATE TABLE IF NOT EXISTS "public"."collectives" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "slug" "text" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "owner_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "tags" "text"[],
    "tsv" "tsvector",
    "stripe_account_id" "text",
    "stripe_account_type" "text",
    "stripe_customer_id" "text",
    "governance_model" "text",
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "logo_url" "text",
    "cover_image_url" "text",
    "intro_video_url" "text",
    "pinned_post_id" "uuid",
    "member_count" integer DEFAULT 0,
    "follower_count" integer DEFAULT 0,
    CONSTRAINT "collectives_slug_check" CHECK (("slug" ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'::"text"))
);

ALTER TABLE ONLY "public"."collectives" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."collectives" OWNER TO "postgres";


COMMENT ON TABLE "public"."collectives" IS 'Collaborative newsletter entities.';



COMMENT ON COLUMN "public"."collectives"."slug" IS 'URL-friendly unique identifier.';



COMMENT ON COLUMN "public"."collectives"."owner_id" IS 'User who owns the collective.';



COMMENT ON COLUMN "public"."collectives"."tags" IS 'Collective-defined tags or topics as an array of text.';



CREATE TABLE IF NOT EXISTS "public"."comment_reactions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "comment_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "type" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "comment_reactions_type_check" CHECK (("type" = ANY (ARRAY['like'::"text", 'dislike'::"text"])))
);


ALTER TABLE "public"."comment_reactions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."comments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "post_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "parent_id" "uuid",
    "content" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "comments_content_check" CHECK (("char_length"("content") <= 10000))
);


ALTER TABLE "public"."comments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."content_metadata" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "content_id" "uuid" NOT NULL,
    "content_type" "text" NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "tags" "text"[] DEFAULT '{}'::"text"[],
    "category" "text",
    "duration" integer,
    "word_count" integer,
    "thumbnail_url" "text",
    "language" "text" DEFAULT 'en'::"text",
    "popularity_score" double precision DEFAULT 0,
    "quality_score" double precision DEFAULT 0,
    "freshness_score" double precision DEFAULT 1,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "content_metadata_content_type_check" CHECK (("content_type" = ANY (ARRAY['post'::"text", 'video'::"text", 'audio'::"text"])))
);


ALTER TABLE "public"."content_metadata" OWNER TO "postgres";


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

ALTER TABLE ONLY "public"."customers" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."customers" OWNER TO "postgres";


COMMENT ON TABLE "public"."customers" IS 'Maps application users to Stripe Customer IDs.';



COMMENT ON COLUMN "public"."customers"."stripe_customer_id" IS 'Stripe Customer ID.';



CREATE TABLE IF NOT EXISTS "public"."featured_posts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "owner_type" "text" NOT NULL,
    "owner_id" "uuid" NOT NULL,
    "post_id" "uuid" NOT NULL,
    "display_order" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "featured_posts_owner_type_check" CHECK (("owner_type" = ANY (ARRAY['user'::"text", 'collective'::"text"])))
);


ALTER TABLE "public"."featured_posts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."interactions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "entity_id" "uuid" NOT NULL,
    "entity_type" "public"."interaction_entity_type" NOT NULL,
    "interaction_type" "public"."interaction_type" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "metadata" "jsonb"
);

ALTER TABLE ONLY "public"."interactions" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."interactions" OWNER TO "postgres";


COMMENT ON TABLE "public"."interactions" IS 'Stores user interactions with various entities (collectives, posts, users).';



COMMENT ON COLUMN "public"."interactions"."entity_id" IS 'The ID of the entity being interacted with.';



COMMENT ON COLUMN "public"."interactions"."entity_type" IS 'The type of entity (e.g., collective, post).';



COMMENT ON COLUMN "public"."interactions"."interaction_type" IS 'The type of interaction (e.g., like, recommended_interested).';



COMMENT ON COLUMN "public"."interactions"."metadata" IS 'Optional JSONB field for additional context about the interaction.';



CREATE TABLE IF NOT EXISTS "public"."live_streams" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "mux_stream_key" character varying(255) NOT NULL,
    "mux_stream_id" character varying(255) NOT NULL,
    "mux_playback_id" character varying(255),
    "title" character varying(500),
    "description" "text",
    "status" character varying(50) DEFAULT 'idle'::character varying,
    "stream_url" character varying(1000),
    "created_by" "uuid",
    "started_at" timestamp without time zone,
    "ended_at" timestamp without time zone,
    "created_at" timestamp without time zone DEFAULT "now"(),
    "updated_at" timestamp without time zone DEFAULT "now"()
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
    "event_type" character varying(100) NOT NULL,
    "mux_asset_id" character varying(255),
    "mux_stream_id" character varying(255),
    "payload" "jsonb",
    "processed" boolean DEFAULT false,
    "created_at" timestamp without time zone DEFAULT "now"(),
    "processed_at" timestamp without time zone
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
    "user_id" "uuid" NOT NULL,
    "post_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."post_bookmarks" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."post_collectives" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "post_id" "uuid" NOT NULL,
    "collective_id" "uuid" NOT NULL,
    "status" "text" DEFAULT 'published'::"text",
    "shared_at" timestamp with time zone DEFAULT "now"(),
    "shared_by" "uuid" NOT NULL,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "display_order" integer DEFAULT 0,
    CONSTRAINT "post_collectives_status_check" CHECK (("status" = ANY (ARRAY['draft'::"text", 'published'::"text", 'pending_approval'::"text", 'rejected'::"text"])))
);


ALTER TABLE "public"."post_collectives" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."post_reactions" (
    "user_id" "uuid" NOT NULL,
    "post_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "type" "text" DEFAULT 'like'::"text" NOT NULL
);

ALTER TABLE ONLY "public"."post_reactions" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."post_reactions" OWNER TO "postgres";


COMMENT ON TABLE "public"."post_reactions" IS 'User likes on posts.';



CREATE TABLE IF NOT EXISTS "public"."post_views" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "post_id" "uuid" NOT NULL,
    "user_id" "uuid",
    "viewed_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."post_views" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."posts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "collective_id" "uuid",
    "author_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "content" "text",
    "is_public" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "published_at" timestamp with time zone,
    "status" "public"."post_status_type" DEFAULT 'draft'::"public"."post_status_type" NOT NULL,
    "like_count" integer DEFAULT 0 NOT NULL,
    "tsv" "tsvector",
    "view_count" integer DEFAULT 0,
    "dislike_count" integer DEFAULT 0,
    "subtitle" "text",
    "author" "text",
    "seo_title" "text",
    "meta_description" "text",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "post_type" "public"."post_type_enum" DEFAULT 'text'::"public"."post_type_enum" NOT NULL,
    "thumbnail_url" "text",
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "sharing_settings" "jsonb" DEFAULT '{}'::"jsonb",
    CONSTRAINT "check_author_length" CHECK (("char_length"("author") <= 100)),
    CONSTRAINT "check_meta_description_length" CHECK (("char_length"("meta_description") <= 160)),
    CONSTRAINT "check_metadata_size" CHECK (("pg_column_size"("metadata") <= 65536)),
    CONSTRAINT "check_seo_title_length" CHECK (("char_length"("seo_title") <= 60)),
    CONSTRAINT "check_subtitle_length" CHECK (("char_length"("subtitle") <= 300))
);

ALTER TABLE ONLY "public"."posts" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."posts" OWNER TO "postgres";


COMMENT ON TABLE "public"."posts" IS 'Newsletter posts. Can belong to an individual user (collective_id is NULL) or a collective.';



COMMENT ON COLUMN "public"."posts"."collective_id" IS 'The collective this post belongs to, if any.';



COMMENT ON COLUMN "public"."posts"."author_id" IS 'User who authored the post.';



COMMENT ON COLUMN "public"."posts"."is_public" IS 'True if accessible to all, false for subscribers-only.';



COMMENT ON COLUMN "public"."posts"."published_at" IS 'Timestamp when the post was made live. Null for drafts.';



COMMENT ON COLUMN "public"."posts"."subtitle" IS 'Optional subtitle for the post, displayed below the main title';



COMMENT ON COLUMN "public"."posts"."author" IS 'Optional custom author byline, separate from author_id for display flexibility';



COMMENT ON COLUMN "public"."posts"."seo_title" IS 'SEO-optimized title for search engines, max 60 characters';



COMMENT ON COLUMN "public"."posts"."meta_description" IS 'Meta description for search engines, max 160 characters';



COMMENT ON COLUMN "public"."posts"."metadata" IS 'Flexible JSON storage for post-specific data';



COMMENT ON COLUMN "public"."posts"."post_type" IS 'Type of post content: text for regular posts, video for video posts';



CREATE TABLE IF NOT EXISTS "public"."prices" (
    "id" "text" NOT NULL,
    "product_id" "text",
    "active" boolean,
    "description" "text",
    "unit_amount" bigint,
    "currency" "text",
    "type" "public"."price_type",
    "interval" "public"."price_interval",
    "interval_count" integer,
    "trial_period_days" integer,
    "metadata" "jsonb",
    CONSTRAINT "prices_currency_check" CHECK (("char_length"("currency") = 3))
);

ALTER TABLE ONLY "public"."prices" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."prices" OWNER TO "postgres";


COMMENT ON TABLE "public"."prices" IS 'Stores pricing information from Stripe.';



COMMENT ON COLUMN "public"."prices"."type" IS 'Type of the price, recurring or one-time.';



COMMENT ON COLUMN "public"."prices"."interval" IS 'Billing interval for recurring prices.';



CREATE TABLE IF NOT EXISTS "public"."products" (
    "id" "text" NOT NULL,
    "active" boolean,
    "name" "text",
    "description" "text",
    "metadata" "jsonb",
    "collective_id" "uuid"
);

ALTER TABLE ONLY "public"."products" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."products" OWNER TO "postgres";


COMMENT ON TABLE "public"."products" IS 'Stores product information from Stripe.';



CREATE TABLE IF NOT EXISTS "public"."recommendation_cache" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid",
    "cache_key" "text" NOT NULL,
    "cache_type" "text" NOT NULL,
    "recommendations" "jsonb" NOT NULL,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "algorithm_version" "text" DEFAULT 'v1'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "expires_at" timestamp with time zone DEFAULT ("now"() + '01:00:00'::interval),
    CONSTRAINT "recommendation_cache_cache_type_check" CHECK (("cache_type" = ANY (ARRAY['personalized'::"text", 'trending'::"text", 'related'::"text", 'popular'::"text", 'category'::"text"])))
);


ALTER TABLE "public"."recommendation_cache" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."recommendations" (
    "user_id" "uuid" NOT NULL,
    "suggested_collective_id" "uuid" NOT NULL,
    "score" double precision NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);

ALTER TABLE ONLY "public"."recommendations" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."recommendations" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."search_documents" AS
 SELECT 'collective'::"text" AS "document_type",
    "c"."id" AS "document_id",
    "c"."name" AS "title",
    "c"."description" AS "content_preview",
    "c"."tsv" AS "tsv_document"
   FROM "public"."collectives" "c"
UNION ALL
 SELECT 'user'::"text" AS "document_type",
    "u"."id" AS "document_id",
    "u"."full_name" AS "title",
    "u"."bio" AS "content_preview",
    "u"."tsv" AS "tsv_document"
   FROM "public"."users" "u"
UNION ALL
 SELECT 'post'::"text" AS "document_type",
    "p"."id" AS "document_id",
    "p"."title",
    "left"("p"."content", 200) AS "content_preview",
    "p"."tsv" AS "tsv_document"
   FROM "public"."posts" "p"
  WHERE (("p"."is_public" = true) AND ("p"."status" = 'active'::"public"."post_status_type"));


ALTER TABLE "public"."search_documents" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."subscription_plans" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "collective_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "stripe_price_id" "text" NOT NULL,
    "monthly_cost" numeric(10,2) NOT NULL,
    "benefits" "jsonb",
    "active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."subscription_plans" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."subscriptions" (
    "id" "text" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "status" "public"."subscription_status" NOT NULL,
    "stripe_price_id" "text",
    "target_entity_type" "public"."subscription_target_type" NOT NULL,
    "target_entity_id" "uuid" NOT NULL,
    "quantity" integer,
    "cancel_at_period_end" boolean DEFAULT false NOT NULL,
    "created" timestamp with time zone NOT NULL,
    "current_period_start" timestamp with time zone NOT NULL,
    "current_period_end" timestamp with time zone NOT NULL,
    "ended_at" timestamp with time zone,
    "cancel_at" timestamp with time zone,
    "canceled_at" timestamp with time zone,
    "trial_start" timestamp with time zone,
    "trial_end" timestamp with time zone,
    "metadata" "jsonb",
    "inserted_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);

ALTER TABLE ONLY "public"."subscriptions" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."subscriptions" OWNER TO "postgres";


COMMENT ON TABLE "public"."subscriptions" IS 'Stores subscription details from Stripe, linking a subscribing user to a target entity (user or collective).';



COMMENT ON COLUMN "public"."subscriptions"."user_id" IS 'The user who is subscribed.';



COMMENT ON COLUMN "public"."subscriptions"."stripe_price_id" IS 'The Stripe Price ID that this subscription instance pertains to.';



COMMENT ON COLUMN "public"."subscriptions"."target_entity_type" IS 'The type of entity being subscribed to (user or collective).';



COMMENT ON COLUMN "public"."subscriptions"."target_entity_id" IS 'The ID of the user or collective being subscribed to.';



CREATE OR REPLACE VIEW "public"."user_followers" AS
 SELECT "f"."following_id" AS "user_id",
    "f"."follower_id",
    "u"."full_name" AS "follower_name",
    "u"."username" AS "follower_username",
    "u"."avatar_url" AS "follower_avatar",
    "f"."created_at"
   FROM ("public"."follows" "f"
     JOIN "public"."users" "u" ON (("f"."follower_id" = "u"."id")))
  WHERE ("f"."following_type" = 'user'::"text");


ALTER TABLE "public"."user_followers" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."user_following" AS
 SELECT "f"."follower_id" AS "user_id",
    "f"."following_id",
    "f"."following_type",
        CASE
            WHEN ("f"."following_type" = 'user'::"text") THEN "u"."full_name"
            WHEN ("f"."following_type" = 'collective'::"text") THEN "c"."name"
            ELSE NULL::"text"
        END AS "following_name",
        CASE
            WHEN ("f"."following_type" = 'user'::"text") THEN "u"."username"
            WHEN ("f"."following_type" = 'collective'::"text") THEN "c"."slug"
            ELSE NULL::"text"
        END AS "following_identifier",
    "f"."created_at"
   FROM (("public"."follows" "f"
     LEFT JOIN "public"."users" "u" ON ((("f"."following_type" = 'user'::"text") AND ("f"."following_id" = "u"."id"))))
     LEFT JOIN "public"."collectives" "c" ON ((("f"."following_type" = 'collective'::"text") AND ("f"."following_id" = "c"."id"))));


ALTER TABLE "public"."user_following" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_preferences" (
    "user_id" "uuid" NOT NULL,
    "interested_topics" "text"[] DEFAULT '{}'::"text"[],
    "muted_topics" "text"[] DEFAULT '{}'::"text"[],
    "muted_authors" "uuid"[] DEFAULT '{}'::"uuid"[],
    "muted_collectives" "uuid"[] DEFAULT '{}'::"uuid"[],
    "content_type_weights" "jsonb" DEFAULT '{"audio": 0.2, "video": 0.4, "article": 0.4}'::"jsonb",
    "prefer_recent" boolean DEFAULT true,
    "prefer_popular" boolean DEFAULT false,
    "prefer_following" boolean DEFAULT true,
    "hide_seen_content" boolean DEFAULT false,
    "autoplay_videos" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."user_preferences" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."video_analytics" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "video_asset_id" "uuid",
    "live_stream_id" "uuid",
    "view_id" character varying(255),
    "viewer_user_id" "uuid",
    "watch_time" integer DEFAULT 0,
    "completion_rate" numeric(5,2),
    "quality_score" numeric(5,2),
    "startup_time" integer,
    "rebuffer_count" integer,
    "created_at" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "public"."video_analytics" OWNER TO "postgres";


ALTER TABLE ONLY "public"."agreements"
    ADD CONSTRAINT "agreements_party_a_type_party_a_id_party_b_type_party_b_id__key" UNIQUE ("party_a_type", "party_a_id", "party_b_type", "party_b_id", "agreement_type");



ALTER TABLE ONLY "public"."agreements"
    ADD CONSTRAINT "agreements_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."collective_invites"
    ADD CONSTRAINT "collective_invites_invite_code_key" UNIQUE ("invite_code");



ALTER TABLE ONLY "public"."collective_invites"
    ADD CONSTRAINT "collective_invites_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."collective_members"
    ADD CONSTRAINT "collective_members_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."collective_members"
    ADD CONSTRAINT "collective_members_unique_member" UNIQUE ("collective_id", "member_type", "member_id");



ALTER TABLE ONLY "public"."collectives"
    ADD CONSTRAINT "collectives_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."collectives"
    ADD CONSTRAINT "collectives_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."comment_reactions"
    ADD CONSTRAINT "comment_reactions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."comments"
    ADD CONSTRAINT "comments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."content_metadata"
    ADD CONSTRAINT "content_metadata_content_id_content_type_key" UNIQUE ("content_id", "content_type");



ALTER TABLE ONLY "public"."content_metadata"
    ADD CONSTRAINT "content_metadata_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."conversation_participants"
    ADD CONSTRAINT "conversation_participants_conversation_id_user_id_key" UNIQUE ("conversation_id", "user_id");



ALTER TABLE ONLY "public"."conversation_participants"
    ADD CONSTRAINT "conversation_participants_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."conversations"
    ADD CONSTRAINT "conversations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."customers"
    ADD CONSTRAINT "customers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."customers"
    ADD CONSTRAINT "customers_stripe_customer_id_key" UNIQUE ("stripe_customer_id");



ALTER TABLE ONLY "public"."featured_posts"
    ADD CONSTRAINT "featured_posts_owner_type_owner_id_post_id_key" UNIQUE ("owner_type", "owner_id", "post_id");



ALTER TABLE ONLY "public"."featured_posts"
    ADD CONSTRAINT "featured_posts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."follows"
    ADD CONSTRAINT "follows_pkey" PRIMARY KEY ("follower_id", "following_id", "following_type");



ALTER TABLE ONLY "public"."interactions"
    ADD CONSTRAINT "interactions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."live_streams"
    ADD CONSTRAINT "live_streams_mux_stream_id_key" UNIQUE ("mux_stream_id");



ALTER TABLE ONLY "public"."live_streams"
    ADD CONSTRAINT "live_streams_mux_stream_key_key" UNIQUE ("mux_stream_key");



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
    ADD CONSTRAINT "mux_webhooks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."notification_preferences"
    ADD CONSTRAINT "notification_preferences_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."notification_preferences"
    ADD CONSTRAINT "notification_preferences_user_id_notification_type_key" UNIQUE ("user_id", "notification_type");



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."post_bookmarks"
    ADD CONSTRAINT "post_bookmarks_pkey" PRIMARY KEY ("user_id", "post_id");



ALTER TABLE ONLY "public"."post_collectives"
    ADD CONSTRAINT "post_collectives_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."post_reactions"
    ADD CONSTRAINT "post_reactions_pkey" PRIMARY KEY ("user_id", "post_id");



ALTER TABLE ONLY "public"."post_views"
    ADD CONSTRAINT "post_views_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."posts"
    ADD CONSTRAINT "posts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."prices"
    ADD CONSTRAINT "prices_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."products"
    ADD CONSTRAINT "products_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."recommendation_cache"
    ADD CONSTRAINT "recommendation_cache_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."recommendation_cache"
    ADD CONSTRAINT "recommendation_cache_user_id_cache_key_algorithm_version_key" UNIQUE ("user_id", "cache_key", "algorithm_version");



ALTER TABLE ONLY "public"."recommendations"
    ADD CONSTRAINT "recommendations_pkey" PRIMARY KEY ("user_id", "suggested_collective_id");



ALTER TABLE ONLY "public"."subscription_plans"
    ADD CONSTRAINT "subscription_plans_collective_id_stripe_price_id_key" UNIQUE ("collective_id", "stripe_price_id");



ALTER TABLE ONLY "public"."subscription_plans"
    ADD CONSTRAINT "subscription_plans_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."subscriptions"
    ADD CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."follows"
    ADD CONSTRAINT "unique_follow_relationship" UNIQUE ("follower_id", "following_id", "following_type");



COMMENT ON CONSTRAINT "unique_follow_relationship" ON "public"."follows" IS 'Prevents duplicate follow relationships';



ALTER TABLE ONLY "public"."interactions"
    ADD CONSTRAINT "user_entity_interaction_unique" UNIQUE ("user_id", "entity_id", "entity_type", "interaction_type");



ALTER TABLE ONLY "public"."user_preferences"
    ADD CONSTRAINT "user_preferences_pkey" PRIMARY KEY ("user_id");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_username_key" UNIQUE ("username");



ALTER TABLE ONLY "public"."video_analytics"
    ADD CONSTRAINT "video_analytics_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."video_assets"
    ADD CONSTRAINT "video_assets_pkey" PRIMARY KEY ("id");



CREATE INDEX "collectives_name_idx" ON "public"."collectives" USING "btree" ("name");



CREATE INDEX "collectives_stripe_account_id_idx" ON "public"."collectives" USING "btree" ("stripe_account_id");



CREATE INDEX "collectives_tags_idx" ON "public"."collectives" USING "gin" ("tags");



CREATE INDEX "collectives_tsv_idx" ON "public"."collectives" USING "gin" ("tsv");



CREATE UNIQUE INDEX "comment_reactions_user_comment_unique" ON "public"."comment_reactions" USING "btree" ("user_id", "comment_id");



CREATE INDEX "comments_parent_id_idx" ON "public"."comments" USING "btree" ("parent_id");



CREATE INDEX "comments_post_id_idx" ON "public"."comments" USING "btree" ("post_id");



CREATE INDEX "idx_agreements_party_a" ON "public"."agreements" USING "btree" ("party_a_type", "party_a_id");



CREATE INDEX "idx_agreements_party_b" ON "public"."agreements" USING "btree" ("party_b_type", "party_b_id");



CREATE INDEX "idx_cache_expiry" ON "public"."recommendation_cache" USING "btree" ("expires_at");



CREATE INDEX "idx_cache_lookup" ON "public"."recommendation_cache" USING "btree" ("user_id", "cache_key", "expires_at");



CREATE INDEX "idx_collective_invites_collective_id" ON "public"."collective_invites" USING "btree" ("collective_id");



CREATE INDEX "idx_collective_invites_email" ON "public"."collective_invites" USING "btree" ("email");



CREATE INDEX "idx_collective_members_collective" ON "public"."collective_members" USING "btree" ("collective_id");



CREATE INDEX "idx_collective_members_member" ON "public"."collective_members" USING "btree" ("member_type", "member_id");



CREATE INDEX "idx_content_metadata_category" ON "public"."content_metadata" USING "btree" ("category");



CREATE INDEX "idx_content_metadata_created" ON "public"."content_metadata" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_content_metadata_popularity" ON "public"."content_metadata" USING "btree" ("popularity_score" DESC);



CREATE INDEX "idx_content_metadata_tags" ON "public"."content_metadata" USING "gin" ("tags");



CREATE INDEX "idx_content_metadata_type" ON "public"."content_metadata" USING "btree" ("content_type");



CREATE INDEX "idx_conversation_participants_conversation_id" ON "public"."conversation_participants" USING "btree" ("conversation_id");



CREATE INDEX "idx_conversation_participants_last_read_at" ON "public"."conversation_participants" USING "btree" ("last_read_at");



CREATE INDEX "idx_conversation_participants_user_id" ON "public"."conversation_participants" USING "btree" ("user_id");



CREATE INDEX "idx_conversations_created_by" ON "public"."conversations" USING "btree" ("created_by");



CREATE INDEX "idx_conversations_last_message_at" ON "public"."conversations" USING "btree" ("last_message_at" DESC);



CREATE INDEX "idx_conversations_updated_at" ON "public"."conversations" USING "btree" ("updated_at" DESC);



CREATE INDEX "idx_created_by_video_assets" ON "public"."video_assets" USING "btree" ("created_by");



CREATE INDEX "idx_event_type" ON "public"."mux_webhooks" USING "btree" ("event_type");



CREATE INDEX "idx_follows_collective_type" ON "public"."follows" USING "btree" ("following_id", "following_type") WHERE ("following_type" = 'collective'::"text");



CREATE INDEX "idx_follows_created_at" ON "public"."follows" USING "btree" ("created_at");



CREATE INDEX "idx_follows_follower_id" ON "public"."follows" USING "btree" ("follower_id");



CREATE INDEX "idx_follows_follower_type" ON "public"."follows" USING "btree" ("follower_id", "following_type");



CREATE INDEX "idx_follows_following_id" ON "public"."follows" USING "btree" ("following_id");



CREATE INDEX "idx_follows_following_id_type" ON "public"."follows" USING "btree" ("following_id", "following_type");



CREATE INDEX "idx_follows_following_type" ON "public"."follows" USING "btree" ("following_type");



CREATE INDEX "idx_follows_following_type_id" ON "public"."follows" USING "btree" ("following_type", "following_id");



CREATE INDEX "idx_follows_user_type" ON "public"."follows" USING "btree" ("following_id", "following_type") WHERE ("following_type" = 'user'::"text");



CREATE INDEX "idx_interactions_entity" ON "public"."interactions" USING "btree" ("entity_id", "entity_type", "interaction_type");



CREATE INDEX "idx_interactions_entity_id" ON "public"."interactions" USING "btree" ("entity_id");



CREATE INDEX "idx_interactions_user_entity" ON "public"."interactions" USING "btree" ("user_id", "entity_id", "entity_type", "interaction_type");



CREATE INDEX "idx_interactions_user_id" ON "public"."interactions" USING "btree" ("user_id");



CREATE INDEX "idx_likes_post_id" ON "public"."post_reactions" USING "btree" ("post_id");



CREATE INDEX "idx_likes_user_id" ON "public"."post_reactions" USING "btree" ("user_id");



CREATE INDEX "idx_live_stream_id" ON "public"."video_analytics" USING "btree" ("live_stream_id");



CREATE INDEX "idx_message_reactions_message_id" ON "public"."message_reactions" USING "btree" ("message_id");



CREATE INDEX "idx_message_reactions_user_id" ON "public"."message_reactions" USING "btree" ("user_id");



CREATE INDEX "idx_message_read_receipts_message_id" ON "public"."message_read_receipts" USING "btree" ("message_id");



CREATE INDEX "idx_message_read_receipts_user_id" ON "public"."message_read_receipts" USING "btree" ("user_id");



CREATE INDEX "idx_messages_conversation_id" ON "public"."messages" USING "btree" ("conversation_id");



CREATE INDEX "idx_messages_created_at" ON "public"."messages" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_messages_reply_to_id" ON "public"."messages" USING "btree" ("reply_to_id");



CREATE INDEX "idx_messages_sender_id" ON "public"."messages" USING "btree" ("sender_id");



CREATE INDEX "idx_mux_asset_id" ON "public"."video_assets" USING "btree" ("mux_asset_id");



CREATE INDEX "idx_mux_asset_id_webhooks" ON "public"."mux_webhooks" USING "btree" ("mux_asset_id");



CREATE INDEX "idx_mux_stream_id" ON "public"."live_streams" USING "btree" ("mux_stream_id");



CREATE INDEX "idx_notification_preferences_type" ON "public"."notification_preferences" USING "btree" ("notification_type");



CREATE INDEX "idx_notification_preferences_user_id" ON "public"."notification_preferences" USING "btree" ("user_id");



CREATE INDEX "idx_notifications_actor_id" ON "public"."notifications" USING "btree" ("actor_id");



CREATE INDEX "idx_notifications_created_at" ON "public"."notifications" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_notifications_entity" ON "public"."notifications" USING "btree" ("entity_type", "entity_id");



CREATE INDEX "idx_notifications_read_at" ON "public"."notifications" USING "btree" ("read_at");



CREATE INDEX "idx_notifications_recipient_id" ON "public"."notifications" USING "btree" ("recipient_id");



CREATE INDEX "idx_notifications_type" ON "public"."notifications" USING "btree" ("type");



CREATE INDEX "idx_posts_author_id" ON "public"."posts" USING "btree" ("author_id");



CREATE INDEX "idx_posts_author_personal" ON "public"."posts" USING "btree" ("author_id", "created_at") WHERE ("collective_id" IS NULL);



CREATE INDEX "idx_posts_author_published_month" ON "public"."posts" USING "btree" ("author_id", "published_at") WHERE ("published_at" IS NOT NULL);



CREATE INDEX "idx_posts_collective_id" ON "public"."posts" USING "btree" ("collective_id");



CREATE INDEX "idx_posts_metadata_gin" ON "public"."posts" USING "gin" ("metadata");



CREATE INDEX "idx_posts_post_type" ON "public"."posts" USING "btree" ("post_type");



CREATE INDEX "idx_posts_status" ON "public"."posts" USING "btree" ("status");



CREATE INDEX "idx_posts_updated_at" ON "public"."posts" USING "btree" ("updated_at");



CREATE INDEX "idx_processed" ON "public"."mux_webhooks" USING "btree" ("processed");



CREATE INDEX "idx_products_collective_id" ON "public"."products" USING "btree" ("collective_id");



CREATE INDEX "idx_recommendations_user_score_high" ON "public"."recommendations" USING "btree" ("user_id", "score" DESC) WHERE ("score" > (0.2)::double precision);



CREATE INDEX "idx_status_live_streams" ON "public"."live_streams" USING "btree" ("status");



CREATE INDEX "idx_status_video_assets" ON "public"."video_assets" USING "btree" ("status");



CREATE INDEX "idx_subscriptions_status" ON "public"."subscriptions" USING "btree" ("status");



CREATE INDEX "idx_subscriptions_target" ON "public"."subscriptions" USING "btree" ("target_entity_type", "target_entity_id");



CREATE INDEX "idx_subscriptions_target_entity" ON "public"."subscriptions" USING "btree" ("target_entity_type", "target_entity_id");



CREATE INDEX "idx_subscriptions_target_entity_id" ON "public"."subscriptions" USING "btree" ("target_entity_id");



CREATE INDEX "idx_subscriptions_target_status" ON "public"."subscriptions" USING "btree" ("target_entity_type", "target_entity_id", "status");



CREATE INDEX "idx_subscriptions_target_user_active" ON "public"."subscriptions" USING "btree" ("target_entity_id", "target_entity_type", "status") WHERE (("target_entity_type" = 'user'::"public"."subscription_target_type") AND ("status" = 'active'::"public"."subscription_status"));



CREATE INDEX "idx_subscriptions_user_id" ON "public"."subscriptions" USING "btree" ("user_id");



CREATE INDEX "idx_subscriptions_user_target" ON "public"."subscriptions" USING "btree" ("user_id", "target_entity_type", "target_entity_id");



CREATE UNIQUE INDEX "idx_unique_collective_user_member" ON "public"."collective_members" USING "btree" ("collective_id", "member_id");



CREATE UNIQUE INDEX "idx_users_username_unique" ON "public"."users" USING "btree" ("username");



CREATE INDEX "idx_video_asset_id" ON "public"."video_analytics" USING "btree" ("video_asset_id");



CREATE INDEX "idx_video_assets_mux_upload_id" ON "public"."video_assets" USING "btree" ("mux_upload_id");



CREATE INDEX "idx_viewer_user_id" ON "public"."video_analytics" USING "btree" ("viewer_user_id");



CREATE UNIQUE INDEX "post_reactions_user_post_unique" ON "public"."post_reactions" USING "btree" ("user_id", "post_id");



CREATE INDEX "post_views_post_id_idx" ON "public"."post_views" USING "btree" ("post_id");



CREATE INDEX "posts_tsv_idx" ON "public"."posts" USING "gin" ("tsv");



CREATE INDEX "subscriptions_target_idx" ON "public"."subscriptions" USING "btree" ("target_entity_type", "target_entity_id");



CREATE INDEX "users_full_name_idx" ON "public"."users" USING "btree" ("full_name");



CREATE INDEX "users_tsv_idx" ON "public"."users" USING "gin" ("tsv");



CREATE UNIQUE INDEX "video_assets_mux_asset_id_unique" ON "public"."video_assets" USING "btree" ("mux_asset_id") WHERE ("mux_asset_id" IS NOT NULL);



CREATE OR REPLACE TRIGGER "before_insert_or_update_collective_subscription" BEFORE INSERT OR UPDATE ON "public"."subscriptions" FOR EACH ROW EXECUTE FUNCTION "public"."validate_collective_subscription"();



CREATE OR REPLACE TRIGGER "on_collective_members_update" BEFORE UPDATE ON "public"."collective_members" FOR EACH ROW EXECUTE FUNCTION "public"."update_collective_members_updated_at"();



CREATE OR REPLACE TRIGGER "on_like_delete_update_post_like_count" AFTER DELETE ON "public"."post_reactions" FOR EACH ROW EXECUTE FUNCTION "public"."update_post_like_count"();



CREATE OR REPLACE TRIGGER "on_like_insert_update_post_like_count" AFTER INSERT ON "public"."post_reactions" FOR EACH ROW EXECUTE FUNCTION "public"."update_post_like_count"();



CREATE OR REPLACE TRIGGER "posts_count_trigger" AFTER INSERT OR DELETE ON "public"."posts" FOR EACH ROW EXECUTE FUNCTION "public"."update_user_post_count"();



CREATE OR REPLACE TRIGGER "trg_set_updated_at_agreements" BEFORE UPDATE ON "public"."agreements" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at_agreements"();



CREATE OR REPLACE TRIGGER "trg_set_updated_at_collectives" BEFORE UPDATE ON "public"."collectives" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at_collectives"();



CREATE OR REPLACE TRIGGER "trg_set_updated_at_users" BEFORE UPDATE ON "public"."users" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at_users"();



CREATE OR REPLACE TRIGGER "trigger_bookmark_notification" AFTER INSERT ON "public"."post_bookmarks" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_bookmark_notification"();



CREATE OR REPLACE TRIGGER "trigger_comment_notification" AFTER INSERT ON "public"."comments" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_comment_notification"();



CREATE OR REPLACE TRIGGER "trigger_follow_notification" AFTER INSERT ON "public"."follows" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_follow_notification"();



CREATE OR REPLACE TRIGGER "trigger_post_like_notification" AFTER INSERT ON "public"."post_reactions" FOR EACH ROW WHEN (("new"."type" = 'like'::"text")) EXECUTE FUNCTION "public"."trigger_post_like_notification"();



CREATE OR REPLACE TRIGGER "tsvector_update_collectives" BEFORE INSERT OR UPDATE ON "public"."collectives" FOR EACH ROW EXECUTE FUNCTION "public"."update_collectives_tsv"();



CREATE OR REPLACE TRIGGER "tsvector_update_posts" BEFORE INSERT OR UPDATE ON "public"."posts" FOR EACH ROW EXECUTE FUNCTION "public"."update_posts_tsv"();



CREATE OR REPLACE TRIGGER "tsvector_update_users" BEFORE INSERT OR UPDATE ON "public"."users" FOR EACH ROW EXECUTE FUNCTION "public"."update_users_tsv"();



CREATE OR REPLACE TRIGGER "update_content_metadata_updated_at" BEFORE UPDATE ON "public"."content_metadata" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_conversation_last_message_trigger" AFTER INSERT ON "public"."messages" FOR EACH ROW EXECUTE FUNCTION "public"."update_conversation_last_message"();



CREATE OR REPLACE TRIGGER "update_user_preferences_updated_at" BEFORE UPDATE ON "public"."user_preferences" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_video_assets_updated_at" BEFORE UPDATE ON "public"."video_assets" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "validate_follows_target_trigger" BEFORE INSERT OR UPDATE ON "public"."follows" FOR EACH ROW EXECUTE FUNCTION "public"."validate_follows_target"();



ALTER TABLE ONLY "public"."collective_invites"
    ADD CONSTRAINT "collective_invites_collective_id_fkey" FOREIGN KEY ("collective_id") REFERENCES "public"."collectives"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."collective_invites"
    ADD CONSTRAINT "collective_invites_invited_by_user_id_fkey" FOREIGN KEY ("invited_by_user_id") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."collective_members"
    ADD CONSTRAINT "collective_members_collective_id_fkey" FOREIGN KEY ("collective_id") REFERENCES "public"."collectives"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."collective_members"
    ADD CONSTRAINT "collective_members_user_id_fkey" FOREIGN KEY ("member_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."collectives"
    ADD CONSTRAINT "collectives_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."collectives"
    ADD CONSTRAINT "collectives_pinned_post_id_fkey" FOREIGN KEY ("pinned_post_id") REFERENCES "public"."posts"("id");



ALTER TABLE ONLY "public"."comment_reactions"
    ADD CONSTRAINT "comment_reactions_comment_id_fkey" FOREIGN KEY ("comment_id") REFERENCES "public"."comments"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."comment_reactions"
    ADD CONSTRAINT "comment_reactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."comments"
    ADD CONSTRAINT "comments_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "public"."comments"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."comments"
    ADD CONSTRAINT "comments_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."comments"
    ADD CONSTRAINT "comments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."conversation_participants"
    ADD CONSTRAINT "conversation_participants_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."conversation_participants"
    ADD CONSTRAINT "conversation_participants_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."conversations"
    ADD CONSTRAINT "conversations_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."customers"
    ADD CONSTRAINT "customers_id_fkey" FOREIGN KEY ("id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."featured_posts"
    ADD CONSTRAINT "featured_posts_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."follows"
    ADD CONSTRAINT "follows_follower_id_fkey" FOREIGN KEY ("follower_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."interactions"
    ADD CONSTRAINT "interactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."post_reactions"
    ADD CONSTRAINT "likes_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."post_reactions"
    ADD CONSTRAINT "likes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."live_streams"
    ADD CONSTRAINT "live_streams_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id");



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



ALTER TABLE ONLY "public"."notification_preferences"
    ADD CONSTRAINT "notification_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_recipient_id_fkey" FOREIGN KEY ("recipient_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."post_bookmarks"
    ADD CONSTRAINT "post_bookmarks_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."post_bookmarks"
    ADD CONSTRAINT "post_bookmarks_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."post_collectives"
    ADD CONSTRAINT "post_collectives_collective_id_fkey" FOREIGN KEY ("collective_id") REFERENCES "public"."collectives"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."post_collectives"
    ADD CONSTRAINT "post_collectives_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."post_collectives"
    ADD CONSTRAINT "post_collectives_shared_by_fkey" FOREIGN KEY ("shared_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."post_views"
    ADD CONSTRAINT "post_views_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."post_views"
    ADD CONSTRAINT "post_views_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."posts"
    ADD CONSTRAINT "posts_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."posts"
    ADD CONSTRAINT "posts_collective_id_fkey" FOREIGN KEY ("collective_id") REFERENCES "public"."collectives"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."prices"
    ADD CONSTRAINT "prices_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id");



ALTER TABLE ONLY "public"."products"
    ADD CONSTRAINT "products_collective_id_fkey" FOREIGN KEY ("collective_id") REFERENCES "public"."collectives"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."recommendation_cache"
    ADD CONSTRAINT "recommendation_cache_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."recommendations"
    ADD CONSTRAINT "recommendations_suggested_collective_id_fkey" FOREIGN KEY ("suggested_collective_id") REFERENCES "public"."collectives"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."recommendations"
    ADD CONSTRAINT "recommendations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."subscription_plans"
    ADD CONSTRAINT "subscription_plans_collective_id_fkey" FOREIGN KEY ("collective_id") REFERENCES "public"."collectives"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."subscriptions"
    ADD CONSTRAINT "subscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_preferences"
    ADD CONSTRAINT "user_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_pinned_post_id_fkey" FOREIGN KEY ("pinned_post_id") REFERENCES "public"."posts"("id");



ALTER TABLE ONLY "public"."video_analytics"
    ADD CONSTRAINT "video_analytics_live_stream_id_fkey" FOREIGN KEY ("live_stream_id") REFERENCES "public"."live_streams"("id");



ALTER TABLE ONLY "public"."video_analytics"
    ADD CONSTRAINT "video_analytics_video_asset_id_fkey" FOREIGN KEY ("video_asset_id") REFERENCES "public"."video_assets"("id");



ALTER TABLE ONLY "public"."video_analytics"
    ADD CONSTRAINT "video_analytics_viewer_user_id_fkey" FOREIGN KEY ("viewer_user_id") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."video_assets"
    ADD CONSTRAINT "video_assets_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id");



CREATE POLICY "Admins can manage participants safely" ON "public"."conversation_participants" USING ((("auth"."uid"() = "user_id") OR (EXISTS ( SELECT 1
   FROM "public"."conversation_participants" "admin_check"
  WHERE (("admin_check"."conversation_id" = "conversation_participants"."conversation_id") AND ("admin_check"."user_id" = "auth"."uid"()) AND (("admin_check"."role")::"text" = 'admin'::"text"))))));



CREATE POLICY "Allow authenticated users to insert posts" ON "public"."posts" FOR INSERT WITH CHECK (("auth"."uid"() = "author_id"));



CREATE POLICY "Allow authors to read their own posts" ON "public"."posts" FOR SELECT USING (("auth"."uid"() = "author_id"));



CREATE POLICY "Allow authors to soft-delete their own posts" ON "public"."posts" FOR UPDATE USING (("auth"."uid"() = "author_id")) WITH CHECK ((("auth"."uid"() = "author_id") AND ("status" = 'removed'::"public"."post_status_type")));



CREATE POLICY "Allow authors to update their own posts" ON "public"."posts" FOR UPDATE USING (("auth"."uid"() = "author_id")) WITH CHECK (("auth"."uid"() = "author_id"));



CREATE POLICY "Allow collective owners to insert new members" ON "public"."collective_members" FOR INSERT WITH CHECK ((( SELECT "cm"."role"
   FROM "public"."collective_members" "cm"
  WHERE (("cm"."collective_id" = "collective_members"."collective_id") AND ("cm"."member_id" = "auth"."uid"()))) = 'owner'::"public"."collective_member_role"));



CREATE POLICY "Allow collective owners to remove other non-owner members" ON "public"."collective_members" FOR DELETE USING (((( SELECT "cm"."role"
   FROM "public"."collective_members" "cm"
  WHERE (("cm"."collective_id" = "collective_members"."collective_id") AND ("cm"."member_id" = "auth"."uid"()))) = 'owner'::"public"."collective_member_role") AND ("role" <> 'owner'::"public"."collective_member_role") AND ("auth"."uid"() <> "member_id")));



CREATE POLICY "Allow collective owners to update member roles" ON "public"."collective_members" FOR UPDATE USING ((( SELECT "cm"."role"
   FROM "public"."collective_members" "cm"
  WHERE (("cm"."collective_id" = "collective_members"."collective_id") AND ("cm"."member_id" = "auth"."uid"()))) = 'owner'::"public"."collective_member_role")) WITH CHECK (((( SELECT "cm"."role"
   FROM "public"."collective_members" "cm"
  WHERE (("cm"."collective_id" = "collective_members"."collective_id") AND ("cm"."member_id" = "auth"."uid"()))) = 'owner'::"public"."collective_member_role") AND ("auth"."uid"() <> "member_id")));



CREATE POLICY "Allow collective owners/editors to read collective posts" ON "public"."posts" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."collective_members" "cm"
  WHERE (("cm"."collective_id" = "posts"."collective_id") AND ("cm"."member_id" = "auth"."uid"()) AND ("cm"."role" = ANY (ARRAY['owner'::"public"."collective_member_role", 'editor'::"public"."collective_member_role"]))))));



CREATE POLICY "Allow collective owners/editors to soft-delete collective posts" ON "public"."posts" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."collective_members" "cm"
  WHERE (("cm"."collective_id" = "posts"."collective_id") AND ("cm"."member_id" = "auth"."uid"()) AND ("cm"."role" = ANY (ARRAY['owner'::"public"."collective_member_role", 'editor'::"public"."collective_member_role"])))))) WITH CHECK (((EXISTS ( SELECT 1
   FROM "public"."collective_members" "cm"
  WHERE (("cm"."collective_id" = "posts"."collective_id") AND ("cm"."member_id" = "auth"."uid"()) AND ("cm"."role" = ANY (ARRAY['owner'::"public"."collective_member_role", 'editor'::"public"."collective_member_role"]))))) AND ("status" = 'removed'::"public"."post_status_type")));



CREATE POLICY "Allow collective owners/editors to update collective posts" ON "public"."posts" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."collective_members" "cm"
  WHERE (("cm"."collective_id" = "posts"."collective_id") AND ("cm"."member_id" = "auth"."uid"()) AND ("cm"."role" = ANY (ARRAY['owner'::"public"."collective_member_role", 'editor'::"public"."collective_member_role"])))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."collective_members" "cm"
  WHERE (("cm"."collective_id" = "posts"."collective_id") AND ("cm"."member_id" = "auth"."uid"()) AND ("cm"."role" = ANY (ARRAY['owner'::"public"."collective_member_role", 'editor'::"public"."collective_member_role"]))))));



CREATE POLICY "Allow individual members to view their own membership" ON "public"."collective_members" FOR SELECT USING (("auth"."uid"() = "member_id"));



CREATE POLICY "Allow members to remove themselves" ON "public"."collective_members" FOR DELETE USING (("auth"."uid"() = "member_id"));



CREATE POLICY "Allow public read" ON "public"."users" FOR SELECT USING (true);



CREATE POLICY "Allow public read access for active and public posts" ON "public"."posts" FOR SELECT USING ((("is_public" = true) AND ("status" = 'active'::"public"."post_status_type")));



CREATE POLICY "Allow public read access to collective members" ON "public"."collective_members" FOR SELECT USING (true);



CREATE POLICY "Content metadata is viewable by everyone" ON "public"."content_metadata" FOR SELECT USING (true);



CREATE POLICY "Conversation admins can update conversations" ON "public"."conversations" FOR UPDATE USING (("auth"."uid"() IN ( SELECT "cp"."user_id"
   FROM "public"."conversation_participants" "cp"
  WHERE (("cp"."conversation_id" = "conversations"."id") AND (("cp"."role")::"text" = 'admin'::"text")))));



CREATE POLICY "Follows are publicly viewable" ON "public"."follows" FOR SELECT USING (true);



CREATE POLICY "Only service role can manage cache" ON "public"."recommendation_cache" USING ((("auth"."jwt"() ->> 'role'::"text") = 'service_role'::"text"));



CREATE POLICY "Participants can view all participants in their conversations" ON "public"."conversation_participants" FOR SELECT USING (("auth"."uid"() IN ( SELECT "cp"."user_id"
   FROM "public"."conversation_participants" "cp"
  WHERE ("cp"."conversation_id" = "conversation_participants"."conversation_id"))));



CREATE POLICY "Service role can manage metadata" ON "public"."content_metadata" USING ((("auth"."jwt"() ->> 'role'::"text") = 'service_role'::"text"));



CREATE POLICY "Service role has full access" ON "public"."video_assets" USING (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "User can read own profile" ON "public"."users" FOR SELECT USING (("auth"."uid"() = "id"));



CREATE POLICY "Users can add themselves to conversations" ON "public"."conversation_participants" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can create conversations" ON "public"."conversations" FOR INSERT WITH CHECK (("auth"."uid"() = "created_by"));



CREATE POLICY "Users can delete own comments" ON "public"."comments" FOR DELETE TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete own videos" ON "public"."video_assets" FOR DELETE USING (("auth"."uid"() = "created_by"));



CREATE POLICY "Users can delete their own notification preferences" ON "public"."notification_preferences" FOR DELETE USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can edit their own messages" ON "public"."messages" FOR UPDATE USING (("auth"."uid"() = "sender_id"));



CREATE POLICY "Users can follow others" ON "public"."follows" FOR INSERT WITH CHECK ((("auth"."uid"() = "follower_id") AND ("auth"."uid"() IS NOT NULL)));



CREATE POLICY "Users can insert comments" ON "public"."comments" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert own videos" ON "public"."video_assets" FOR INSERT WITH CHECK (("auth"."uid"() = "created_by"));



CREATE POLICY "Users can insert their own notification preferences" ON "public"."notification_preferences" FOR INSERT WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can insert their own video assets" ON "public"."video_assets" FOR INSERT WITH CHECK ((("auth"."uid"() = "created_by") AND (("mux_upload_id" IS NOT NULL) OR ("mux_asset_id" IS NOT NULL))));



CREATE POLICY "Users can manage their own reactions" ON "public"."message_reactions" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can manage their own read receipts" ON "public"."message_read_receipts" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can read comments" ON "public"."comments" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Users can send messages to their conversations" ON "public"."messages" FOR INSERT WITH CHECK ((("auth"."uid"() = "sender_id") AND ("auth"."uid"() IN ( SELECT "cp"."user_id"
   FROM "public"."conversation_participants" "cp"
  WHERE ("cp"."conversation_id" = "messages"."conversation_id")))));



CREATE POLICY "Users can unfollow" ON "public"."follows" FOR DELETE USING ((("auth"."uid"() = "follower_id") AND ("auth"."uid"() IS NOT NULL)));



CREATE POLICY "Users can update own comments" ON "public"."comments" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update own videos" ON "public"."video_assets" FOR UPDATE USING (("auth"."uid"() = "created_by"));



CREATE POLICY "Users can update their own notification preferences" ON "public"."notification_preferences" FOR UPDATE USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can update their own notifications" ON "public"."notifications" FOR UPDATE USING (("recipient_id" = "auth"."uid"()));



CREATE POLICY "Users can update their own participant record" ON "public"."conversation_participants" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view conversations they participate in" ON "public"."conversations" FOR SELECT USING (("auth"."uid"() IN ( SELECT "cp"."user_id"
   FROM "public"."conversation_participants" "cp"
  WHERE ("cp"."conversation_id" = "conversations"."id"))));



CREATE POLICY "Users can view messages in their conversations" ON "public"."messages" FOR SELECT USING (("auth"."uid"() IN ( SELECT "cp"."user_id"
   FROM "public"."conversation_participants" "cp"
  WHERE ("cp"."conversation_id" = "messages"."conversation_id"))));



CREATE POLICY "Users can view own videos" ON "public"."video_assets" FOR SELECT USING (("auth"."uid"() = "created_by"));



CREATE POLICY "Users can view reactions in their conversations" ON "public"."message_reactions" FOR SELECT USING (("auth"."uid"() IN ( SELECT "cp"."user_id"
   FROM ("public"."conversation_participants" "cp"
     JOIN "public"."messages" "m" ON (("m"."conversation_id" = "cp"."conversation_id")))
  WHERE ("m"."id" = "message_reactions"."message_id"))));



CREATE POLICY "Users can view read receipts in their conversations" ON "public"."message_read_receipts" FOR SELECT USING (("auth"."uid"() IN ( SELECT "cp"."user_id"
   FROM ("public"."conversation_participants" "cp"
     JOIN "public"."messages" "m" ON (("m"."conversation_id" = "cp"."conversation_id")))
  WHERE ("m"."id" = "message_read_receipts"."message_id"))));



CREATE POLICY "Users can view their own notification preferences" ON "public"."notification_preferences" FOR SELECT USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can view their own notifications" ON "public"."notifications" FOR SELECT USING (("recipient_id" = "auth"."uid"()));



CREATE POLICY "Users manage own preferences" ON "public"."user_preferences" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "admin_all_access_on_interactions" ON "public"."interactions" USING (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "admin_manage_recommendations" ON "public"."recommendations" USING (("auth"."role"() = 'service_role'::"text"));



ALTER TABLE "public"."collective_members" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."collectives" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."comment_reactions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."comments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."content_metadata" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."customers" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "delete_own_authored_or_collective_posts" ON "public"."posts" FOR DELETE USING ((("auth"."uid"() = "author_id") OR (EXISTS ( SELECT 1
   FROM "public"."collectives" "c"
  WHERE (("c"."id" = "posts"."collective_id") AND ("c"."owner_id" = "auth"."uid"()))))));



ALTER TABLE "public"."follows" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "insert_posts" ON "public"."posts" FOR INSERT WITH CHECK ((("auth"."uid"() = "author_id") AND (("collective_id" IS NULL) OR (("collective_id" IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM "public"."collective_members" "cm"
  WHERE (("cm"."collective_id" = "posts"."collective_id") AND ("cm"."member_id" = "auth"."uid"()) AND ("cm"."role" = ANY (ARRAY['admin'::"public"."collective_member_role", 'editor'::"public"."collective_member_role", 'author'::"public"."collective_member_role"])))))) OR (("collective_id" IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM "public"."collectives" "c"
  WHERE (("c"."id" = "posts"."collective_id") AND ("c"."owner_id" = "auth"."uid"()))))))));



ALTER TABLE "public"."interactions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "manage_own_collectives" ON "public"."collectives" USING (("auth"."uid"() = "owner_id")) WITH CHECK (("auth"."uid"() = "owner_id"));



CREATE POLICY "manage_own_likes" ON "public"."post_reactions" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."notification_preferences" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."notifications" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "owner_can_add" ON "public"."collective_members" FOR INSERT WITH CHECK ("public"."is_collective_owner"("collective_id"));



CREATE POLICY "owner_manage_collective_members" ON "public"."collective_members" USING (("auth"."uid"() IN ( SELECT "collectives"."owner_id"
   FROM "public"."collectives"
  WHERE ("collectives"."id" = "collective_members"."collective_id")))) WITH CHECK (("auth"."uid"() IN ( SELECT "collectives"."owner_id"
   FROM "public"."collectives"
  WHERE ("collectives"."id" = "collective_members"."collective_id"))));



ALTER TABLE "public"."post_bookmarks" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."post_reactions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."post_views" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."posts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."prices" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."products" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."recommendation_cache" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."recommendations" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "select_all_collectives" ON "public"."collectives" FOR SELECT USING (true);



CREATE POLICY "select_all_follows" ON "public"."follows" FOR SELECT USING (true);



CREATE POLICY "select_all_likes" ON "public"."post_reactions" FOR SELECT USING (true);



CREATE POLICY "select_all_prices" ON "public"."prices" FOR SELECT USING (true);



CREATE POLICY "select_all_products" ON "public"."products" FOR SELECT USING (true);



CREATE POLICY "select_own_customer_record" ON "public"."customers" FOR SELECT USING (("auth"."uid"() = "id"));



CREATE POLICY "select_own_memberships" ON "public"."collective_members" FOR SELECT USING (("auth"."uid"() = "member_id"));



CREATE POLICY "select_own_recommendations" ON "public"."recommendations" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "select_own_subscriptions" ON "public"."subscriptions" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "select_own_user" ON "public"."users" FOR SELECT USING (("auth"."uid"() = "id"));



CREATE POLICY "select_posts" ON "public"."posts" FOR SELECT USING (((("is_public" = true) AND ("published_at" IS NOT NULL)) OR ("auth"."uid"() = "author_id") OR (EXISTS ( SELECT 1
   FROM "public"."collectives" "c"
  WHERE (("c"."id" = "posts"."collective_id") AND ("c"."owner_id" = "auth"."uid"())))) OR (("is_public" = false) AND ("published_at" IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM "public"."subscriptions" "s"
  WHERE (("s"."user_id" = "auth"."uid"()) AND ("s"."status" = ANY (ARRAY['active'::"public"."subscription_status", 'trialing'::"public"."subscription_status"])) AND ((("posts"."collective_id" IS NULL) AND ("s"."target_entity_type" = 'user'::"public"."subscription_target_type") AND ("s"."target_entity_id" = "posts"."author_id")) OR (("posts"."collective_id" IS NOT NULL) AND ("s"."target_entity_type" = 'collective'::"public"."subscription_target_type") AND ("s"."target_entity_id" = "posts"."collective_id")))))))));



CREATE POLICY "select_subscribers_for_target_entity" ON "public"."subscriptions" FOR SELECT USING (((("target_entity_type" = 'user'::"public"."subscription_target_type") AND ("target_entity_id" = "auth"."uid"())) OR (("target_entity_type" = 'collective'::"public"."subscription_target_type") AND (EXISTS ( SELECT 1
   FROM "public"."collectives" "c"
  WHERE (("c"."id" = "subscriptions"."target_entity_id") AND ("c"."owner_id" = "auth"."uid"())))))));



ALTER TABLE "public"."subscriptions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "update_own_authored_or_collective_posts" ON "public"."posts" FOR UPDATE USING ((("auth"."uid"() = "author_id") OR (EXISTS ( SELECT 1
   FROM "public"."collectives" "c"
  WHERE (("c"."id" = "posts"."collective_id") AND ("c"."owner_id" = "auth"."uid"())))))) WITH CHECK ((("auth"."uid"() = "author_id") OR (EXISTS ( SELECT 1
   FROM "public"."collectives" "c"
  WHERE (("c"."id" = "posts"."collective_id") AND ("c"."owner_id" = "auth"."uid"()))))));



CREATE POLICY "update_own_profile_details" ON "public"."users" FOR UPDATE USING (("auth"."uid"() = "id")) WITH CHECK (("auth"."uid"() = "id"));



CREATE POLICY "update_own_user" ON "public"."users" FOR UPDATE USING (("auth"."uid"() = "id")) WITH CHECK (("auth"."uid"() = "id"));



CREATE POLICY "user_can_follow" ON "public"."follows" FOR INSERT WITH CHECK (("auth"."uid"() = "follower_id"));



CREATE POLICY "user_can_insert_own_interaction" ON "public"."interactions" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "user_can_read_own_interactions" ON "public"."interactions" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "user_can_unfollow" ON "public"."follows" FOR DELETE USING (("auth"."uid"() = "follower_id"));



ALTER TABLE "public"."user_preferences" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."users" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."video_assets" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";






ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."conversation_participants";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."conversations";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."message_reactions";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."messages";



GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_in"("cstring", "oid", integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_in"("cstring", "oid", integer) TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_in"("cstring", "oid", integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_in"("cstring", "oid", integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_out"("public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_out"("public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_out"("public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_out"("public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_recv"("internal", "oid", integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_recv"("internal", "oid", integer) TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_recv"("internal", "oid", integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_recv"("internal", "oid", integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_send"("public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_send"("public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_send"("public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_send"("public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_typmod_in"("cstring"[]) TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_typmod_in"("cstring"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_typmod_in"("cstring"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_typmod_in"("cstring"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_in"("cstring", "oid", integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_in"("cstring", "oid", integer) TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_in"("cstring", "oid", integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_in"("cstring", "oid", integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_out"("public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_out"("public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_out"("public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_out"("public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_recv"("internal", "oid", integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_recv"("internal", "oid", integer) TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_recv"("internal", "oid", integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_recv"("internal", "oid", integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_send"("public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_send"("public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_send"("public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_send"("public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_typmod_in"("cstring"[]) TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_typmod_in"("cstring"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_typmod_in"("cstring"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_typmod_in"("cstring"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_in"("cstring", "oid", integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_in"("cstring", "oid", integer) TO "anon";
GRANT ALL ON FUNCTION "public"."vector_in"("cstring", "oid", integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_in"("cstring", "oid", integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_out"("public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_out"("public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_out"("public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_out"("public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_recv"("internal", "oid", integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_recv"("internal", "oid", integer) TO "anon";
GRANT ALL ON FUNCTION "public"."vector_recv"("internal", "oid", integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_recv"("internal", "oid", integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_send"("public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_send"("public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_send"("public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_send"("public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_typmod_in"("cstring"[]) TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_typmod_in"("cstring"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."vector_typmod_in"("cstring"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_typmod_in"("cstring"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_halfvec"(real[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(real[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(real[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(real[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(real[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(real[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(real[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(real[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_vector"(real[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_vector"(real[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_vector"(real[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_vector"(real[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_halfvec"(double precision[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(double precision[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(double precision[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(double precision[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(double precision[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(double precision[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(double precision[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(double precision[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_vector"(double precision[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_vector"(double precision[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_vector"(double precision[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_vector"(double precision[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_halfvec"(integer[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(integer[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(integer[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(integer[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(integer[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(integer[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(integer[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(integer[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_vector"(integer[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_vector"(integer[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_vector"(integer[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_vector"(integer[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_halfvec"(numeric[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(numeric[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(numeric[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(numeric[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(numeric[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(numeric[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(numeric[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(numeric[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_vector"(numeric[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_vector"(numeric[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_vector"(numeric[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_vector"(numeric[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_to_float4"("public"."halfvec", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_to_float4"("public"."halfvec", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_to_float4"("public"."halfvec", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_to_float4"("public"."halfvec", integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec"("public"."halfvec", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec"("public"."halfvec", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec"("public"."halfvec", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec"("public"."halfvec", integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_to_sparsevec"("public"."halfvec", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_to_sparsevec"("public"."halfvec", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_to_sparsevec"("public"."halfvec", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_to_sparsevec"("public"."halfvec", integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_to_vector"("public"."halfvec", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_to_vector"("public"."halfvec", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_to_vector"("public"."halfvec", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_to_vector"("public"."halfvec", integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_to_halfvec"("public"."sparsevec", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_to_halfvec"("public"."sparsevec", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_to_halfvec"("public"."sparsevec", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_to_halfvec"("public"."sparsevec", integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec"("public"."sparsevec", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec"("public"."sparsevec", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec"("public"."sparsevec", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec"("public"."sparsevec", integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_to_vector"("public"."sparsevec", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_to_vector"("public"."sparsevec", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_to_vector"("public"."sparsevec", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_to_vector"("public"."sparsevec", integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_to_float4"("public"."vector", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_to_float4"("public"."vector", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."vector_to_float4"("public"."vector", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_to_float4"("public"."vector", integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_to_halfvec"("public"."vector", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_to_halfvec"("public"."vector", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."vector_to_halfvec"("public"."vector", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_to_halfvec"("public"."vector", integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_to_sparsevec"("public"."vector", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_to_sparsevec"("public"."vector", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."vector_to_sparsevec"("public"."vector", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_to_sparsevec"("public"."vector", integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."vector"("public"."vector", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."vector"("public"."vector", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."vector"("public"."vector", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector"("public"."vector", integer, boolean) TO "service_role";











































































































































































GRANT ALL ON FUNCTION "public"."binary_quantize"("public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."binary_quantize"("public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."binary_quantize"("public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."binary_quantize"("public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."binary_quantize"("public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."binary_quantize"("public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."binary_quantize"("public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."binary_quantize"("public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."cleanup_expired_cache"() TO "anon";
GRANT ALL ON FUNCTION "public"."cleanup_expired_cache"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."cleanup_expired_cache"() TO "service_role";



GRANT ALL ON FUNCTION "public"."cleanup_old_notifications"() TO "anon";
GRANT ALL ON FUNCTION "public"."cleanup_old_notifications"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."cleanup_old_notifications"() TO "service_role";



GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_default_notification_preferences"("p_user_id" "uuid", "p_notification_type" "public"."notification_type") TO "anon";
GRANT ALL ON FUNCTION "public"."create_default_notification_preferences"("p_user_id" "uuid", "p_notification_type" "public"."notification_type") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_default_notification_preferences"("p_user_id" "uuid", "p_notification_type" "public"."notification_type") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_notification"("p_recipient_id" "uuid", "p_actor_id" "uuid", "p_type" "public"."notification_type", "p_title" "text", "p_message" "text", "p_entity_type" "text", "p_entity_id" "uuid", "p_metadata" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."create_notification"("p_recipient_id" "uuid", "p_actor_id" "uuid", "p_type" "public"."notification_type", "p_title" "text", "p_message" "text", "p_entity_type" "text", "p_entity_id" "uuid", "p_metadata" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_notification"("p_recipient_id" "uuid", "p_actor_id" "uuid", "p_type" "public"."notification_type", "p_title" "text", "p_message" "text", "p_entity_type" "text", "p_entity_id" "uuid", "p_metadata" "jsonb") TO "service_role";



GRANT ALL ON TABLE "public"."video_assets" TO "anon";
GRANT ALL ON TABLE "public"."video_assets" TO "authenticated";
GRANT ALL ON TABLE "public"."video_assets" TO "service_role";



GRANT ALL ON FUNCTION "public"."find_video_by_mux_id"("p_mux_id" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."find_video_by_mux_id"("p_mux_id" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."find_video_by_mux_id"("p_mux_id" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_cached_recommendations"("p_user_id" "uuid", "p_cache_key" "text", "p_algorithm_version" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_cached_recommendations"("p_user_id" "uuid", "p_cache_key" "text", "p_algorithm_version" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_cached_recommendations"("p_user_id" "uuid", "p_cache_key" "text", "p_algorithm_version" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_collective_stats"("collective_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_collective_stats"("collective_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_collective_stats"("collective_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_follower_count"("entity_id" "uuid", "entity_type" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_follower_count"("entity_id" "uuid", "entity_type" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_follower_count"("entity_id" "uuid", "entity_type" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_following_count"("user_id" "uuid", "entity_type" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_following_count"("user_id" "uuid", "entity_type" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_following_count"("user_id" "uuid", "entity_type" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_subscriber_count"("entity_id" "uuid", "entity_type" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_subscriber_count"("entity_id" "uuid", "entity_type" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_subscriber_count"("entity_id" "uuid", "entity_type" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_unread_message_count"("p_user_id" "uuid", "p_conversation_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_unread_message_count"("p_user_id" "uuid", "p_conversation_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_unread_message_count"("p_user_id" "uuid", "p_conversation_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_unread_notification_count"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_unread_notification_count"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_unread_notification_count"("p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_dashboard_content"("user_id_param" "uuid", "posts_limit" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_dashboard_content"("user_id_param" "uuid", "posts_limit" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_dashboard_content"("user_id_param" "uuid", "posts_limit" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_dashboard_stats"("user_id_param" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_dashboard_stats"("user_id_param" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_dashboard_stats"("user_id_param" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_dashboard_stats_v2"("user_id_param" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_dashboard_stats_v2"("user_id_param" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_dashboard_stats_v2"("user_id_param" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_feed"("p_user_id" "uuid", "p_limit" integer, "p_offset" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_feed"("p_user_id" "uuid", "p_limit" integer, "p_offset" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_feed"("p_user_id" "uuid", "p_limit" integer, "p_offset" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_preference_weights"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_preference_weights"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_preference_weights"("p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_accum"(double precision[], "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_accum"(double precision[], "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_accum"(double precision[], "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_accum"(double precision[], "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_add"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_add"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_add"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_add"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_avg"(double precision[]) TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_avg"(double precision[]) TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_avg"(double precision[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_avg"(double precision[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_cmp"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_cmp"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_cmp"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_cmp"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_combine"(double precision[], double precision[]) TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_combine"(double precision[], double precision[]) TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_combine"(double precision[], double precision[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_combine"(double precision[], double precision[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_concat"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_concat"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_concat"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_concat"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_eq"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_eq"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_eq"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_eq"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_ge"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_ge"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_ge"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_ge"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_gt"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_gt"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_gt"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_gt"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_l2_squared_distance"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_l2_squared_distance"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_l2_squared_distance"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_l2_squared_distance"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_le"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_le"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_le"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_le"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_lt"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_lt"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_lt"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_lt"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_mul"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_mul"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_mul"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_mul"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_ne"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_ne"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_ne"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_ne"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_negative_inner_product"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_negative_inner_product"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_negative_inner_product"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_negative_inner_product"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_spherical_distance"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_spherical_distance"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_spherical_distance"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_spherical_distance"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_sub"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_sub"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_sub"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_sub"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."hamming_distance"(bit, bit) TO "postgres";
GRANT ALL ON FUNCTION "public"."hamming_distance"(bit, bit) TO "anon";
GRANT ALL ON FUNCTION "public"."hamming_distance"(bit, bit) TO "authenticated";
GRANT ALL ON FUNCTION "public"."hamming_distance"(bit, bit) TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."hnsw_bit_support"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."hnsw_bit_support"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."hnsw_bit_support"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."hnsw_bit_support"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."hnsw_halfvec_support"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."hnsw_halfvec_support"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."hnsw_halfvec_support"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."hnsw_halfvec_support"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."hnsw_sparsevec_support"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."hnsw_sparsevec_support"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."hnsw_sparsevec_support"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."hnsw_sparsevec_support"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."hnswhandler"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."hnswhandler"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."hnswhandler"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."hnswhandler"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."increment_view_count"("post_id_to_increment" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."increment_view_count"("post_id_to_increment" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."increment_view_count"("post_id_to_increment" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."inner_product"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."inner_product"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."inner_product"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."inner_product"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."inner_product"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."inner_product"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."inner_product"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."inner_product"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."inner_product"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."inner_product"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."inner_product"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."inner_product"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."invalidate_user_cache"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."invalidate_user_cache"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."invalidate_user_cache"("p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_collective_owner"("cid" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_collective_owner"("cid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_collective_owner"("cid" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_content_muted"("p_user_id" "uuid", "p_content_id" "uuid", "p_author_id" "uuid", "p_collective_id" "uuid", "p_tags" "text"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."is_content_muted"("p_user_id" "uuid", "p_content_id" "uuid", "p_author_id" "uuid", "p_collective_id" "uuid", "p_tags" "text"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_content_muted"("p_user_id" "uuid", "p_content_id" "uuid", "p_author_id" "uuid", "p_collective_id" "uuid", "p_tags" "text"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."is_following"("follower_user_id" "uuid", "target_id" "uuid", "target_type" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."is_following"("follower_user_id" "uuid", "target_id" "uuid", "target_type" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_following"("follower_user_id" "uuid", "target_id" "uuid", "target_type" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."ivfflat_bit_support"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."ivfflat_bit_support"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."ivfflat_bit_support"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."ivfflat_bit_support"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."ivfflat_halfvec_support"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."ivfflat_halfvec_support"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."ivfflat_halfvec_support"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."ivfflat_halfvec_support"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."ivfflathandler"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."ivfflathandler"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."ivfflathandler"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."ivfflathandler"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."jaccard_distance"(bit, bit) TO "postgres";
GRANT ALL ON FUNCTION "public"."jaccard_distance"(bit, bit) TO "anon";
GRANT ALL ON FUNCTION "public"."jaccard_distance"(bit, bit) TO "authenticated";
GRANT ALL ON FUNCTION "public"."jaccard_distance"(bit, bit) TO "service_role";



GRANT ALL ON FUNCTION "public"."l1_distance"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."l1_distance"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."l1_distance"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l1_distance"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."l1_distance"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."l1_distance"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."l1_distance"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l1_distance"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."l1_distance"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."l1_distance"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."l1_distance"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l1_distance"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."l2_distance"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."l2_distance"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."l2_distance"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l2_distance"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."l2_distance"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."l2_distance"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."l2_distance"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l2_distance"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."l2_distance"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."l2_distance"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."l2_distance"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l2_distance"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."l2_norm"("public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."l2_norm"("public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."l2_norm"("public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l2_norm"("public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."l2_norm"("public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."l2_norm"("public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."l2_norm"("public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l2_norm"("public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."mark_messages_as_read"("p_user_id" "uuid", "p_conversation_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."mark_messages_as_read"("p_user_id" "uuid", "p_conversation_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."mark_messages_as_read"("p_user_id" "uuid", "p_conversation_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."mark_notifications_as_read"("p_user_id" "uuid", "p_notification_ids" "uuid"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."mark_notifications_as_read"("p_user_id" "uuid", "p_notification_ids" "uuid"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."mark_notifications_as_read"("p_user_id" "uuid", "p_notification_ids" "uuid"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."set_updated_at_agreements"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_updated_at_agreements"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_updated_at_agreements"() TO "service_role";



GRANT ALL ON FUNCTION "public"."set_updated_at_collectives"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_updated_at_collectives"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_updated_at_collectives"() TO "service_role";



GRANT ALL ON FUNCTION "public"."set_updated_at_users"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_updated_at_users"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_updated_at_users"() TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_cmp"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_cmp"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_cmp"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_cmp"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_eq"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_eq"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_eq"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_eq"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_ge"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_ge"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_ge"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_ge"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_gt"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_gt"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_gt"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_gt"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_l2_squared_distance"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_l2_squared_distance"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_l2_squared_distance"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_l2_squared_distance"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_le"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_le"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_le"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_le"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_lt"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_lt"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_lt"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_lt"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_ne"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_ne"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_ne"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_ne"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_negative_inner_product"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_negative_inner_product"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_negative_inner_product"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_negative_inner_product"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."subvector"("public"."halfvec", integer, integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."subvector"("public"."halfvec", integer, integer) TO "anon";
GRANT ALL ON FUNCTION "public"."subvector"("public"."halfvec", integer, integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."subvector"("public"."halfvec", integer, integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."subvector"("public"."vector", integer, integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."subvector"("public"."vector", integer, integer) TO "anon";
GRANT ALL ON FUNCTION "public"."subvector"("public"."vector", integer, integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."subvector"("public"."vector", integer, integer) TO "service_role";



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



GRANT ALL ON FUNCTION "public"."update_collective_members_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_collective_members_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_collective_members_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_collectives_tsv"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_collectives_tsv"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_collectives_tsv"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_conversation_last_message"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_conversation_last_message"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_conversation_last_message"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_post_like_count"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_post_like_count"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_post_like_count"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_posts_tsv"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_posts_tsv"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_posts_tsv"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_user_post_count"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_user_post_count"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_user_post_count"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_users_tsv"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_users_tsv"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_users_tsv"() TO "service_role";



GRANT ALL ON FUNCTION "public"."validate_collective_subscription"() TO "anon";
GRANT ALL ON FUNCTION "public"."validate_collective_subscription"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_collective_subscription"() TO "service_role";



GRANT ALL ON FUNCTION "public"."validate_follows_target"() TO "anon";
GRANT ALL ON FUNCTION "public"."validate_follows_target"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_follows_target"() TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_accum"(double precision[], "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_accum"(double precision[], "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_accum"(double precision[], "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_accum"(double precision[], "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_add"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_add"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_add"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_add"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_avg"(double precision[]) TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_avg"(double precision[]) TO "anon";
GRANT ALL ON FUNCTION "public"."vector_avg"(double precision[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_avg"(double precision[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_cmp"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_cmp"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_cmp"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_cmp"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_combine"(double precision[], double precision[]) TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_combine"(double precision[], double precision[]) TO "anon";
GRANT ALL ON FUNCTION "public"."vector_combine"(double precision[], double precision[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_combine"(double precision[], double precision[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_concat"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_concat"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_concat"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_concat"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_dims"("public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_dims"("public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_dims"("public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_dims"("public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_dims"("public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_dims"("public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_dims"("public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_dims"("public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_eq"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_eq"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_eq"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_eq"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_ge"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_ge"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_ge"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_ge"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_gt"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_gt"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_gt"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_gt"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_l2_squared_distance"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_l2_squared_distance"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_l2_squared_distance"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_l2_squared_distance"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_le"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_le"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_le"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_le"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_lt"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_lt"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_lt"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_lt"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_mul"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_mul"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_mul"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_mul"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_ne"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_ne"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_ne"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_ne"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_negative_inner_product"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_negative_inner_product"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_negative_inner_product"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_negative_inner_product"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_norm"("public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_norm"("public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_norm"("public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_norm"("public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_spherical_distance"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_spherical_distance"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_spherical_distance"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_spherical_distance"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_sub"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_sub"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_sub"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_sub"("public"."vector", "public"."vector") TO "service_role";












GRANT ALL ON FUNCTION "public"."avg"("public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."avg"("public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."avg"("public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."avg"("public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."avg"("public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."avg"("public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."avg"("public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."avg"("public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."sum"("public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sum"("public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."sum"("public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sum"("public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sum"("public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."sum"("public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."sum"("public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sum"("public"."vector") TO "service_role";









GRANT ALL ON TABLE "public"."agreements" TO "anon";
GRANT ALL ON TABLE "public"."agreements" TO "authenticated";
GRANT ALL ON TABLE "public"."agreements" TO "service_role";



GRANT ALL ON TABLE "public"."follows" TO "anon";
GRANT ALL ON TABLE "public"."follows" TO "authenticated";
GRANT ALL ON TABLE "public"."follows" TO "service_role";



GRANT ALL ON TABLE "public"."users" TO "anon";
GRANT ALL ON TABLE "public"."users" TO "authenticated";
GRANT ALL ON TABLE "public"."users" TO "service_role";



GRANT ALL ON TABLE "public"."collective_followers" TO "anon";
GRANT ALL ON TABLE "public"."collective_followers" TO "authenticated";
GRANT ALL ON TABLE "public"."collective_followers" TO "service_role";



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



GRANT ALL ON TABLE "public"."content_metadata" TO "anon";
GRANT ALL ON TABLE "public"."content_metadata" TO "authenticated";
GRANT ALL ON TABLE "public"."content_metadata" TO "service_role";



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



GRANT ALL ON TABLE "public"."post_collectives" TO "anon";
GRANT ALL ON TABLE "public"."post_collectives" TO "authenticated";
GRANT ALL ON TABLE "public"."post_collectives" TO "service_role";



GRANT ALL ON TABLE "public"."post_reactions" TO "anon";
GRANT ALL ON TABLE "public"."post_reactions" TO "authenticated";
GRANT ALL ON TABLE "public"."post_reactions" TO "service_role";



GRANT ALL ON TABLE "public"."post_views" TO "anon";
GRANT ALL ON TABLE "public"."post_views" TO "authenticated";
GRANT ALL ON TABLE "public"."post_views" TO "service_role";



GRANT ALL ON TABLE "public"."posts" TO "anon";
GRANT ALL ON TABLE "public"."posts" TO "authenticated";
GRANT ALL ON TABLE "public"."posts" TO "service_role";



GRANT ALL ON TABLE "public"."prices" TO "anon";
GRANT ALL ON TABLE "public"."prices" TO "authenticated";
GRANT ALL ON TABLE "public"."prices" TO "service_role";



GRANT ALL ON TABLE "public"."products" TO "anon";
GRANT ALL ON TABLE "public"."products" TO "authenticated";
GRANT ALL ON TABLE "public"."products" TO "service_role";



GRANT ALL ON TABLE "public"."recommendation_cache" TO "anon";
GRANT ALL ON TABLE "public"."recommendation_cache" TO "authenticated";
GRANT ALL ON TABLE "public"."recommendation_cache" TO "service_role";



GRANT ALL ON TABLE "public"."recommendations" TO "anon";
GRANT ALL ON TABLE "public"."recommendations" TO "authenticated";
GRANT ALL ON TABLE "public"."recommendations" TO "service_role";



GRANT ALL ON TABLE "public"."search_documents" TO "anon";
GRANT ALL ON TABLE "public"."search_documents" TO "authenticated";
GRANT ALL ON TABLE "public"."search_documents" TO "service_role";



GRANT ALL ON TABLE "public"."subscription_plans" TO "anon";
GRANT ALL ON TABLE "public"."subscription_plans" TO "authenticated";
GRANT ALL ON TABLE "public"."subscription_plans" TO "service_role";



GRANT ALL ON TABLE "public"."subscriptions" TO "anon";
GRANT ALL ON TABLE "public"."subscriptions" TO "authenticated";
GRANT ALL ON TABLE "public"."subscriptions" TO "service_role";



GRANT ALL ON TABLE "public"."user_followers" TO "anon";
GRANT ALL ON TABLE "public"."user_followers" TO "authenticated";
GRANT ALL ON TABLE "public"."user_followers" TO "service_role";



GRANT ALL ON TABLE "public"."user_following" TO "anon";
GRANT ALL ON TABLE "public"."user_following" TO "authenticated";
GRANT ALL ON TABLE "public"."user_following" TO "service_role";



GRANT ALL ON TABLE "public"."user_preferences" TO "anon";
GRANT ALL ON TABLE "public"."user_preferences" TO "authenticated";
GRANT ALL ON TABLE "public"."user_preferences" TO "service_role";



GRANT ALL ON TABLE "public"."video_analytics" TO "anon";
GRANT ALL ON TABLE "public"."video_analytics" TO "authenticated";
GRANT ALL ON TABLE "public"."video_analytics" TO "service_role";









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
