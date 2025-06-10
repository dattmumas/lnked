import { RealtimeChannel, SupabaseClient } from '@supabase/supabase-js';
import {
  Comment,
  CommentEntityType,
  CommentPin,
  CommentReaction,
  CommentWithAuthor,
  Reaction,
  ReactionType,
} from '@/types/comments-v2';
import {
  CommentNotFoundError,
  CommentPermissionError,
  CommentValidationError,
} from '@/lib/errors';
import { createSupabaseBrowserClient } from '@/lib/supabase/browser';

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
    this.supabase = supabase || createSupabaseBrowserClient();

    const defaultValidator = async (entityId: string) => {
      return !!entityId;
    };

    this.entityValidators = {
      post: entityValidators?.post || defaultValidator,
      video: entityValidators?.video || defaultValidator,
      collective: entityValidators?.collective || defaultValidator,
      profile: entityValidators?.profile || defaultValidator,
    };
  }

  private async validateEntity(
    entityType: CommentEntityType,
    entityId: string,
    userId?: string
  ): Promise<boolean> {
    const validator = this.entityValidators[entityType];
    if (!validator) {
      throw new CommentValidationError(`Unsupported entity type: ${entityType}`);
    }
    return validator(entityId, userId);
  }

  async getComments(
    entityType: CommentEntityType,
    entityId: string,
    page = 1,
    limit = 20
  ): Promise<CommentWithAuthor[]> {
    const offset = (page - 1) * limit;
    
    console.log('Calling get_comment_thread with params:', {
      p_entity_type: entityType,
      p_entity_id: entityId,
      p_limit: limit,
      p_offset: offset,
    });

    const { data, error } = await this.supabase.rpc('get_comment_thread', {
      p_entity_type: entityType,
      p_entity_id: entityId,
      p_limit: limit,
      p_offset: offset,
    });

    console.log('RPC response:', { data, error });

    if (error) {
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

    return (
      data?.map((row: any) => {
        const comment = row.comment_data;
        if (comment && comment.author) {
          comment.user = comment.author; // backward compatibility
        }
        return comment;
      }) || []
    );
  }

  async getCommentReplies(
    parentId: string,
    page = 1,
    limit = 10
  ): Promise<CommentWithAuthor[]> {
    const offset = (page - 1) * limit;
    const { data, error } = await this.supabase.rpc('get_comment_replies', {
      p_parent_id: parentId,
      p_limit: limit,
      p_offset: offset,
    });

    if (error) {
      console.error('Error fetching replies:', error);
      throw new Error(`Failed to fetch replies: ${error.message || JSON.stringify(error)}`);
    }

    return data?.map((row: any) => row.comment_data) || [];
  }

  async addComment(
    entityType: CommentEntityType,
    entityId: string,
    userId: string,
    content: string,
    parentId?: string
  ): Promise<CommentWithAuthor | null> {
    const { data, error } = await this.supabase.rpc('add_comment', {
      p_entity_type: entityType,
      p_entity_id: entityId,
      p_user_id: userId,
      p_content: content.trim(),
      p_parent_id: parentId,
    });

    if (error) {
      console.error('Error adding comment:', error);
      throw new Error(
        `Failed to add comment: ${error.message || error.details || JSON.stringify(error)}`
      );
    }

    if (!data) return null;
    const commentId = (data as any)?.[0]?.comment_id;
    if (!commentId) return null;

    const { data: newComment, error: fetchError } = await this.supabase
      .from('comments')
      .select('*, author:users(*)')
      .eq('id', commentId)
      .single();

    if (fetchError) {
      console.error('Error fetching new comment:', fetchError);
      return null;
    }

    if (newComment && (newComment as any).author) {
      (newComment as any).user = (newComment as any).author;
    }
    return newComment as unknown as CommentWithAuthor;
  }

  async toggleReaction(
    commentId: string,
    userId: string,
    reactionType: ReactionType
  ): Promise<{ action_taken: string; reaction_counts: Reaction[] }> {
    const { data, error } = await this.supabase.rpc('toggle_comment_reaction', {
      p_comment_id: commentId,
      p_user_id: userId,
      p_reaction_type: reactionType,
    });

    if (error) {
      console.error('Error toggling reaction:', error);
      throw new Error(`Failed to toggle reaction: ${error.message}`);
    }

    return data
      ? {
          action_taken: data.action_taken,
          reaction_counts: data.reaction_counts || [],
        }
      : { action_taken: 'error', reaction_counts: [] };
  }

  async getCommentCount(
    entityType: CommentEntityType,
    entityId: string
  ): Promise<number> {
    const { data, error } = await this.supabase.rpc('get_comment_count', {
      p_entity_type: entityType,
      p_entity_id: entityId,
    });

    if (error) {
      console.error('Error getting comment count:', error);
      return 0;
    }
    return data || 0;
  }

  async updateComment(
    commentId: string,
    content: string
  ): Promise<CommentWithAuthor | null> {
    const { data, error } = await this.supabase
      .from('comments')
      .update({ content, updated_at: new Date().toISOString() })
      .eq('id', commentId)
      .select('*, author:users(*)')
      .single();

    if (error) {
      console.error('Error updating comment:', error);
      throw new Error(`Failed to update comment: ${error.message}`);
    }
    return data as unknown as CommentWithAuthor;
  }

  async deleteComment(commentId: string): Promise<boolean> {
    const { error } = await this.supabase
      .from('comments')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', commentId);

    if (error) {
      console.error('Error deleting comment:', error);
      throw new Error(`Failed to delete comment: ${error.message}`);
    }
    return !error;
  }

  async pinComment(
    commentId: string,
    entityType: CommentEntityType,
    entityId: string,
    pinnedBy: string,
    pinOrder?: number
  ): Promise<CommentPin | null> {
    const { data, error } = await this.supabase
      .from('comment_pins')
      .insert({
        comment_id: commentId,
        entity_type: entityType,
        entity_id: entityId,
        pinned_by: pinnedBy,
        pin_order: pinOrder,
      })
      .select('*')
      .single();

    if (error) {
      console.error('Error pinning comment:', error);
      throw new Error(`Failed to pin comment: ${error.message}`);
    }
    return data;
  }

  async unpinComment(commentId: string, entityId: string): Promise<boolean> {
    const { error } = await this.supabase
      .from('comment_pins')
      .delete()
      .eq('comment_id', commentId)
      .eq('entity_id', entityId);

    if (error) {
      console.error('Error unpinning comment:', error);
      throw new Error(`Failed to unpin comment: ${error.message}`);
    }
    return !error;
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
          if (payload.old?.id) {
            onDelete(payload.old.id);
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
        if (payload.new && 'id' in payload.new) {
          onReactionUpdate(payload.new as CommentReaction);
        }
      }
    );

    return channel;
  }
}

export const commentsV2Service = new CommentsV2Service();
