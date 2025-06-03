-- Dashboard Optimization RPC Functions
-- This migration creates optimized RPC functions to reduce database round trips

-- Function to get consolidated user dashboard statistics
CREATE OR REPLACE FUNCTION get_user_dashboard_stats(user_id UUID)
RETURNS TABLE (
    subscriber_count BIGINT,
    follower_count BIGINT,
    total_views BIGINT,
    total_likes BIGINT,
    published_this_month BIGINT,
    total_posts BIGINT,
    collective_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    WITH stats AS (
        -- Get subscriber count
        SELECT COUNT(*) as subs
        FROM subscriptions 
        WHERE target_entity_type = 'user' 
          AND target_entity_id = get_user_dashboard_stats.user_id 
          AND status = 'active'
    ),
    followers AS (
        -- Get follower count
        SELECT COUNT(*) as follows
        FROM follows 
        WHERE following_id = get_user_dashboard_stats.user_id 
          AND following_type = 'user'
    ),
    post_stats AS (
        -- Get total views and likes
        SELECT 
            COALESCE(SUM(view_count), 0) as views,
            COALESCE(SUM(like_count), 0) as likes
        FROM posts 
        WHERE author_id = get_user_dashboard_stats.user_id
    ),
    monthly_posts AS (
        -- Get posts published this month
        SELECT COUNT(*) as monthly
        FROM posts 
        WHERE author_id = get_user_dashboard_stats.user_id 
          AND published_at IS NOT NULL
          AND published_at >= DATE_TRUNC('month', CURRENT_DATE)
    ),
    total_posts_count AS (
        -- Get total posts count
        SELECT COUNT(*) as total
        FROM posts 
        WHERE author_id = get_user_dashboard_stats.user_id 
          AND collective_id IS NULL
    ),
    collective_count AS (
        -- Get owned collectives count
        SELECT COUNT(*) as collectives
        FROM collectives 
        WHERE owner_id = get_user_dashboard_stats.user_id
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get collective statistics (consolidates the separate count queries)
CREATE OR REPLACE FUNCTION get_collective_stats(collective_id UUID)
RETURNS TABLE (
    member_count BIGINT,
    follower_count BIGINT,
    post_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    WITH member_stats AS (
        -- Get member count
        SELECT COUNT(*) as members
        FROM collective_members 
        WHERE collective_members.collective_id = get_collective_stats.collective_id
    ),
    follower_stats AS (
        -- Get follower count
        SELECT COUNT(*) as followers
        FROM follows 
        WHERE following_id = get_collective_stats.collective_id 
          AND following_type = 'collective'
    ),
    post_stats AS (
        -- Get post count
        SELECT COUNT(*) as posts
        FROM posts 
        WHERE posts.collective_id = get_collective_stats.collective_id
    )
    SELECT 
        member_stats.members::BIGINT,
        follower_stats.followers::BIGINT,
        post_stats.posts::BIGINT
    FROM member_stats, follower_stats, post_stats;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user profile with posts (combines profile and posts query)
CREATE OR REPLACE FUNCTION get_user_dashboard_content(user_id UUID, posts_limit INT DEFAULT 3)
RETURNS JSON AS $$
DECLARE
    result JSON;
    user_profile JSON;
    recent_posts JSON;
    owned_collectives JSON;
BEGIN
    -- Get user profile
    SELECT json_build_object(
        'username', username,
        'full_name', full_name,
        'avatar_url', avatar_url
    ) INTO user_profile
    FROM users 
    WHERE id = get_user_dashboard_content.user_id;
    
    -- Get recent personal posts
    SELECT json_agg(
        json_build_object(
            'id', id,
            'title', title,
            'published_at', published_at,
            'created_at', created_at,
            'is_public', is_public,
            'collective_id', collective_id
        ) ORDER BY created_at DESC
    ) INTO recent_posts
    FROM (
        SELECT *
        FROM posts 
        WHERE author_id = get_user_dashboard_content.user_id 
          AND collective_id IS NULL
        ORDER BY created_at DESC
        LIMIT posts_limit
    ) limited_posts;
    
    -- Get owned collectives
    SELECT json_agg(
        json_build_object(
            'id', id,
            'name', name,
            'slug', slug,
            'description', description
        ) ORDER BY name ASC
    ) INTO owned_collectives
    FROM collectives 
    WHERE owner_id = get_user_dashboard_content.user_id
    ORDER BY name ASC;
    
    -- Build result JSON
    result := json_build_object(
        'profile', user_profile,
        'recent_posts', COALESCE(recent_posts, '[]'::json),
        'owned_collectives', COALESCE(owned_collectives, '[]'::json)
    );
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add RLS policies for the RPC functions
GRANT EXECUTE ON FUNCTION get_user_dashboard_stats(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_collective_stats(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_dashboard_content(UUID, INT) TO authenticated;

-- Create indexes to optimize the RPC functions
CREATE INDEX IF NOT EXISTS idx_subscriptions_target_user_active 
ON subscriptions (target_entity_id, target_entity_type, status) 
WHERE target_entity_type = 'user' AND status = 'active';

CREATE INDEX IF NOT EXISTS idx_follows_user_type 
ON follows (following_id, following_type) 
WHERE following_type = 'user';

CREATE INDEX IF NOT EXISTS idx_follows_collective_type 
ON follows (following_id, following_type) 
WHERE following_type = 'collective';

CREATE INDEX IF NOT EXISTS idx_posts_author_personal 
ON posts (author_id, created_at) 
WHERE collective_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_posts_author_published_month 
ON posts (author_id, published_at) 
WHERE published_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_collective_members_collective 
ON collective_members (collective_id);

-- Comment the functions
COMMENT ON FUNCTION get_user_dashboard_stats(UUID) IS 'Consolidates all user dashboard statistics into a single query to reduce database round trips from 6-7 queries to 1';
COMMENT ON FUNCTION get_collective_stats(UUID) IS 'Consolidates collective member and follower counts into a single query to reduce round trips from 2-3 queries to 1';
COMMENT ON FUNCTION get_user_dashboard_content(UUID, INT) IS 'Consolidates user profile, recent posts, and owned collectives into a single query'; 