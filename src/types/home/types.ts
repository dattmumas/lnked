import type { User } from '@supabase/supabase-js';

export interface UserProfile {
  id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
}

export interface HomePageClientProps {
  user: User;
  profile: UserProfile | null;
}

export interface FeedItem {
  id: string;
  type: 'post' | 'video';
  title: string;
  content?: string;
  author: {
    name: string;
    username: string;
    avatar_url?: string;
  };
  published_at: string;
  stats: {
    likes: number;
    dislikes: number;
    views?: number;
  };
  userInteraction?: {
    liked: boolean;
    disliked: boolean;
    bookmarked: boolean;
  };
  thumbnail_url?: string | null;
  duration?: string;
  metadata?: {
    playbackId?: string;
    status?: string;
    videoAssetId?: string;
  };
  collective?: {
    name: string;
    slug: string;
  };
  // Tenant information for multi-tenant support
  tenant?: {
    id: string;
    name: string;
    type: 'personal' | 'collective';
  };
}

export interface ChainItem {
  id: string;
  user: {
    name: string;
    username: string;
    avatar_url?: string;
  };
  content: string;
  timestamp: string;
  type: 'post' | 'reply' | 'share';
  stats: {
    likes: number;
    replies: number;
    shares: number;
  };
  userInteraction?: {
    liked: boolean;
  };
  showReplyForm?: boolean;
}
