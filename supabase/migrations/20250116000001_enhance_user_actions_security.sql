-- Migration: Enhance User Actions Security
-- Date: 2025-01-16
-- Purpose: Add security improvements for user profile and account management

-- 1. Create case-insensitive unique index for usernames
-- This prevents username collisions like "Foo" vs "foo"
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS idx_users_username_lower_unique 
ON users (lower(username)) 
WHERE username IS NOT NULL;

-- 2. Add indexes for performance on user deletion queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_posts_author_id_deleted_at 
ON posts (author_id) 
WHERE deleted_at IS NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_comments_user_id_deleted_at 
ON comments (user_id) 
WHERE deleted_at IS NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_collective_members_user_id 
ON collective_members (user_id);

-- 3. Create function for case-insensitive username checks
CREATE OR REPLACE FUNCTION check_username_available(
    p_username TEXT,
    p_user_id UUID DEFAULT NULL
) RETURNS BOOLEAN AS $$
BEGIN
    -- Return true if username is available, false if taken
    RETURN NOT EXISTS (
        SELECT 1 FROM users 
        WHERE lower(username) = lower(p_username)
        AND (p_user_id IS NULL OR id != p_user_id)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Grant necessary permissions
GRANT EXECUTE ON FUNCTION check_username_available TO authenticated;
