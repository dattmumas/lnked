import { createBrowserClient, createServerClient } from '@supabase/ssr';
import { z } from 'zod';

import { 
  parseComment,
  parseComments,
  parseCommentsWithAuthor,
  CommentInsertSchema,
  CommentReactionTypeEnum,
  MetadataSchema,
  type Comment,
  type CommentInsert,
  type CommentWithAuthor,
  type CommentReaction,
  type CommentMetadata
} from './schemas/comment.schema';
import { HttpError, HttpStatusCode } from '@/lib/constants/errors';
import type { Database } from '@/lib/database.types';

// Repository-specific error types
export class CommentRepositoryError extends HttpError {
  constructor(message: string, status: HttpStatusCode = HttpStatusCode.InternalServerError, public context?: Record<string, unknown>) {
    super(status, message);
    this.name = 'CommentRepositoryError';
  }
}

export class CommentNotFoundError extends CommentRepositoryError {
  constructor(commentId: string) {
    super(`Comment not found: ${commentId}`, HttpStatusCode.NotFound, { commentId });
    this.name = 'CommentNotFoundError';
  }
}

export class CommentValidationError extends CommentRepositoryError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(`Validation failed: ${message}`, HttpStatusCode.UnprocessableEntity, details);
    this.name = 'CommentValidationError';
  }
}

// Configuration constants
const DEFAULT_COMMENT_LIMIT = 50;
const MAX_COMMENT_LIMIT = 100;
const DEFAULT_REPLY_LIMIT = 20;
const MAX_REPLY_LIMIT = 50;

// Entity types with proper typing
export const COMMENT_ENTITY_TYPES = ['video', 'post', 'collective', 'profile'] as const;
export type CommentEntityType = typeof COMMENT_ENTITY_TYPES[number];

// Reaction types from enum
export type ReactionType = z.infer<typeof CommentReactionTypeEnum>;

// Pagination types
export interface CommentPaginationParams {
  limit?: number;
  cursor?: string;
  createdBefore?: Date;
}

export interface CommentPaginationResult<T> {
  data: T[];
  nextCursor?: string;
  hasMore: boolean;
  totalCount?: number;
}

// Database result types (properly typed)
interface CommentWithAuthorRaw {
  id: string;
  entity_type: CommentEntityType;
  entity_id: string;
  user_id: string;
  content: string;
  parent_id: string | null;
  thread_depth: number | null;
  reply_count: number | null;
  metadata: CommentMetadata | null;
  created_at: string | null;
  updated_at: string | null;
  deleted_at: string | null;
  author: {
    id: string;
    username: string | null;
    full_name: string | null;
    avatar_url: string | null;
  } | null;
}

interface ReactionCountRaw {
  comment_id: string;
  reaction_type: ReactionType;
  count: number;
}

interface CommentWithReactionsRaw extends CommentWithAuthorRaw {
  reaction_counts?: ReactionCountRaw[];
  user_reactions?: ReactionType[];
}

// Client interface for dependency injection
interface SupabaseClient {
  from: ReturnType<typeof createBrowserClient<Database>>['from'] | ReturnType<typeof createServerClient<Database>>['from'];
  rpc: ReturnType<typeof createBrowserClient<Database>>['rpc'] | ReturnType<typeof createServerClient<Database>>['rpc'];
}

/**
 * Enhanced Comment Repository with comprehensive error handling, pagination, and performance optimizations
 * 
 * Key improvements:
 * - Proper type safety with Zod validation
 * - Cursor-based pagination for performance
 * - DB-side aggregations for reaction counts
 * - Comprehensive error handling with context
 * - Security through input validation and limits
 * - Observability through structured errors
 */
export class CommentRepository {
  constructor(
    private supabase: SupabaseClient,
    private logger?: (message: string, context?: Record<string, unknown>) => void
  ) {}

