-- Performance Indexes for Multi-Tenant Queries (FIXED based on actual schema)
-- 
-- This migration adds strategic indexes to optimize common query patterns
-- Fixed to match actual database column names

-- =============================================================================
-- Posts Table Performance Indexes (HAS tenant_id)
-- =============================================================================

-- Composite index for tenant + created_at (post feeds, timeline)
CREATE INDEX IF NOT EXISTS idx_posts_tenant_created_at
ON public.posts (tenant_id, created_at DESC, id);

-- Composite index for tenant + status + created_at (active posts feed)
CREATE INDEX IF NOT EXISTS idx_posts_tenant_status_created
ON public.posts (tenant_id, status, created_at DESC)
WHERE status = 'active';

-- Composite index for tenant + is_public + created_at (public content)
CREATE INDEX IF NOT EXISTS idx_posts_tenant_public_created
ON public.posts (tenant_id, is_public, created_at DESC)
WHERE is_public = true;

-- Index for author posts within tenant
CREATE INDEX IF NOT EXISTS idx_posts_tenant_author_created
ON public.posts (tenant_id, author_id, created_at DESC);

-- Index for post type filtering within tenant
CREATE INDEX IF NOT EXISTS idx_posts_tenant_type_created
ON public.posts (tenant_id, post_type, created_at DESC);

-- Full-text search index
CREATE INDEX IF NOT EXISTS idx_posts_search
ON public.posts USING GIN (to_tsvector('english', title || ' ' || COALESCE(content, '')));

-- Index for like count sorting within tenant
CREATE INDEX IF NOT EXISTS idx_posts_tenant_likes
ON public.posts (tenant_id, like_count DESC, created_at DESC)
WHERE like_count > 0;

-- =============================================================================
-- Conversations Table Performance Indexes (HAS tenant_id)
-- =============================================================================

-- Composite index for tenant + type + updated_at (conversation lists)
CREATE INDEX IF NOT EXISTS idx_conversations_tenant_type_updated
ON public.conversations (tenant_id, type, updated_at DESC);

-- Composite index for tenant + is_private + updated_at
CREATE INDEX IF NOT EXISTS idx_conversations_tenant_private_updated
ON public.conversations (tenant_id, is_private, updated_at DESC);

-- Index for conversation creator within tenant
CREATE INDEX IF NOT EXISTS idx_conversations_tenant_creator
ON public.conversations (tenant_id, created_by, created_at DESC);

-- Index for conversation participants (for quick membership checks)
CREATE INDEX IF NOT EXISTS idx_conversation_participants_conversation
ON public.conversation_participants (conversation_id, user_id, joined_at DESC);

-- Index for user's conversations
CREATE INDEX IF NOT EXISTS idx_conversation_participants_user
ON public.conversation_participants (user_id, last_read_at DESC);

-- =============================================================================
-- Messages Table Performance Indexes
-- =============================================================================

-- Composite index for conversation + created_at (message timeline)
CREATE INDEX IF NOT EXISTS idx_messages_conversation_created
ON public.messages (conversation_id, created_at DESC, id);

-- Index for sender messages
CREATE INDEX IF NOT EXISTS idx_messages_sender_created
ON public.messages (sender_id, created_at DESC);

-- Index for message type filtering
CREATE INDEX IF NOT EXISTS idx_messages_conversation_type
ON public.messages (conversation_id, message_type, created_at DESC);

-- Index for non-deleted messages
CREATE INDEX IF NOT EXISTS idx_messages_conversation_active
ON public.messages (conversation_id, created_at DESC)
WHERE deleted_at IS NULL;

-- Index for reply threads
CREATE INDEX IF NOT EXISTS idx_messages_reply_to
ON public.messages (reply_to_id, created_at ASC)
WHERE reply_to_id IS NOT NULL;

-- Full-text search on messages
CREATE INDEX IF NOT EXISTS idx_messages_search
ON public.messages USING GIN (to_tsvector('english', content))
WHERE deleted_at IS NULL;

-- =============================================================================
-- Post-Collectives Junction Table Indexes
-- =============================================================================

-- Index for finding posts in a collective (using shared_at not created_at)
CREATE INDEX IF NOT EXISTS idx_post_collectives_collective
ON public.post_collectives (collective_id, status, shared_at DESC);

-- Index for finding collectives for a post
CREATE INDEX IF NOT EXISTS idx_post_collectives_post
ON public.post_collectives (post_id, status);

-- Composite index for active associations
CREATE INDEX IF NOT EXISTS idx_post_collectives_active
ON public.post_collectives (collective_id, post_id)
WHERE status = 'active';

