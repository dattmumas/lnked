-- Comprehensive Database Improvements Migration
-- Created: 2025-06-01
-- Purpose: Security (RLS), Performance (Indexes), Data Integrity, and Consistency improvements

-- =====================================================
-- PHASE 1: CRITICAL SECURITY FIXES (RLS POLICIES)
-- =====================================================

-- Enable RLS on unprotected tables
ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collective_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comment_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.featured_posts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for follows table (user relationships)
CREATE POLICY "Users can view their own follow relationships" ON public.follows
  FOR SELECT USING (auth.uid() = follower_id OR auth.uid() = following_id);

CREATE POLICY "Users can manage their own follows" ON public.follows
  FOR ALL USING (auth.uid() = follower_id);

-- RLS Policies for post_bookmarks table (private bookmarks)
CREATE POLICY "Users can manage their own bookmarks" ON public.post_bookmarks
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can bookmark public posts" ON public.post_bookmarks
  FOR INSERT WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (SELECT 1 FROM public.posts p WHERE p.id = post_id AND p.is_public = true)
  );

-- RLS Policies for post_reactions table (private reactions)
CREATE POLICY "Users can manage their own reactions" ON public.post_reactions
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view reactions on public posts" ON public.post_reactions
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.posts p WHERE p.id = post_id AND p.is_public = true)
  );

-- RLS Policies for collective_members table (membership privacy)
CREATE POLICY "Collective members can view membership" ON public.collective_members
  FOR SELECT USING (
    auth.uid() = member_id OR
    EXISTS (
      SELECT 1 FROM public.collective_members cm2 
      WHERE cm2.collective_id = collective_members.collective_id 
      AND cm2.member_id = auth.uid()
    )
  );

CREATE POLICY "Collective admins can manage members" ON public.collective_members
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.collective_members cm 
      WHERE cm.collective_id = collective_members.collective_id 
      AND cm.member_id = auth.uid() 
      AND cm.role IN ('admin', 'owner')
    )
  );

-- RLS Policies for subscriptions table (private billing)
CREATE POLICY "Users can view their own subscriptions" ON public.subscriptions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage subscriptions" ON public.subscriptions
  FOR ALL USING (auth.role() = 'service_role');

-- RLS Policies for recommendations table (private recommendations)
CREATE POLICY "Users can view their own recommendations" ON public.recommendations
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage recommendations" ON public.recommendations
  FOR ALL USING (auth.role() = 'service_role');

-- RLS Policies for comment_reactions table
CREATE POLICY "Users can manage their own comment reactions" ON public.comment_reactions
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view comment reactions on public posts" ON public.comment_reactions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.comments c
      JOIN public.posts p ON p.id = c.post_id
      WHERE c.id = comment_id AND p.is_public = true
    )
  );

-- RLS Policies for post_views table (private view tracking)
CREATE POLICY "Users can view their own post views" ON public.post_views
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Post authors can view their post analytics" ON public.post_views
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.posts p 
      WHERE p.id = post_id AND p.author_id = auth.uid()
    )
  );

CREATE POLICY "Service role can manage post views" ON public.post_views
  FOR ALL USING (auth.role() = 'service_role');

-- RLS Policies for customers table (private billing)
CREATE POLICY "Users can view their own customer data" ON public.customers
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Service role can manage customer data" ON public.customers
  FOR ALL USING (auth.role() = 'service_role');

-- RLS Policies for interactions table (private user behavior)
CREATE POLICY "Users can view their own interactions" ON public.interactions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own interactions" ON public.interactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role can manage interactions" ON public.interactions
  FOR ALL USING (auth.role() = 'service_role');

-- RLS Policies for featured_posts table
CREATE POLICY "Users can view featured posts for public entities" ON public.featured_posts
  FOR SELECT USING (
    (owner_type = 'user' AND EXISTS (
      SELECT 1 FROM public.users u WHERE u.id = owner_id AND u.is_profile_public = true
    )) OR
    (owner_type = 'collective' AND EXISTS (
      SELECT 1 FROM public.collectives c WHERE c.id = owner_id
    ))
  );

CREATE POLICY "Entity owners can manage their featured posts" ON public.featured_posts
  FOR ALL USING (
    (owner_type = 'user' AND auth.uid() = owner_id) OR
    (owner_type = 'collective' AND EXISTS (
      SELECT 1 FROM public.collective_members cm
      WHERE cm.collective_id = owner_id 
      AND cm.member_id = auth.uid() 
      AND cm.role IN ('admin', 'owner')
    ))
  );

-- =====================================================
-- PHASE 2: CRITICAL PERFORMANCE FIXES (INDEXES)
-- =====================================================

