import { createBrowserClient, createServerClient } from '@supabase/ssr';

import { 
  parseComment,
  parseComments,
  parseCommentsWithAuthor,
  CommentInsertSchema,
  type Comment,
  type CommentInsert,
  type CommentWithAuthor,
  type CommentReaction
} from './schemas/comment.schema';

import type { Database } from '@/lib/database.types';

/**
 * Comment Repository
 * 
 * Handles all comment-related database operations.
 */
export class CommentRepository {
  constructor(private supabase: ReturnType<typeof createBrowserClient<Database>> | ReturnType<typeof createServerClient<Database>>) {}

  /**
   * Create a new comment
   */
  async create(comment: CommentInsert): Promise<Comment | undefined> {
    const dbComment = CommentInsertSchema.parse(comment);
    
    const { data, error } = await this.supabase
      .from('comments_v2')
      .insert(dbComment)
      .select()
      .single();

    if (error !== undefined || data === undefined) {
      return undefined;
    }

    return parseComment(data);
  }

  /**
   * Get comments for an entity
   */
  async getByEntity(entityType: string, entityId: string, limit = 50): Promise<CommentWithAuthor[]> {
    const { data, error } = await this.supabase
      .from('comments_v2')
      .select(`
        *,
        author:users!author_id (
          id,
          username,
          full_name,
          avatar_url
        )
      `)
      .eq('entity_type', entityType)
      .eq('entity_id', entityId)
      .is('parent_id', null)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error !== undefined || data === undefined) {
      return [];
    }

    // Get reaction counts and user reactions if needed
    const commentIds = data.map((c: any) => c.id);
    const reactions = await this.getReactionCounts(commentIds);
    
    // Merge reaction data with comments
    const commentsWithReactions = data.map((comment: any) => ({
      ...comment,
      reaction_counts: reactions.get(comment.id) || [],
    }));

    return parseCommentsWithAuthor(commentsWithReactions);
  }

  /**
   * Get replies to a comment
   */
  async getReplies(parentId: string, limit = 20): Promise<CommentWithAuthor[]> {
    const { data, error } = await this.supabase
      .from('comments_v2')
      .select(`
        *,
        author:users!author_id (
          id,
          username,
          full_name,
          avatar_url
        )
      `)
      .eq('parent_id', parentId)
      .is('deleted_at', null)
      .order('created_at', { ascending: true })
      .limit(limit);

    if (error !== undefined || data === undefined) {
      return [];
    }

    return parseCommentsWithAuthor(data);
  }

  /**
   * Update a comment
   */
  async update(commentId: string, content: string): Promise<Comment | undefined> {
    const { data, error } = await this.supabase
      .from('comments_v2')
      .update({
        content,
        updated_at: new Date().toISOString(),
      })
      .eq('id', commentId)
      .select()
      .single();

    if (error !== undefined || data === undefined) {
      return undefined;
    }

    return parseComment(data);
  }

  /**
   * Delete a comment (soft delete)
   */
  async delete(commentId: string): Promise<boolean> {
    const { error } = await this.supabase
      .from('comments_v2')
      .update({
        deleted_at: new Date().toISOString(),
      })
      .eq('id', commentId);

    return error === undefined;
  }

  /**
   * Add a reaction to a comment
   */
  async addReaction(commentId: string, userId: string, reactionType: string): Promise<boolean> {
    const { error } = await this.supabase
      .from('comment_reactions')
      .upsert({
        comment_id: commentId,
        user_id: userId,
        reaction_type: reactionType,
      });

    return error === undefined;
  }

  /**
   * Remove a reaction from a comment
   */
  async removeReaction(commentId: string, userId: string, reactionType: string): Promise<boolean> {
    const { error } = await this.supabase
      .from('comment_reactions')
      .delete()
      .match({
        comment_id: commentId,
        user_id: userId,
        reaction_type: reactionType,
      });

    return error === undefined;
  }

  /**
   * Get reaction counts for comments
   */
  private async getReactionCounts(commentIds: string[]): Promise<Map<string, { reaction_type: string; count: number }[]>> {
    const { data, error } = await this.supabase
      .from('comment_reactions')
      .select('comment_id, reaction_type')
      .in('comment_id', commentIds);

    if (error !== undefined || data === undefined) {
      return new Map();
    }

    // Group reactions by comment and type
    const reactionMap = new Map<string, Map<string, number>>();
    
    for (const reaction of data) {
      const commentId = reaction.comment_id;
      const type = reaction.reaction_type;
      
      if (!reactionMap.has(commentId)) {
        reactionMap.set(commentId, new Map());
      }
      
      const typeMap = reactionMap.get(commentId)!;
      typeMap.set(type, (typeMap.get(type) || 0) + 1);
    }

    // Convert to the desired format
    const result = new Map<string, { reaction_type: string; count: number }[]>();
    
    for (const [commentId, typeMap] of reactionMap) {
      const counts = Array.from(typeMap.entries()).map(([reaction_type, count]) => ({
        reaction_type,
        count,
      }));
      result.set(commentId, counts);
    }

    return result;
  }

  /**
   * Get user reactions for comments
   */
  async getUserReactions(userId: string, commentIds: string[]): Promise<Map<string, Set<string>>> {
    const { data, error } = await this.supabase
      .from('comment_reactions')
      .select('comment_id, reaction_type')
      .eq('user_id', userId)
      .in('comment_id', commentIds);

    if (error !== undefined || data === undefined) {
      return new Map();
    }

    const reactionMap = new Map<string, Set<string>>();
    
    for (const reaction of data) {
      const commentId = reaction.comment_id;
      const type = reaction.reaction_type;
      
      if (!reactionMap.has(commentId)) {
        reactionMap.set(commentId, new Set());
      }
      
      reactionMap.get(commentId)!.add(type);
    }

    return reactionMap;
  }

  /**
   * Pin/unpin a comment
   */
  async setPinned(commentId: string, isPinned: boolean): Promise<boolean> {
    const { error } = await this.supabase
      .from('comments_v2')
      .update({ is_pinned: isPinned })
      .eq('id', commentId);

    return error === undefined;
  }
} 