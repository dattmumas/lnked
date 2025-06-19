import { RealtimeChannel, SupabaseClient, PostgrestError } from '@supabase/supabase-js';

import { CommentValidationError } from '@/lib/errors';
import supabaseBrowser from '@/lib/supabase/browser';
import {
  Comment,
  CommentEntityType,
  CommentPin,
  CommentReaction,
  CommentWithAuthor,
  Reaction,
  ReactionType,
} from '@/types/comments-v2';

const DEFAULT_PAGE_LIMIT = 20;
const DEFAULT_REPLY_LIMIT = 10;

export class CommentsV2Service {
  private supabase: SupabaseClient;
  private entityValidators: Record<
    CommentEntityType,
    (entityId: string, userId?: string) => Promise<boolean>
  >;

  constructor(
    supabase?: SupabaseClient,
    entityValidators?: Partial<
      Record<
        CommentEntityType,
        (entityId: string, userId?: string) => Promise<boolean>
      >
    >
  ) {
    this.supabase = supabase || supabaseBrowser;

    const defaultValidator = (entityId: string): Promise<boolean> =>
      Promise.resolve(entityId !== '');

    this.entityValidators = {
      post: entityValidators?.post ?? defaultValidator,
      video: entityValidators?.video ?? defaultValidator,
      collective: entityValidators?.collective ?? defaultValidator,
      profile: entityValidators?.profile ?? defaultValidator,
    };
  }

  private validateEntity(
    entityType: CommentEntityType,
    entityId: string,
    userId?: string
  ): Promise<boolean> {
    const validator = this.entityValidators[entityType];
    if (validator === undefined) {
      throw new CommentValidationError(`Unsupported entity type: ${entityType}`);
    }
    return validator(entityId, userId);
  }

  async getComments(
    entityType: CommentEntityType,
    entityId: string,
    page = 1,
    limit = DEFAULT_PAGE_LIMIT
  ): Promise<CommentWithAuthor[]> {
    const offset = (page - 1) * limit;
    
    if (process.env.NODE_ENV !== 'production') {
      // eslint-disable-next-line no-console
      console.debug('Calling get_comment_thread with params:', {
        p_entity_type: entityType,
        p_entity_id: entityId,
        p_limit: limit,
        p_offset: offset,
      });
    }

    const threadResponse = await this.supabase.rpc<
      'get_comment_thread',
      { comment_data: CommentWithAuthor & { author?: unknown; user?: unknown } }
    >('get_comment_thread', {
      p_entity_type: entityType,
      p_entity_id: entityId,
      p_limit: limit,
      p_offset: offset,
    });

    const { data, error } = threadResponse as {
      data: Array<{ comment_data: CommentWithAuthor & { author?: unknown; user?: unknown } }> | null;
      error: PostgrestError | null;
    };

    if (process.env.NODE_ENV !== 'production') {
      // eslint-disable-next-line no-console
      console.debug('RPC response:', { data, error });
    }

    if (error !== null && error !== undefined) {
      console.error('Error fetching comments:', error);
      console.error('Error details:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
        fullError: JSON.stringify(error)
      });
      throw new Error(`Failed to fetch comments: ${error.message || error.details || JSON.stringify(error)}`);
    }

