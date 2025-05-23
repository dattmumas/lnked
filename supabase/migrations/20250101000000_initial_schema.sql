-- Initial schema migration: Create core tables

-- Create users table first (referenced by many other tables)
CREATE TABLE IF NOT EXISTS public.users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  avatar_url text,
  bio text,
  cover_image_url text,
  embedding text,
  full_name text,
  is_profile_public boolean DEFAULT true,
  pinned_post_id uuid,
  role text,
  show_comments boolean DEFAULT true,
  show_followers boolean DEFAULT true,
  show_subscriptions boolean DEFAULT true,
  social_links jsonb,
  stripe_account_id text,
  stripe_account_type text,
  stripe_customer_id text,
  tags text[],
  terms_accepted_at timestamptz,
  tsv tsvector,
  updated_at timestamptz DEFAULT now(),
  username text UNIQUE
);

-- Create collectives table
CREATE TABLE IF NOT EXISTS public.collectives (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cover_image_url text,
  created_at timestamptz DEFAULT now(),
  description text,
  governance_model text,
  intro_video_url text,
  logo_url text,
  name text NOT NULL,
  owner_id uuid REFERENCES public.users(id),
  pinned_post_id uuid,
  slug text UNIQUE NOT NULL,
  stripe_account_id text,
  stripe_account_type text,
  stripe_customer_id text,
  tags text[],
  tsv tsvector,
  updated_at timestamptz DEFAULT now()
);

-- Create posts table
CREATE TABLE IF NOT EXISTS public.posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author text,
  author_id uuid NOT NULL REFERENCES public.users(id),
  collective_id uuid REFERENCES public.collectives(id),
  content text,
  created_at timestamptz DEFAULT now(),
  dislike_count integer DEFAULT 0,
  is_public boolean DEFAULT false,
  like_count integer DEFAULT 0,
  meta_description text,
  published_at timestamptz,
  seo_title text,
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'removed')),
  subtitle text,
  title text NOT NULL,
  tsv tsvector,
  view_count integer DEFAULT 0
);

-- Create comments table
CREATE TABLE IF NOT EXISTS public.comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content text NOT NULL,
  created_at timestamptz DEFAULT now(),
  parent_id uuid REFERENCES public.comments(id),
  post_id uuid NOT NULL REFERENCES public.posts(id),
  updated_at timestamptz DEFAULT now(),
  user_id uuid NOT NULL REFERENCES public.users(id)
);

-- Create follows table
CREATE TABLE IF NOT EXISTS public.follows (
  created_at timestamptz DEFAULT now(),
  follower_id uuid NOT NULL REFERENCES public.users(id),
  following_id uuid NOT NULL,
  following_type text NOT NULL,
  PRIMARY KEY (follower_id, following_id, following_type)
);

-- Create post_reactions table
CREATE TABLE IF NOT EXISTS public.post_reactions (
  created_at timestamptz DEFAULT now(),
  post_id uuid NOT NULL REFERENCES public.posts(id),
  type text DEFAULT 'like',
  user_id uuid NOT NULL REFERENCES public.users(id),
  PRIMARY KEY (post_id, user_id, type)
);

-- Create comment_reactions table
CREATE TABLE IF NOT EXISTS public.comment_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id uuid NOT NULL REFERENCES public.comments(id),
  created_at timestamptz DEFAULT now(),
  type text NOT NULL,
  user_id uuid NOT NULL REFERENCES public.users(id)
);

-- Create post_bookmarks table
CREATE TABLE IF NOT EXISTS public.post_bookmarks (
  created_at timestamptz DEFAULT now(),
  post_id uuid NOT NULL REFERENCES public.posts(id),
  user_id uuid NOT NULL REFERENCES public.users(id),
  PRIMARY KEY (post_id, user_id)
);

-- Create post_views table
CREATE TABLE IF NOT EXISTS public.post_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.posts(id),
  user_id uuid REFERENCES public.users(id),
  viewed_at timestamptz DEFAULT now()
);

-- Create subscriptions table
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cancel_at timestamptz,
  cancel_at_period_end boolean DEFAULT false,
  canceled_at timestamptz,
  created timestamptz NOT NULL,
  current_period_end timestamptz NOT NULL,
  current_period_start timestamptz NOT NULL,
  ended_at timestamptz,
  inserted_at timestamptz DEFAULT now(),
  metadata jsonb,
  quantity integer,
  status text NOT NULL CHECK (status IN ('trialing', 'active', 'canceled', 'incomplete', 'incomplete_expired', 'past_due', 'unpaid', 'paused')),
  stripe_price_id text,
  target_entity_id uuid NOT NULL,
  target_entity_type text NOT NULL CHECK (target_entity_type IN ('user', 'collective')),
  trial_end timestamptz,
  trial_start timestamptz,
  updated_at timestamptz DEFAULT now(),
  user_id uuid NOT NULL REFERENCES public.users(id)
);

