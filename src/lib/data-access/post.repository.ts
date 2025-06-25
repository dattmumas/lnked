import { createBrowserClient, createServerClient } from '@supabase/ssr';

import type { Database } from '@/lib/database.types';
import { 
  parsePost, 
  parsePosts, 
  parsePostsWithAuthor,
  PostInsertSchema,
  PostUpdateSchema,
  type Post, 
  type PostInsert, 
  type PostUpdate,
  type PostWithAuthor,
  type PostReaction,
  type PostBookmark
} from './schemas/post.schema';
import { createTenantAwareRepository, getCurrentTenantId } from './tenant-aware';

/**
 * Post Repository
 * 
 * Handles all post-related database operations with automatic null/undefined conversion.
 * Use this instead of direct Supabase calls to maintain ESLint compliance.
 */
export class PostRepository {
  constructor(private supabase: ReturnType<typeof createBrowserClient<Database>> | ReturnType<typeof createServerClient<Database>>) {}

  /**
   * Get a single post by ID
   */
  async getById(id: string): Promise<Post | undefined> {
    const { data, error } = await this.supabase
      .from('posts')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      return undefined;
    }

    return parsePost(data);
  }

  /**
   * Get a post by slug with author info
   */
  async getBySlug(slug: string): Promise<PostWithAuthor | undefined> {
    const { data, error } = await this.supabase
      .from('posts')
      .select(`
        *,
        author_info:users!author_id (
          id,
          username,
          full_name,
          avatar_url
        )
      `)
      .eq('id', slug)
      .single();

    if (error || !data) {
      return undefined;
    }

    return parsePostsWithAuthor([data])[0];
  }

  /**
   * Get posts by author
   */
  async getByAuthor(authorId: string, limit = 10): Promise<Post[]> {
    const { data, error } = await this.supabase
      .from('posts')
      .select('*')
      .eq('author_id', authorId)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error || !data) {
      return [];
    }

    return parsePosts(data);
  }

  /**
   * Get posts by collective
   */
  async getByCollective(collectiveId: string, limit = 10): Promise<Post[]> {
    const { data, error } = await this.supabase
      .from('posts')
      .select('*')
      .eq('collective_id', collectiveId)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error || !data) {
      return [];
    }

    return parsePosts(data);
  }

  /**
   * Create a new post
   */
  async create(post: PostInsert): Promise<Post | undefined> {
    const dbPost = PostInsertSchema.parse(post);
    
    const tenantRepo = await createTenantAwareRepository();
    const { data, error } = await tenantRepo.insertPost(dbPost);

    if (error !== null) {
      throw error;
    }

    return parsePost(data);
  }

  /**
   * Update a post
   */
  async update(id: string, updates: PostUpdate): Promise<Post | undefined> {
    const dbUpdates = PostUpdateSchema.parse(updates);
    
    const { data, error } = await this.supabase
      .from('posts')
      .update(dbUpdates)
      .eq('id', id)
      .select()
      .single();

    if (error || !data) {
      return undefined;
    }

    return parsePost(data);
  }

  /**
   * Delete a post (soft delete by setting status to 'removed')
   */
  async delete(id: string): Promise<boolean> {
    const { error } = await this.supabase
      .from('posts')
      .update({ status: 'removed' })
      .eq('id', id);

    return !error;
  }

  /**
   * Add a reaction to a post
   */
  async addReaction(postId: string, userId: string, type = 'like'): Promise<boolean> {
    const tenantRepo = await createTenantAwareRepository();
    const { error } = await tenantRepo.upsertPostReaction({
      post_id: postId,
      user_id: userId,
      type,
      created_at: new Date().toISOString()
    });

    return !error;
  }

  /**
   * Remove a reaction from a post
   */
  async removeReaction(postId: string, userId: string, type = 'like'): Promise<boolean> {
    const { error } = await this.supabase
      .from('post_reactions')
      .delete()
      .match({
        post_id: postId,
        user_id: userId,
        type
      });

    return !error;
  }

  /**
   * Add a bookmark
   */
  async addBookmark(postId: string, userId: string): Promise<boolean> {
    const { error } = await this.supabase
      .from('post_bookmarks')
      .insert({
        post_id: postId,
        user_id: userId,
        created_at: new Date().toISOString()
      });

    return !error;
  }

  /**
   * Remove a bookmark
   */
  async removeBookmark(postId: string, userId: string): Promise<boolean> {
    const { error } = await this.supabase
      .from('post_bookmarks')
      .delete()
      .match({
        post_id: postId,
        user_id: userId
      });

    return !error;
  }

  /**
   * Get user's bookmarked posts
   */
  async getUserBookmarks(userId: string, limit = 20): Promise<PostWithAuthor[]> {
    const { data, error } = await this.supabase
      .from('post_bookmarks')
      .select(`
        posts!inner (
          *,
          author_info:users!author_id (
            id,
            username,
            full_name,
            avatar_url
          )
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error || !data) {
      return [];
    }

    // Extract posts from the join result
    const posts = data.map(item => (item as any).posts);
    return parsePostsWithAuthor(posts);
  }

  /**
   * Search posts by title or content
   */
  async search(query: string, limit = 10): Promise<Post[]> {
    const { data, error } = await this.supabase
      .from('posts')
      .select('*')
      .textSearch('tsv', query)
      .eq('status', 'active')
      .limit(limit);

    if (error || !data) {
      return [];
    }

    return parsePosts(data);
  }

  /**
   * Delete posts by collective (used when deleting a collective)
   * NOTE: This is a hard delete, use with caution
   */
  async deleteByCollective(collectiveId: string): Promise<boolean> {
    const { error } = await this.supabase
      .from('posts')
      .delete()
      .eq('collective_id', collectiveId);

    return !error;
  }
} 