    type ThreadRow = { comment_data: CommentWithAuthor & { author?: unknown; user?: unknown } };
    const rows = (data ?? []) as ThreadRow[];
    const mappedComments = rows.map((row) => {
      const comment = row.comment_data;
      if (
        comment !== null &&
        typeof comment === 'object' &&
        Object.prototype.hasOwnProperty.call(comment, 'author')
      ) {
        // Preserve legacy field name for consumer components
        const nc = comment as unknown as Record<string, unknown>;
        nc.user = nc.author;
      }
      return comment as CommentWithAuthor;
    });
    return mappedComments;
  }

  async getCommentReplies(
    parentId: string,
    page = 1,
    limit = DEFAULT_REPLY_LIMIT
  ): Promise<CommentWithAuthor[]> {
    const offset = (page - 1) * limit;
    const repliesResponse = await this.supabase.rpc<
      'get_comment_replies',
      { comment_data: CommentWithAuthor }
    >('get_comment_replies', {
      p_parent_id: parentId,
      p_limit: limit,
      p_offset: offset,
    });

    const { data, error } = repliesResponse as {
      data: Array<{ comment_data: CommentWithAuthor }> | null;
      error: PostgrestError | null;
    };

    if (error !== null && error !== undefined) {
      console.error('Error fetching replies:', error);
      throw new Error(`Failed to fetch replies: ${error.message || JSON.stringify(error)}`);
    }

    type ReplyRow = { comment_data: CommentWithAuthor };
    const rows = (data ?? []) as ReplyRow[];
    return rows.map((row) => row.comment_data);
  }

  async addComment(
    entityType: CommentEntityType,
    entityId: string,
    userId: string,
    content: string,
    parentId?: string
  ): Promise<CommentWithAuthor | undefined> {
    const addCommentResponse = await this.supabase.rpc<
      'add_comment',
      { comment_id: string }
    >('add_comment', {
      p_entity_type: entityType,
      p_entity_id: entityId,
      p_user_id: userId,
      p_content: content.trim(),
      p_parent_id: parentId,
    });

    const { data, error } = addCommentResponse as {
      data: Array<{ comment_id: string }> | null;
      error: PostgrestError | null;
    };

    if (error !== null && error !== undefined) {
      console.error('Error adding comment:', error);
      throw new Error(
        `Failed to add comment: ${error.message || error.details || JSON.stringify(error)}`
      );
    }

    if (data === null || data === undefined) return undefined;

    const commentId =
      Array.isArray(data) &&
      data.length > 0 &&
      typeof data[0]?.comment_id === 'string'
        ? data[0].comment_id
        : undefined;

    if (typeof commentId !== 'string' || commentId.trim() === '') {
      return undefined;
    }

    const newCommentResponse = await this.supabase
      .from('comments')
      .select('*, author:users(*)')
      .eq('id', commentId)
      .single<CommentWithAuthor>();

    const {
      data: newComment,
      error: fetchError,
    }: { data: CommentWithAuthor | null; error: PostgrestError | null } = newCommentResponse;

    if (fetchError !== null && fetchError !== undefined) {
      console.error('Error fetching new comment:', fetchError);
      return undefined;
    }

    if (
      newComment !== null &&
      typeof newComment === 'object' &&
      Object.prototype.hasOwnProperty.call(newComment, 'author')
    ) {
      const nc = newComment as unknown as Record<string, unknown>;
      nc.user = nc.author;
    }
    return newComment as CommentWithAuthor | undefined;
  }

  async toggleReaction(
    commentId: string,
    userId: string,
    reactionType: ReactionType
  ): Promise<{ action_taken: string; reaction_counts: Reaction[] }> {
    const toggleResponse = await this.supabase.rpc<
      'toggle_comment_reaction',
      { action_taken: string; reaction_counts?: Reaction[] | null }
    >('toggle_comment_reaction', {
      p_comment_id: commentId,
      p_user_id: userId,
      p_reaction_type: reactionType,
    });

    const { data, error } = toggleResponse as {
      data: { action_taken: string; reaction_counts?: Reaction[] | null } | null;
      error: PostgrestError | null;
    };

    if (error !== null && error !== undefined) {
      console.error('Error toggling reaction:', error);
      throw new Error(`Failed to toggle reaction: ${error.message}`);
    }

    if (
      data !== null &&
      data !== undefined &&
      typeof data === 'object' &&
      'action_taken' in data
    ) {
      const {
        action_taken,
        reaction_counts,
      } = data as { action_taken: string; reaction_counts?: Reaction[] | null };

      return {
        action_taken,
        reaction_counts: reaction_counts ?? [],
      };
    }

    return { action_taken: 'error', reaction_counts: [] as Reaction[] };
  }

  async getCommentCount(
    entityType: CommentEntityType,
    entityId: string
  ): Promise<number> {
    const countResponse = await this.supabase.rpc<'get_comment_count', number>('get_comment_count', {
        p_entity_type: entityType,
        p_entity_id: entityId,
      });

    const { data, error } = countResponse as {
      data: number | null;
      error: PostgrestError | null;
    };

    if (error !== null && error !== undefined) {
      console.error('Error getting comment count:', error);
      return 0;
    }
    return data ?? 0;
  }

  async updateComment(
    commentId: string,
    content: string
  ): Promise<CommentWithAuthor | undefined> {
    const { data, error } = await this.supabase
      .from('comments')
      .update({ content, updated_at: new Date().toISOString() })
      .eq('id', commentId)
      .select('*, author:users(*)')
      .single<CommentWithAuthor>();

    if (error !== null && error !== undefined) {
      console.error('Error updating comment:', error);
      throw new Error(`Failed to update comment: ${error.message}`);
    }
    return data ?? undefined;
  }

  async deleteComment(commentId: string): Promise<boolean> {
    const { error } = await this.supabase
      .from('comments')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', commentId);

    if (error !== null && error !== undefined) {
      console.error('Error deleting comment:', error);
      throw new Error(`Failed to delete comment: ${error.message}`);
    }
    return error === null;
  }

  async pinComment(
    commentId: string,
    entityType: CommentEntityType,
    entityId: string,
    pinnedBy: string,
    _pinOrder?: number // _pinOrder if unused
  ): Promise<CommentPin | undefined> {
    const { data, error } = await this.supabase
      .from('comment_pins')
      .insert({
        comment_id: commentId,
        entity_type: entityType,
        entity_id: entityId,
        pinned_by: pinnedBy,
        pin_order: _pinOrder,
      })
      .select('*')
      .single<CommentPin>();

    if (error !== null && error !== undefined) {
      console.error('Error pinning comment:', error);
      throw new Error(`Failed to pin comment: ${error.message}`);
    }
    return data ?? undefined;
  }

  async unpinComment(commentId: string, entityId: string): Promise<boolean> {
    const { error } = await this.supabase
      .from('comment_pins')
      .delete()
      .eq('comment_id', commentId)
      .eq('entity_id', entityId);

    if (error !== null && error !== undefined) {
      console.error('Error unpinning comment:', error);
      throw new Error(`Failed to unpin comment: ${error.message}`);
    }
    return error === null;
  }

  private _subscribeToCommentChanges(
    entityId: string,
    onInsert: (comment: CommentWithAuthor) => void,
    onUpdate: (comment: CommentWithAuthor) => void,
    onDelete: (commentId: string) => void
  ): RealtimeChannel {
    const channel = this.supabase.channel(`comments-for-${entityId}`);

    channel
      .on<CommentWithAuthor>(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'comments',
          filter: `entity_id=eq.${entityId}`,
        },
        payload => {
          onInsert(payload.new);
        }
      )
      .on<CommentWithAuthor>(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'comments',
          filter: `entity_id=eq.${entityId}`,
        },
        payload => {
          onUpdate(payload.new);
        }
      )
      .on<Comment>(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'comments',
          filter: `entity_id=eq.${entityId}`,
        },
        payload => {
          const oldId = payload.old?.id;
          if (oldId !== undefined) {
            onDelete(oldId);
          }
        }
      )
      .subscribe();

    return channel;
  }

  private _subscribeToReactionChanges(
    entityId: string,
    onReactionUpdate: (reaction: CommentReaction) => void
  ): RealtimeChannel {
    const channel = this.supabase.channel(`reactions-for-${entityId}`);

    channel.on<CommentReaction>(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'comment_reactions',
      },
      payload => {
        const newRow = payload.new as CommentReaction | undefined;
        if (newRow !== undefined && typeof newRow.id === 'string' && newRow.id !== '') {
          onReactionUpdate(newRow);
        }
      }
    );

    return channel;
  }
}

export const commentsV2Service = new CommentsV2Service();