-- =============================================================================
-- Tenant Members Table Performance Indexes
-- =============================================================================

-- Composite index for tenant membership queries
CREATE INDEX IF NOT EXISTS idx_tenant_members_tenant_role
ON public.tenant_members (tenant_id, role, joined_at DESC);

-- Index for user's tenants
CREATE INDEX IF NOT EXISTS idx_tenant_members_user_joined
ON public.tenant_members (user_id, joined_at DESC);

-- Index for role-based queries
CREATE INDEX IF NOT EXISTS idx_tenant_members_tenant_user_role
ON public.tenant_members (tenant_id, user_id, role);

-- =============================================================================
-- Users Table Performance Indexes
-- =============================================================================

-- Index for username lookups
CREATE INDEX IF NOT EXISTS idx_users_username
ON public.users (username)
WHERE username IS NOT NULL;

-- Index for user search by name
CREATE INDEX IF NOT EXISTS idx_users_search
ON public.users USING GIN (to_tsvector('english', full_name || ' ' || COALESCE(username, '')));

-- =============================================================================
-- Video Assets Table Performance Indexes (NO tenant_id)
-- =============================================================================

-- Index for uploader's videos (created_by exists)
CREATE INDEX IF NOT EXISTS idx_video_assets_uploader_created
ON public.video_assets (created_by, created_at DESC);

-- Index for video status
CREATE INDEX IF NOT EXISTS idx_video_assets_status_created
ON public.video_assets (status, created_at DESC);

-- Index for video duration filtering (column is 'duration' not 'duration_seconds')
CREATE INDEX IF NOT EXISTS idx_video_assets_duration
ON public.video_assets (duration, created_at DESC)
WHERE duration IS NOT NULL;

-- Index for video comments (comment_count exists)
CREATE INDEX IF NOT EXISTS idx_video_assets_comments
ON public.video_assets (comment_count DESC, created_at DESC)
WHERE comment_count > 0;

-- =============================================================================
-- Chains Table Performance Indexes (NO tenant_id)
-- =============================================================================

-- Index for chain author (author_id not created_by)
CREATE INDEX IF NOT EXISTS idx_chains_author_created
ON public.chains (author_id, created_at DESC);

-- Index for chain parent relationships
CREATE INDEX IF NOT EXISTS idx_chains_parent
ON public.chains (parent_chain_id, created_at ASC)
WHERE parent_chain_id IS NOT NULL;

-- =============================================================================
-- Notifications Table Performance Indexes (HAS tenant_id)
-- =============================================================================

-- Composite index for user notifications
CREATE INDEX IF NOT EXISTS idx_notifications_user_created
ON public.notifications (recipient_id, created_at DESC);

-- Index for unread notifications
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
ON public.notifications (recipient_id, created_at DESC)
WHERE read_at IS NULL;

-- Index for notification type filtering (type not notification_type)
CREATE INDEX IF NOT EXISTS idx_notifications_user_type
ON public.notifications (recipient_id, type, created_at DESC);

-- =============================================================================
-- Comments Table Performance Indexes (HAS tenant_id)
-- =============================================================================

-- Index for entity comments
CREATE INDEX IF NOT EXISTS idx_comments_entity_created
ON public.comments (entity_type, entity_id, created_at DESC)
WHERE deleted_at IS NULL;

-- Index for comment author
CREATE INDEX IF NOT EXISTS idx_comments_author_created
ON public.comments (author_id, created_at DESC)
WHERE deleted_at IS NULL;

-- Index for comment threads (parent_id not parent_comment_id)
CREATE INDEX IF NOT EXISTS idx_comments_parent
ON public.comments (parent_id, created_at ASC)
WHERE parent_id IS NOT NULL AND deleted_at IS NULL;

-- Index for tenant-scoped comments
CREATE INDEX IF NOT EXISTS idx_comments_tenant_created
ON public.comments (tenant_id, created_at DESC)
WHERE deleted_at IS NULL;

-- =============================================================================
-- Collectives Table Performance Indexes (NO is_public column)
-- =============================================================================

-- Index for collective slug lookups
CREATE INDEX IF NOT EXISTS idx_collectives_slug
ON public.collectives (slug);

-- Index for collective owner
CREATE INDEX IF NOT EXISTS idx_collectives_owner_created
ON public.collectives (owner_id, created_at DESC);

-- Full-text search on collectives
CREATE INDEX IF NOT EXISTS idx_collectives_search
ON public.collectives USING GIN (to_tsvector('english', name || ' ' || COALESCE(description, '')));

-- =============================================================================
-- Tenants Table Performance Indexes (HAS is_public)
-- =============================================================================