-- Create collective_members table
CREATE TABLE IF NOT EXISTS public.collective_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  collective_id uuid NOT NULL REFERENCES public.collectives(id),
  created_at timestamptz DEFAULT now(),
  member_id uuid NOT NULL REFERENCES public.users(id),
  member_type text DEFAULT 'user' CHECK (member_type IN ('user', 'collective')),
  role text DEFAULT 'author' CHECK (role IN ('admin', 'editor', 'author', 'owner')),
  share_percentage numeric,
  updated_at timestamptz DEFAULT now()
);

-- Create featured_posts table
CREATE TABLE IF NOT EXISTS public.featured_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  display_order integer DEFAULT 0,
  owner_id uuid NOT NULL,
  owner_type text NOT NULL,
  post_id uuid NOT NULL REFERENCES public.posts(id)
);

-- Create interactions table
CREATE TABLE IF NOT EXISTS public.interactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  entity_id uuid NOT NULL,
  entity_type text NOT NULL CHECK (entity_type IN ('collective', 'post', 'user')),
  interaction_type text NOT NULL CHECK (interaction_type IN ('like', 'unlike', 'recommended_interested', 'recommended_not_interested', 'view')),
  metadata jsonb,
  user_id uuid NOT NULL REFERENCES public.users(id)
);

-- Create customers table
CREATE TABLE IF NOT EXISTS public.customers (
  id uuid PRIMARY KEY REFERENCES public.users(id),
  stripe_customer_id text NOT NULL
);

-- Create recommendations table
CREATE TABLE IF NOT EXISTS public.recommendations (
  created_at timestamptz DEFAULT now(),
  score numeric NOT NULL,
  suggested_collective_id uuid NOT NULL REFERENCES public.collectives(id),
  user_id uuid NOT NULL REFERENCES public.users(id)
);

-- Add foreign key constraints that reference other tables
ALTER TABLE public.users ADD CONSTRAINT users_pinned_post_id_fkey 
  FOREIGN KEY (pinned_post_id) REFERENCES public.posts(id);

ALTER TABLE public.collectives ADD CONSTRAINT collectives_pinned_post_id_fkey 
  FOREIGN KEY (pinned_post_id) REFERENCES public.posts(id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_username ON public.users(username);
CREATE INDEX IF NOT EXISTS idx_users_updated_at ON public.users(updated_at);

CREATE INDEX IF NOT EXISTS idx_collectives_slug ON public.collectives(slug);
CREATE INDEX IF NOT EXISTS idx_collectives_owner_id ON public.collectives(owner_id);

CREATE INDEX IF NOT EXISTS idx_posts_author_id ON public.posts(author_id);
CREATE INDEX IF NOT EXISTS idx_posts_collective_id ON public.posts(collective_id);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON public.posts(created_at);
CREATE INDEX IF NOT EXISTS idx_posts_published_at ON public.posts(published_at);

CREATE INDEX IF NOT EXISTS idx_comments_post_id ON public.comments(post_id);
CREATE INDEX IF NOT EXISTS idx_comments_user_id ON public.comments(user_id);

CREATE INDEX IF NOT EXISTS idx_follows_follower_id ON public.follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_follows_following_id_type ON public.follows(following_id, following_type);

-- Enable Row Level Security on core tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collectives ENABLE ROW LEVEL SECURITY;

-- Create basic RLS policies for users table
CREATE POLICY "Users can view public profiles" ON public.users
  FOR SELECT USING (is_profile_public = true OR auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.users
  FOR UPDATE USING (auth.uid() = id);

-- Create basic RLS policies for posts table
CREATE POLICY "Public posts are viewable by everyone" ON public.posts
  FOR SELECT USING (is_public = true OR author_id = auth.uid());

CREATE POLICY "Users can insert their own posts" ON public.posts
  FOR INSERT WITH CHECK (author_id = auth.uid());

CREATE POLICY "Users can update their own posts" ON public.posts
  FOR UPDATE USING (author_id = auth.uid());

-- Create basic RLS policies for comments table
CREATE POLICY "Comments are viewable on public posts" ON public.comments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.posts p 
      WHERE p.id = post_id AND (p.is_public = true OR p.author_id = auth.uid())
    )
  );

CREATE POLICY "Users can insert comments on public posts" ON public.comments
  FOR INSERT WITH CHECK (
    user_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.posts p 
      WHERE p.id = post_id AND p.is_public = true
    )
  );

-- Create basic RLS policies for collectives table
CREATE POLICY "Collectives are viewable by everyone" ON public.collectives
  FOR SELECT USING (true);

CREATE POLICY "Users can create collectives" ON public.collectives
  FOR INSERT WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Collective owners can update their collectives" ON public.collectives
  FOR UPDATE USING (owner_id = auth.uid()); 