-- Fix recommendations table (0 indexes currently!)
CREATE INDEX IF NOT EXISTS idx_recommendations_user_id ON public.recommendations(user_id);
CREATE INDEX IF NOT EXISTS idx_recommendations_score ON public.recommendations(score DESC);
CREATE INDEX IF NOT EXISTS idx_recommendations_created_at ON public.recommendations(created_at DESC);

-- Add compound indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_collective_members_collective_user ON public.collective_members(collective_id, member_id);
CREATE INDEX IF NOT EXISTS idx_collective_members_user_role ON public.collective_members(member_id, role);
CREATE INDEX IF NOT EXISTS idx_follows_compound ON public.follows(follower_id, following_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_follows_following_compound ON public.follows(following_id, following_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_post_reactions_compound ON public.post_reactions(post_id, type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_post_reactions_user ON public.post_reactions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_status ON public.subscriptions(user_id, status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_target ON public.subscriptions(target_entity_id, target_entity_type);
CREATE INDEX IF NOT EXISTS idx_post_bookmarks_user ON public.post_bookmarks(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_comment_reactions_comment ON public.comment_reactions(comment_id, type);
CREATE INDEX IF NOT EXISTS idx_comment_reactions_user ON public.comment_reactions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_post_views_post ON public.post_views(post_id, viewed_at DESC);
CREATE INDEX IF NOT EXISTS idx_post_views_user ON public.post_views(user_id, viewed_at DESC);
CREATE INDEX IF NOT EXISTS idx_interactions_user_type ON public.interactions(user_id, interaction_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_interactions_entity ON public.interactions(entity_id, entity_type);
CREATE INDEX IF NOT EXISTS idx_featured_posts_owner ON public.featured_posts(owner_id, owner_type, display_order);

-- =====================================================
-- PHASE 3: DATA INTEGRITY IMPROVEMENTS
-- =====================================================

-- Add check constraints for data validation (with error handling)
DO $$
BEGIN
  -- Add follows constraint
  BEGIN
    ALTER TABLE public.follows ADD CONSTRAINT follows_following_type_check 
      CHECK (following_type IN ('user', 'collective'));
  EXCEPTION
    WHEN duplicate_object THEN
      RAISE NOTICE 'Constraint follows_following_type_check already exists, skipping';
  END;

  -- Add post_reactions constraint
  BEGIN
    ALTER TABLE public.post_reactions ADD CONSTRAINT post_reactions_type_check 
      CHECK (type IN ('like', 'dislike', 'love', 'laugh', 'angry', 'sad'));
  EXCEPTION
    WHEN duplicate_object THEN
      RAISE NOTICE 'Constraint post_reactions_type_check already exists, skipping';
  END;

  -- Add comment_reactions constraint
  BEGIN
    ALTER TABLE public.comment_reactions ADD CONSTRAINT comment_reactions_type_check 
      CHECK (type IN ('like', 'dislike', 'love', 'laugh', 'angry', 'sad'));
  EXCEPTION
    WHEN duplicate_object THEN
      RAISE NOTICE 'Constraint comment_reactions_type_check already exists, skipping';
  END;

  -- Add interactions entity_type constraint
  BEGIN
    ALTER TABLE public.interactions ADD CONSTRAINT interactions_entity_type_check 
      CHECK (entity_type IN ('collective', 'post', 'user'));
  EXCEPTION
    WHEN duplicate_object THEN
      RAISE NOTICE 'Constraint interactions_entity_type_check already exists, skipping';
  END;

  -- Add interactions interaction_type constraint
  BEGIN
    ALTER TABLE public.interactions ADD CONSTRAINT interactions_interaction_type_check 
      CHECK (interaction_type IN ('like', 'unlike', 'recommended_interested', 'recommended_not_interested', 'view', 'share', 'comment'));
  EXCEPTION
    WHEN duplicate_object THEN
      RAISE NOTICE 'Constraint interactions_interaction_type_check already exists, skipping';
  END;

  -- Add featured_posts constraint
  BEGIN
    ALTER TABLE public.featured_posts ADD CONSTRAINT featured_posts_owner_type_check 
      CHECK (owner_type IN ('user', 'collective'));
  EXCEPTION
    WHEN duplicate_object THEN
      RAISE NOTICE 'Constraint featured_posts_owner_type_check already exists, skipping';
  END;

  -- Add unique constraint for recommendations
  BEGIN
    ALTER TABLE public.recommendations ADD CONSTRAINT recommendations_user_collective_unique 
      UNIQUE (user_id, suggested_collective_id);
  EXCEPTION
    WHEN duplicate_object THEN
      RAISE NOTICE 'Constraint recommendations_user_collective_unique already exists, skipping';
  END;
END $$;

-- =====================================================
-- PHASE 4: CONSISTENCY IMPROVEMENTS
-- =====================================================

-- Create updated_at function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Add updated_at column to tables that need it
ALTER TABLE public.recommendations ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
ALTER TABLE public.follows ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
ALTER TABLE public.post_bookmarks ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
ALTER TABLE public.post_reactions ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
ALTER TABLE public.comment_reactions ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
ALTER TABLE public.post_views ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
ALTER TABLE public.interactions ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
ALTER TABLE public.featured_posts ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Add triggers with error handling
DO $$
BEGIN
  -- Collective members trigger
  BEGIN
    CREATE TRIGGER update_collective_members_updated_at 
      BEFORE UPDATE ON public.collective_members 
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  EXCEPTION
    WHEN duplicate_object THEN
      RAISE NOTICE 'Trigger update_collective_members_updated_at already exists, skipping';
  END;

  -- Subscriptions trigger
  BEGIN
    CREATE TRIGGER update_subscriptions_updated_at 
      BEFORE UPDATE ON public.subscriptions 
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  EXCEPTION
    WHEN duplicate_object THEN
      RAISE NOTICE 'Trigger update_subscriptions_updated_at already exists, skipping';
  END;

  -- Recommendations trigger
  BEGIN
    CREATE TRIGGER update_recommendations_updated_at 
      BEFORE UPDATE ON public.recommendations 
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  EXCEPTION
    WHEN duplicate_object THEN
      RAISE NOTICE 'Trigger update_recommendations_updated_at already exists, skipping';
  END;

  -- Follows trigger
  BEGIN
    CREATE TRIGGER update_follows_updated_at 
      BEFORE UPDATE ON public.follows 
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  EXCEPTION
    WHEN duplicate_object THEN
      RAISE NOTICE 'Trigger update_follows_updated_at already exists, skipping';
  END;

  -- Post bookmarks trigger
  BEGIN
    CREATE TRIGGER update_post_bookmarks_updated_at 
      BEFORE UPDATE ON public.post_bookmarks 
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  EXCEPTION
    WHEN duplicate_object THEN
      RAISE NOTICE 'Trigger update_post_bookmarks_updated_at already exists, skipping';
  END;

  -- Post reactions trigger
  BEGIN
    CREATE TRIGGER update_post_reactions_updated_at 
      BEFORE UPDATE ON public.post_reactions 
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  EXCEPTION
    WHEN duplicate_object THEN
      RAISE NOTICE 'Trigger update_post_reactions_updated_at already exists, skipping';
  END;

  -- Comment reactions trigger
  BEGIN
    CREATE TRIGGER update_comment_reactions_updated_at 
      BEFORE UPDATE ON public.comment_reactions 
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  EXCEPTION
    WHEN duplicate_object THEN
      RAISE NOTICE 'Trigger update_comment_reactions_updated_at already exists, skipping';
  END;

  -- Post views trigger
  BEGIN
    CREATE TRIGGER update_post_views_updated_at 
      BEFORE UPDATE ON public.post_views 
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  EXCEPTION
    WHEN duplicate_object THEN
      RAISE NOTICE 'Trigger update_post_views_updated_at already exists, skipping';
  END;

  -- Interactions trigger
  BEGIN
    CREATE TRIGGER update_interactions_updated_at 
      BEFORE UPDATE ON public.interactions 
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  EXCEPTION
    WHEN duplicate_object THEN
      RAISE NOTICE 'Trigger update_interactions_updated_at already exists, skipping';
  END;

  -- Featured posts trigger
  BEGIN
    CREATE TRIGGER update_featured_posts_updated_at 
      BEFORE UPDATE ON public.featured_posts 
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  EXCEPTION
    WHEN duplicate_object THEN
      RAISE NOTICE 'Trigger update_featured_posts_updated_at already exists, skipping';
  END;
END $$;

-- =====================================================
-- GRANT PERMISSIONS
-- =====================================================

-- Grant permissions for new RLS-enabled tables
GRANT SELECT, INSERT, UPDATE, DELETE ON public.follows TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.post_bookmarks TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.post_reactions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.collective_members TO authenticated;
GRANT SELECT ON public.subscriptions TO authenticated;
GRANT SELECT ON public.recommendations TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.comment_reactions TO authenticated;
GRANT SELECT ON public.post_views TO authenticated;
GRANT SELECT ON public.customers TO authenticated;
GRANT SELECT, INSERT ON public.interactions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.featured_posts TO authenticated;

-- Grant service role permissions for admin operations
GRANT ALL ON public.subscriptions TO service_role;
GRANT ALL ON public.recommendations TO service_role;
GRANT ALL ON public.post_views TO service_role;
GRANT ALL ON public.customers TO service_role;
GRANT ALL ON public.interactions TO service_role;

-- Grant usage on sequences
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================

-- Log migration completion
DO $$
BEGIN
  RAISE NOTICE 'Comprehensive database improvements migration completed successfully!';
  RAISE NOTICE 'Applied: Security (RLS), Performance (Indexes), Data Integrity, and Consistency improvements';
END $$; 