import { createBrowserClient } from '@supabase/ssr';

import { parseUser, parseUsers, UserInsertSchema, type User, type UserInsert } from './schemas/user.schema';

import type { Database } from '@/lib/database.types';

/**
 * User Repository
 * 
 * This repository provides a clean interface for user data access.
 * All database results are parsed through Zod schemas that transform
 * null values to undefined, ensuring ESLint compliance throughout the app.
 * 
 * NOTE: When clearing a field (e.g., removing a user's bio), pass null
 * explicitly to the update method. The schema will handle the conversion.
 */
export class UserRepository {
  constructor(private supabase: ReturnType<typeof createBrowserClient<Database>>) {}

  /**
   * Get a single user by ID
   */
  async getById(id: string): Promise<User | undefined> {
    const { data, error } = await this.supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .single();

    if (error !== undefined || data === undefined) {
      return undefined;
    }

    return parseUser(data);
  }

  /**
   * Get a user by username
   */
  async getByUsername(username: string): Promise<User | undefined> {
    const { data, error } = await this.supabase
      .from('users')
      .select('*')
      .eq('username', username)
      .single();

    if (error || !data) {
      return undefined;
    }

    return parseUser(data);
  }

  /**
   * Get multiple users by IDs
   */
  async getByIds(ids: string[]): Promise<User[]> {
    const { data, error } = await this.supabase
      .from('users')
      .select('*')
      .in('id', ids);

    if (error || !data) {
      return [];
    }

    return parseUsers(data);
  }

  /**
   * Update a user
   * 
   * @param id - User ID
   * @param updates - Fields to update. To clear a field, pass undefined.
   * @example
   * // Clear user's bio
   * await userRepo.update(userId, { bio: undefined });
   */
  async update(id: string, updates: Partial<UserInsert>): Promise<User | undefined> {
    // Transform undefined to null for database
    const dbUpdates = UserInsertSchema.parse(updates);
    
    const { data, error } = await this.supabase
      .from('users')
      .update(dbUpdates)
      .eq('id', id)
      .select()
      .single();

    if (error || !data) {
      return undefined;
    }

    return parseUser(data);
  }

  /**
   * Search users by query
   */
  async search(query: string, limit = 10): Promise<User[]> {
    const { data, error } = await this.supabase
      .from('users')
      .select('*')
      .or(`username.ilike.%${query}%,full_name.ilike.%${query}%`)
      .limit(limit);

    if (error || !data) {
      return [];
    }

    return parseUsers(data);
  }
} 