  /**
   * Create a new comment with full validation
   */
  async create(comment: CommentInsert, userId?: string): Promise<Comment> {
    try {
      // Validate input
      const validatedComment = CommentInsertSchema.parse(comment);
      
      // Validate metadata if present
      if (validatedComment.metadata) {
        MetadataSchema.parse(validatedComment.metadata);
      }

      // Security: Ensure user owns the comment being created
      if (userId && validatedComment.user_id !== userId) {
        throw new CommentRepositoryError(
          'User not authorized to create comment for different user',
          HttpStatusCode.Forbidden,
          { userId, commentUserId: validatedComment.user_id }
        );
      }

      const { data, error } = await this.supabase
        .from('comments')
        // @ts-expect-error tenant-migration: tenant_id will be automatically injected via repository pattern
        .insert(validatedComment)
        .select()
        .single();

      if (error) {
        this.logger?.('Comment creation failed', { error, comment: validatedComment });
        throw new CommentRepositoryError('Failed to create comment', HttpStatusCode.InternalServerError, { error });
      }

      if (!data) {
        throw new CommentRepositoryError('Comment creation returned no data', HttpStatusCode.InternalServerError);
      }

      const parsedComment = parseComment(data);
      this.logger?.('Comment created successfully', { commentId: parsedComment.id });
      
      return parsedComment;
    } catch (error) {
      if (error instanceof CommentRepositoryError) {
        throw error;
      }
      throw new CommentValidationError('Invalid comment data', { originalError: error });
    }
  }

  /**
   * Get comments for an entity with cursor-based pagination and DB-aggregated reactions
   */
  async getByEntity(
    entityType: CommentEntityType,
    entityId: string,
    options: CommentPaginationParams & { userId?: string; includeReactions?: boolean } = {}
  ): Promise<CommentPaginationResult<CommentWithAuthor>> {
    try {
      const { 
        limit = DEFAULT_COMMENT_LIMIT, 
        cursor, 
        createdBefore,
        userId,
        includeReactions = true 
      } = options;

      // Validate and clamp limit
      const clampedLimit = Math.min(limit, MAX_COMMENT_LIMIT);
      
      if (!COMMENT_ENTITY_TYPES.includes(entityType)) {
        throw new CommentValidationError(`Invalid entity type: ${entityType}`);
      }

      // Use optimized RPC function for efficient comment fetching with reactions
      const { data, error } = await (this.supabase as any)
        .rpc('get_entity_comments_with_reactions', {
          p_entity_type: entityType,
          p_entity_id: entityId,
          p_limit: clampedLimit + 1, // Fetch one extra to check if more exist
          p_cursor: cursor || null,
          p_created_before: createdBefore?.toISOString() || null,
          p_user_id: userId || null,
          p_include_reactions: includeReactions
        });

      if (error) {
        this.logger?.('Failed to fetch entity comments', {
          error,
          entityType,
          entityId,
        });
        throw new CommentRepositoryError('Failed to fetch comments', HttpStatusCode.InternalServerError, { error });
      }

      const comments = (data || []) as CommentWithReactionsRaw[];
      const hasMore = comments.length > clampedLimit;
      const resultComments = hasMore ? comments.slice(0, -1) : comments;

      // Generate next cursor from last item
      const nextCursor = hasMore && resultComments.length > 0 
        ? Buffer.from(`${resultComments[resultComments.length - 1].created_at}:${resultComments[resultComments.length - 1].id}`).toString('base64')
        : undefined;

      const parsedComments = parseCommentsWithAuthor(resultComments);

      this.logger?.('Entity comments fetched successfully', { 
        entityType, 
        entityId, 
        count: parsedComments.length,
        hasMore 
      });

      return {
        data: parsedComments,
        nextCursor,
        hasMore
      };
    } catch (error) {
      if (error instanceof CommentRepositoryError) {
        throw error;
      }
      throw new CommentRepositoryError('Failed to fetch entity comments', HttpStatusCode.InternalServerError, { error });
    }
  }

