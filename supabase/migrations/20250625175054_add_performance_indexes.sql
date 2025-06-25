-- Performance Indexes for Multi-Tenant Queries
-- 
-- This migration adds strategic indexes to optimize common query patterns
-- in the multi-tenant architecture, focusing on:
-- 1. Tenant-scoped data retrieval
-- 2. Sorting and filtering within tenants
-- 3. Full-text search with tenant isolation
-- 4. Join performance for tenant operations
-- 5. Timeline and feed queries

-- =============================================================================
-- Posts Table Performance Indexes
-- =============================================================================

-- Composite index for tenant + created_at (post feeds, timeline)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_posts_tenant_created_at
ON public.posts (tenant_id, created_at DESC, id);

-- Composite index for tenant + status + created_at (active posts feed)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_posts_tenant_status_created
ON public.posts (tenant_id, status, created_at DESC)
WHERE status = 'active';

-- Composite index for tenant + is_public + created_at (public content)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_posts_tenant_public_created
ON public.posts (tenant_id, is_public, created_at DESC)
WHERE is_public = true;

-- Index for author posts within tenant
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_posts_tenant_author_created
ON public.posts (tenant_id, author_id, created_at DESC);

-- Index for post type filtering within tenant
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_posts_tenant_type_created
ON public.posts (tenant_id, post_type, created_at DESC);

-- Full-text search index with tenant scoping
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_posts_tenant_search
ON public.posts USING GIN (tenant_id, to_tsvector('english', title || ' ' || COALESCE(content, '')));

-- Index for like count sorting within tenant
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_posts_tenant_likes
ON public.posts (tenant_id, like_count DESC, created_at DESC)
WHERE like_count > 0;

-- Index for comment count sorting within tenant
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_posts_tenant_comments
ON public.posts (tenant_id, comment_count DESC, created_at DESC)
WHERE comment_count > 0;

-- =============================================================================
-- Conversations Table Performance Indexes
-- =============================================================================

-- Composite index for tenant + type + updated_at (conversation lists)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_conversations_tenant_type_updated
ON public.conversations (tenant_id, type, updated_at DESC);

-- Composite index for tenant + is_private + updated_at
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_conversations_tenant_private_updated
ON public.conversations (tenant_id, is_private, updated_at DESC);

-- Index for conversation creator within tenant
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_conversations_tenant_creator
ON public.conversations (tenant_id, created_by, created_at DESC);

-- Index for conversation participants (for quick membership checks)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_conversation_participants_conversation
ON public.conversation_participants (conversation_id, user_id, joined_at DESC);

-- Index for user's conversations
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_conversation_participants_user
ON public.conversation_participants (user_id, last_read_at DESC);

-- =============================================================================
-- Messages Table Performance Indexes
-- =============================================================================

-- Composite index for conversation + created_at (message timeline)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_messages_conversation_created
ON public.messages (conversation_id, created_at DESC, id);

-- Index for sender messages
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_messages_sender_created
ON public.messages (sender_id, created_at DESC);

-- Index for message type filtering
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_messages_conversation_type
ON public.messages (conversation_id, message_type, created_at DESC);

-- Index for non-deleted messages
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_messages_conversation_active
ON public.messages (conversation_id, created_at DESC)
WHERE deleted_at IS NULL;

-- Index for reply threads
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_messages_reply_to
ON public.messages (reply_to_id, created_at ASC)
WHERE reply_to_id IS NOT NULL;

-- Full-text search on messages
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_messages_search
ON public.messages USING GIN (to_tsvector('english', content))
WHERE deleted_at IS NULL;

-- =============================================================================
-- Post-Collectives Junction Table Indexes
-- =============================================================================

-- Index for finding posts in a collective
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_post_collectives_collective
ON public.post_collectives (collective_id, status, created_at DESC);

-- Index for finding collectives for a post
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_post_collectives_post
ON public.post_collectives (post_id, status);

-- Composite index for active associations
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_post_collectives_active
ON public.post_collectives (collective_id, post_id)
WHERE status = 'active';

-- =============================================================================
-- Tenant Members Table Performance Indexes
-- =============================================================================

-- Composite index for tenant membership queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tenant_members_tenant_role
ON public.tenant_members (tenant_id, role, joined_at DESC);

