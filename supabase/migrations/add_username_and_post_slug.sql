-- Migration: Add username to users and slug to posts
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS username text UNIQUE;
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username ON public.users(username);

ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS slug text UNIQUE;
CREATE UNIQUE INDEX IF NOT EXISTS idx_posts_slug ON public.posts(slug);