  /**
   * Get replies to a comment with pagination
   */
  async getReplies(
    parentId: string, 
    options: CommentPaginationParams & { userId?: string } = {}
  ): Promise<CommentPaginationResult<CommentWithAuthor>> {
    try {
      const { limit = DEFAULT_REPLY_LIMIT, cursor, userId } = options;
      const clampedLimit = Math.min(limit, MAX_REPLY_LIMIT);

      // Use optimized RPC function for efficient reply fetching with reactions
      const { data, error } = await (this.supabase as any)
        .rpc('get_comment_replies_with_reactions', {
          p_parent_id: parentId,
          p_limit: clampedLimit + 1,
          p_cursor: cursor || null,
          p_user_id: userId || null
        });

      if (error) {
        this.logger?.('Failed to fetch comment replies', { error, parentId });
        throw new CommentRepositoryError('Failed to fetch replies', HttpStatusCode.InternalServerError, { error });
      }

      const replies = (data || []) as CommentWithReactionsRaw[];
      const hasMore = replies.length > clampedLimit;
      const resultReplies = hasMore ? replies.slice(0, -1) : replies;

      const nextCursor = hasMore && resultReplies.length > 0
        ? Buffer.from(`${resultReplies[resultReplies.length - 1].created_at}:${resultReplies[resultReplies.length - 1].id}`).toString('base64')
        : undefined;

      const parsedReplies = parseCommentsWithAuthor(resultReplies);

      this.logger?.('Comment replies fetched successfully', { 
        parentId, 
        count: parsedReplies.length,
        hasMore 
      });

      return {
        data: parsedReplies,
        nextCursor,
        hasMore
      };
    } catch (error) {
      if (error instanceof CommentRepositoryError) {
        throw error;
      }
      throw new CommentRepositoryError('Failed to fetch comment replies', HttpStatusCode.InternalServerError, { error });
    }
  }