-- Index for user's tenants
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tenant_members_user_joined
ON public.tenant_members (user_id, joined_at DESC);

-- Index for role-based queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tenant_members_tenant_user_role
ON public.tenant_members (tenant_id, user_id, role);

-- =============================================================================
-- Users Table Performance Indexes
-- =============================================================================

-- Index for username lookups
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_username
ON public.users (username)
WHERE username IS NOT NULL;

-- Index for email lookups (if not already exists)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_email
ON public.users (email);

-- Index for user search by name
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_search
ON public.users USING GIN (to_tsvector('english', full_name || ' ' || COALESCE(username, '')));

-- Index for active users
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_active
ON public.users (last_sign_in_at DESC)
WHERE last_sign_in_at IS NOT NULL;

-- =============================================================================
-- Video Assets Table Performance Indexes
-- =============================================================================

-- Composite index for tenant + status + created_at
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_video_assets_tenant_status_created
ON public.video_assets (tenant_id, status, created_at DESC);

-- Index for uploader's videos
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_video_assets_uploader_created
ON public.video_assets (uploaded_by, created_at DESC);

-- Index for video duration filtering
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_video_assets_tenant_duration
ON public.video_assets (tenant_id, duration_seconds, created_at DESC)
WHERE duration_seconds IS NOT NULL;

-- Index for video comments
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_video_assets_tenant_comments
ON public.video_assets (tenant_id, comment_count DESC, created_at DESC)
WHERE comment_count > 0;

-- =============================================================================
-- Chains Table Performance Indexes
-- =============================================================================

-- Composite index for tenant + created_at (chain feeds)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_chains_tenant_created
ON public.chains (tenant_id, created_at DESC);

-- Index for chain creator
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_chains_tenant_creator_created
ON public.chains (tenant_id, created_by, created_at DESC);

-- Index for chain parent relationships
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_chains_parent
ON public.chains (parent_chain_id, created_at ASC)
WHERE parent_chain_id IS NOT NULL;

-- =============================================================================
-- Notifications Table Performance Indexes
-- =============================================================================

-- Composite index for user notifications
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notifications_user_created
ON public.notifications (user_id, created_at DESC);

-- Index for unread notifications
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notifications_user_unread
ON public.notifications (user_id, created_at DESC)
WHERE read_at IS NULL;

-- Index for notification type filtering
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notifications_user_type
ON public.notifications (user_id, notification_type, created_at DESC);

-- =============================================================================
-- Comments V2 Table Performance Indexes (if exists)
-- =============================================================================

-- Index for entity comments
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_comments_entity_created
ON public.comments (entity_type, entity_id, created_at DESC)
WHERE deleted_at IS NULL;

-- Index for comment author
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_comments_author_created
ON public.comments (author_id, created_at DESC)
WHERE deleted_at IS NULL;

-- Index for comment threads
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_comments_parent
ON public.comments (parent_comment_id, created_at ASC)
WHERE parent_comment_id IS NOT NULL AND deleted_at IS NULL;

-- =============================================================================
-- Collectives Table Performance Indexes
-- =============================================================================

-- Index for collective slug lookups
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_collectives_slug
ON public.collectives (slug);

-- Index for collective owner
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_collectives_owner_created
ON public.collectives (owner_id, created_at DESC);

-- Index for public collectives
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_collectives_public_created
ON public.collectives (is_public, created_at DESC)
WHERE is_public = true;

-- Full-text search on collectives
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_collectives_search
ON public.collectives USING GIN (to_tsvector('english', name || ' ' || COALESCE(description, '')));

-- =============================================================================
-- Tenants Table Performance Indexes
-- =============================================================================

-- Index for tenant slug lookups
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tenants_slug
ON public.tenants (slug);

-- Index for tenant type
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tenants_type_created
ON public.tenants (type, created_at DESC);

