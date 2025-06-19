import { createBrowserClient, createServerClient } from '@supabase/ssr';

import type { Database } from '@/lib/database.types';
import { 
  parseFollow, 
  parseFollows,
  parseFollowsWithUser,
  type Follow, 
  type FollowInput,
  type FollowWithUser
} from './schemas/follow.schema';

/**
 * Follow Repository
 * 
 * Handles all follow-related database operations with automatic null/undefined conversion.
 */
export class FollowRepository {
  constructor(private supabase: ReturnType<typeof createBrowserClient<Database>> | ReturnType<typeof createServerClient<Database>>) {}

  /**
   * Follow a user or collective
   */
  async follow(input: FollowInput): Promise<boolean> {
    const { error } = await this.supabase
      .from('follows')
      .insert({
        follower_id: input.follower_id,
        following_id: input.following_id,
        following_type: input.following_type,
      });

    return !error;
  }

  /**
   * Unfollow a user or collective
   */
  async unfollow(followerId: string, followingId: string, followingType: 'user' | 'collective'): Promise<boolean> {
    const { error } = await this.supabase
      .from('follows')
      .delete()
      .match({
        follower_id: followerId,
        following_id: followingId,
        following_type: followingType,
      });

    return !error;
  }

  /**
   * Check if a user is following another user or collective
   */
  async isFollowing(followerId: string, followingId: string, followingType: 'user' | 'collective'): Promise<boolean> {
    const { data, error } = await this.supabase
      .from('follows')
      .select('follower_id')
      .match({
        follower_id: followerId,
        following_id: followingId,
        following_type: followingType,
      })
      .single();

    return !error && data !== undefined;
  }

  /**
   * Get followers of a user or collective
   */
  async getFollowers(entityId: string, entityType: 'user' | 'collective', limit = 20): Promise<FollowWithUser[]> {
    const { data, error } = await this.supabase
      .from('follows')
      .select(`
        *,
        follower:users!follower_id (
          id,
          username,
          full_name,
          avatar_url
        )
      `)
      .eq('following_id', entityId)
      .eq('following_type', entityType)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error || !data) {
      return [];
    }

    return parseFollowsWithUser(data);
  }

  /**
   * Get users/collectives that a user is following
   */
  async getFollowing(userId: string, entityType?: 'user' | 'collective', limit = 20): Promise<FollowWithUser[]> {
    let query = this.supabase
      .from('follows')
      .select(`
        *,
        following_user:users!following_id (
          id,
          username,
          full_name,
          avatar_url
        )
      `)
      .eq('follower_id', userId);

    if (entityType) {
      query = query.eq('following_type', entityType);
    }

    const { data, error } = await query
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error || !data) {
      return [];
    }

    return parseFollowsWithUser(data);
  }

  /**
   * Get follower count for a user or collective
   */
  async getFollowerCount(entityId: string, entityType: 'user' | 'collective'): Promise<number> {
    const { count, error } = await this.supabase
      .from('follows')
      .select('*', { count: 'exact', head: true })
      .eq('following_id', entityId)
      .eq('following_type', entityType);

    if (error || count === undefined || count === null) {
      return 0;
    }

    return count;
  }

  /**
   * Get following count for a user
   */
  async getFollowingCount(userId: string, entityType?: 'user' | 'collective'): Promise<number> {
    let query = this.supabase
      .from('follows')
      .select('*', { count: 'exact', head: true })
      .eq('follower_id', userId);

    if (entityType) {
      query = query.eq('following_type', entityType);
    }

    const { count, error } = await query;

    if (error || count === undefined || count === null) {
      return 0;
    }

    return count;
  }

  /**
   * Get mutual followers between two users
   */
  async getMutualFollowers(userId1: string, userId2: string, limit = 10): Promise<string[]> {
    // Get followers of both users
    const [followers1, followers2] = await Promise.all([
      this.getFollowers(userId1, 'user', 1000),
      this.getFollowers(userId2, 'user', 1000),
    ]);

    // Find mutual followers
    const followerIds1 = new Set(followers1.map(f => f.follower_id));
    const mutualIds = followers2
      .filter(f => followerIds1.has(f.follower_id))
      .map(f => f.follower_id)
      .slice(0, limit);

    return mutualIds;
  }
} 