  /**
   * Update a comment with proper authorization
   */
  async update(commentId: string, content: string, userId?: string): Promise<Comment> {
    try {
      if (!content || content.trim().length === 0) {
        throw new CommentValidationError('Comment content cannot be empty');
      }

      // Security: Verify ownership if userId provided
      if (userId) {
        const existingComment = await this.getById(commentId);
        if (existingComment.user_id !== userId) {
          throw new CommentRepositoryError(
            'User not authorized to update this comment',
            HttpStatusCode.Forbidden,
            { commentId, userId }
          );
        }
      }

      const { data, error } = await this.supabase
        .from('comments')
        .update({
          content: content.trim(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', commentId)
        .is('deleted_at', null) // Only update non-deleted comments
        .select()
        .single();

      if (error) {
        this.logger?.('Comment update failed', { error, commentId });
        throw new CommentRepositoryError('Failed to update comment', HttpStatusCode.InternalServerError, { error });
      }

      if (!data) {
        throw new CommentNotFoundError(commentId);
      }

      const updatedComment = parseComment(data);
      this.logger?.('Comment updated successfully', { commentId });
      
      return updatedComment;
    } catch (error) {
      if (error instanceof CommentRepositoryError) {
        throw error;
      }
      throw new CommentRepositoryError('Failed to update comment', HttpStatusCode.InternalServerError, { error });
    }
  }

  /**
   * Delete a comment (soft delete) with authorization
   */
  async delete(commentId: string, userId?: string): Promise<void> {
    try {
      // Security: Verify ownership if userId provided
      if (userId) {
        const existingComment = await this.getById(commentId);
        if (existingComment.user_id !== userId) {
          throw new CommentRepositoryError(
            'User not authorized to delete this comment',
            HttpStatusCode.Forbidden,
            { commentId, userId }
          );
        }
      }

      const { error } = await this.supabase
        .from('comments')
        .update({
          deleted_at: new Date().toISOString(),
        })
        .eq('id', commentId)
        .is('deleted_at', null); // Only delete non-deleted comments

      if (error) {
        this.logger?.('Comment deletion failed', { error, commentId });
        throw new CommentRepositoryError('Failed to delete comment', HttpStatusCode.InternalServerError, { error });
      }

      this.logger?.('Comment deleted successfully', { commentId });
    } catch (error) {
      if (error instanceof CommentRepositoryError) {
        throw error;
      }
      throw new CommentRepositoryError('Failed to delete comment', HttpStatusCode.InternalServerError, { error });
    }
  }

  /**
   * Add a reaction to a comment with conflict handling
   */
  async addReaction(commentId: string, userId: string, reactionType: ReactionType): Promise<void> {
    try {
      // Validate reaction type
      CommentReactionTypeEnum.parse(reactionType);

      // Ensure comment exists and is not deleted
      await this.getById(commentId);

      // Use upsert with proper conflict resolution
      const { error } = await this.supabase
        .from('comment_reactions')
        .upsert({
          comment_id: commentId,
          user_id: userId,
          reaction_type: reactionType,
          created_at: new Date().toISOString()
        }, {
          onConflict: 'comment_id,user_id,reaction_type'
        });

      if (error) {
        this.logger?.('Failed to add comment reaction', { error, commentId, userId, reactionType });
        throw new CommentRepositoryError('Failed to add reaction', HttpStatusCode.InternalServerError, { error });
      }

      this.logger?.('Comment reaction added successfully', { commentId, userId, reactionType });
    } catch (error) {
      if (error instanceof CommentRepositoryError) {
        throw error;
      }
      throw new CommentRepositoryError('Failed to add comment reaction', HttpStatusCode.InternalServerError, { error });
    }
  }

  /**
   * Remove a reaction from a comment
   */
  async removeReaction(commentId: string, userId: string, reactionType: ReactionType): Promise<void> {
    try {
      CommentReactionTypeEnum.parse(reactionType);

      const { error } = await this.supabase
        .from('comment_reactions')
        .delete()
        .match({
          comment_id: commentId,
          user_id: userId,
          reaction_type: reactionType,
        });

      if (error) {
        this.logger?.('Failed to remove comment reaction', { error, commentId, userId, reactionType });
        throw new CommentRepositoryError('Failed to remove reaction', HttpStatusCode.InternalServerError, { error });
      }

      this.logger?.('Comment reaction removed successfully', { commentId, userId, reactionType });
    } catch (error) {
      if (error instanceof CommentRepositoryError) {
        throw error;
      }
      throw new CommentRepositoryError('Failed to remove comment reaction', HttpStatusCode.InternalServerError, { error });
    }
  }

  /**
   * Get user reactions for comments (for UI state)
   */
  async getUserReactions(userId: string, commentIds: string[]): Promise<Map<string, Set<ReactionType>>> {
    try {
      if (commentIds.length === 0) {
        return new Map();
      }

      const { data, error } = await this.supabase
        .from('comment_reactions')
        .select(`
          comment_id,
          reaction_type,
          comments!inner(id)
        `)
        .eq('user_id', userId)
        .in('comment_id', commentIds)
        .is('comments.deleted_at', null); // Only include reactions for non-deleted comments

      if (error) {
        this.logger?.('Failed to fetch user reactions', { error, userId, commentIds });
        throw new CommentRepositoryError('Failed to fetch user reactions', HttpStatusCode.InternalServerError, { error });
      }

      const reactionMap = new Map<string, Set<ReactionType>>();
      
      for (const reaction of (data || [])) {
        const commentId = reaction.comment_id;
        const type = reaction.reaction_type as ReactionType;
        
        if (!reactionMap.has(commentId)) {
          reactionMap.set(commentId, new Set());
        }
        
        reactionMap.get(commentId)!.add(type);
      }

      return reactionMap;
    } catch (error) {
      if (error instanceof CommentRepositoryError) {
        throw error;
      }
      throw new CommentRepositoryError('Failed to fetch user reactions', HttpStatusCode.InternalServerError, { error });
    }
  }

  /**
   * Get a single comment by ID
   */
  private async getById(commentId: string): Promise<Comment> {
    const { data, error } = await this.supabase
      .from('comments')
      .select('*')
      .eq('id', commentId)
      .is('deleted_at', null)
      .single();

    if (error || !data) {
      throw new CommentNotFoundError(commentId);
    }

    return parseComment(data);
  }

  /**
   * Get reaction counts for comments (DB-side aggregation)
   */
  private async getReactionCounts(commentIds: string[]): Promise<Map<string, ReactionCountRaw[]>> {
    if (commentIds.length === 0) {
      return new Map();
    }

    const { data, error } = await this.supabase
      .from('comment_reactions')
      .select('comment_id, reaction_type')
      .in('comment_id', commentIds);

    if (error || !data) {
      this.logger?.('Failed to fetch reaction counts', { error, commentIds });
      return new Map();
    }

    // Group and count reactions
    const reactionMap = new Map<string, Map<ReactionType, number>>();
    
    for (const reaction of data) {
      const commentId = reaction.comment_id;
      const type = reaction.reaction_type as ReactionType;
      
      if (!reactionMap.has(commentId)) {
        reactionMap.set(commentId, new Map());
      }
      
      const typeMap = reactionMap.get(commentId)!;
      typeMap.set(type, (typeMap.get(type) || 0) + 1);
    }

    // Convert to the desired format
    const result = new Map<string, ReactionCountRaw[]>();
    
    for (const [commentId, typeMap] of reactionMap) {
      const counts: ReactionCountRaw[] = Array.from(typeMap.entries()).map(([reaction_type, count]) => ({
        comment_id: commentId,
        reaction_type,
        count,
      }));
      result.set(commentId, counts);
    }

    return result;
  }
} 