-- Index for tenant slug lookups
CREATE INDEX IF NOT EXISTS idx_tenants_slug
ON public.tenants (slug);

-- Index for tenant type
CREATE INDEX IF NOT EXISTS idx_tenants_type_created
ON public.tenants (type, created_at DESC);

-- Index for public tenants
CREATE INDEX IF NOT EXISTS idx_tenants_public_created
ON public.tenants (is_public, created_at DESC)
WHERE is_public = true;

-- =============================================================================
-- Reaction Tables Performance Indexes
-- =============================================================================

-- Post reactions index (type not reaction_type)
CREATE INDEX IF NOT EXISTS idx_post_reactions_post_type
ON public.post_reactions (post_id, type);

-- Message reactions index (emoji not type)
CREATE INDEX IF NOT EXISTS idx_message_reactions_message_emoji
ON public.message_reactions (message_id, emoji);

-- User's post reactions index
CREATE INDEX IF NOT EXISTS idx_post_reactions_user
ON public.post_reactions (user_id, created_at DESC);

-- =============================================================================
-- Follow System Performance Indexes
-- =============================================================================

-- Followers index (follower_id and following_id)
CREATE INDEX IF NOT EXISTS idx_follows_follower_following
ON public.follows (follower_id, following_id);

-- Following index
CREATE INDEX IF NOT EXISTS idx_follows_following_follower
ON public.follows (following_id, follower_id);

-- Follow timeline index
CREATE INDEX IF NOT EXISTS idx_follows_follower_created
ON public.follows (follower_id, created_at DESC);

-- =============================================================================
-- Subscription and Pricing Performance Indexes
-- =============================================================================

-- User subscriptions index
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_status
ON public.subscriptions (user_id, status, current_period_end DESC);

-- Active subscriptions index
CREATE INDEX IF NOT EXISTS idx_subscriptions_active
ON public.subscriptions (status, current_period_end DESC)
WHERE status = 'active';

-- =============================================================================
-- Partial Indexes for Efficiency
-- =============================================================================

-- Active posts only (most common query)
CREATE INDEX IF NOT EXISTS idx_posts_active_tenant_created
ON public.posts (tenant_id, created_at DESC)
WHERE status = 'active';

-- Published posts only
CREATE INDEX IF NOT EXISTS idx_posts_published_tenant_created
ON public.posts (tenant_id, created_at DESC)
WHERE status = 'active' AND is_public = true;

-- =============================================================================
-- Expression Indexes for Common Patterns
-- =============================================================================

-- Index for extracting date parts from timestamps (for grouping by day/month)
CREATE INDEX IF NOT EXISTS idx_posts_tenant_date
ON public.posts (tenant_id, DATE(created_at), created_at DESC);

-- Index for case-insensitive title searches
CREATE INDEX IF NOT EXISTS idx_posts_tenant_title_lower
ON public.posts (tenant_id, lower(title));

-- =============================================================================
-- Statistics and Maintenance
-- =============================================================================

-- Update table statistics to help query planner
ANALYZE public.posts;
ANALYZE public.conversations;
ANALYZE public.messages;
ANALYZE public.tenant_members;
ANALYZE public.post_collectives;
ANALYZE public.users;
ANALYZE public.tenants;

-- =============================================================================
-- Index Monitoring Views
-- =============================================================================

-- Create view to monitor index usage
CREATE OR REPLACE VIEW public.index_usage_stats AS
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_scan,
    idx_tup_read,
    idx_tup_fetch,
    CASE 
        WHEN idx_scan = 0 THEN 'Never Used'
        WHEN idx_scan < 100 THEN 'Low Usage'
        WHEN idx_scan < 1000 THEN 'Medium Usage'
        ELSE 'High Usage'
    END as usage_category
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan DESC, tablename, indexname;

-- Create view to monitor table scan ratios
CREATE OR REPLACE VIEW public.table_scan_stats AS
SELECT 
    schemaname,
    tablename,
    seq_scan,
    seq_tup_read,
    idx_scan,
    idx_tup_fetch,
    CASE 
        WHEN (seq_scan + idx_scan) = 0 THEN 0
        ELSE ROUND((seq_scan::numeric / (seq_scan + idx_scan)::numeric) * 100, 2)
    END as seq_scan_ratio
FROM pg_stat_user_tables
WHERE schemaname = 'public'
ORDER BY seq_scan_ratio DESC, tablename;

COMMENT ON VIEW public.index_usage_stats IS 
'Monitor index usage patterns to identify unused or underutilized indexes';

COMMENT ON VIEW public.table_scan_stats IS 
'Monitor sequential vs index scan ratios to identify tables that may need better indexing'; 