-- Index for public tenants (already exists in RLS migration, but ensure it's there)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tenants_public_created
ON public.tenants (is_public, created_at DESC)
WHERE is_public = true;

-- =============================================================================
-- Reaction Tables Performance Indexes
-- =============================================================================

-- Post reactions index
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_post_reactions_post_type
ON public.post_reactions (post_id, reaction_type);

-- Message reactions index
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_message_reactions_message_type
ON public.message_reactions (message_id, reaction_type);

-- Comment reactions index (if table exists)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_comment_reactions_comment_type
ON public.comment_reactions (comment_id, reaction_type);

-- User's reactions index
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_post_reactions_user
ON public.post_reactions (user_id, created_at DESC);

-- =============================================================================
-- Follow System Performance Indexes
-- =============================================================================

-- Followers index
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_follows_following_followed
ON public.follows (following_user_id, followed_user_id);

-- Following index
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_follows_followed_following
ON public.follows (followed_user_id, following_user_id);

-- Follow timeline index
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_follows_following_created
ON public.follows (following_user_id, created_at DESC);

-- =============================================================================
-- Subscription and Pricing Performance Indexes
-- =============================================================================

-- User subscriptions index
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_subscriptions_user_status
ON public.subscriptions (user_id, status, current_period_end DESC);

-- Active subscriptions index
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_subscriptions_active
ON public.subscriptions (status, current_period_end DESC)
WHERE status = 'active';

-- =============================================================================
-- Partial Indexes for Efficiency
-- =============================================================================

-- Active posts only (most common query)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_posts_active_tenant_created
ON public.posts (tenant_id, created_at DESC)
WHERE status = 'active' AND deleted_at IS NULL;

-- Published posts only
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_posts_published_tenant_created
ON public.posts (tenant_id, created_at DESC)
WHERE status = 'active' AND is_public = true AND deleted_at IS NULL;

-- Non-deleted messages only
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_messages_active_conversation_created
ON public.messages (conversation_id, created_at DESC)
WHERE deleted_at IS NULL;

-- =============================================================================
-- Expression Indexes for Common Patterns
-- =============================================================================

-- Index for extracting date parts from timestamps (for grouping by day/month)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_posts_tenant_date
ON public.posts (tenant_id, DATE(created_at), created_at DESC);

-- Index for case-insensitive title searches
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_posts_tenant_title_lower
ON public.posts (tenant_id, lower(title));

-- =============================================================================
-- Covering Indexes for Hot Queries
-- =============================================================================

-- Cover common post list queries with minimal I/O
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_posts_list_covering
ON public.posts (tenant_id, status, created_at DESC)
INCLUDE (id, title, author_id, like_count, comment_count, is_public)
WHERE status = 'active';

-- Cover conversation list queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_conversations_list_covering
ON public.conversations (tenant_id, updated_at DESC)
INCLUDE (id, title, type, is_private, created_by, participant_count);

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

-- =============================================================================
-- Comments and Documentation
-- =============================================================================

COMMENT ON VIEW public.index_usage_stats IS 
'Monitor index usage patterns to identify unused or underutilized indexes';

COMMENT ON VIEW public.table_scan_stats IS 
'Monitor sequential vs index scan ratios to identify tables that may need better indexing';

-- =============================================================================
-- Performance Notes
-- =============================================================================

/*
Performance Index Strategy:

1. Tenant-First Indexes:
   - All multi-tenant tables use tenant_id as the first column in composite indexes
   - This enables efficient partition elimination and tenant isolation

2. Sort Optimization:
   - Common sort patterns (created_at DESC, updated_at DESC) are included
   - This eliminates the need for separate sort operations

3. Partial Indexes:
   - Used for common WHERE conditions (status = 'active', deleted_at IS NULL)
   - Reduces index size and improves performance

4. Covering Indexes:
   - Include frequently accessed columns to avoid heap lookups
   - Particularly beneficial for list/feed queries

5. Full-Text Search:
   - GIN indexes for text search with tenant scoping
   - Supports efficient content discovery within tenants

6. Expression Indexes:
   - For common transformations like date extraction or case conversion
   - Enables efficient grouping and filtering

Monitoring:
- Use index_usage_stats view to identify unused indexes
- Use table_scan_stats view to find tables with high sequential scan ratios
- Monitor query performance with EXPLAIN ANALYZE
- Consider removing unused indexes to reduce maintenance overhead

Maintenance:
- Run ANALYZE regularly to update statistics
- Monitor index bloat and rebuild if necessary
- Consider partitioning for very large tables
*/
