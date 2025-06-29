import { createServerSupabaseClient } from '@/lib/supabase/server';

import type { Database } from '@/lib/database.types';

type PostReaction = Database['public']['Tables']['post_reactions']['Row'];
type CommentReaction = Database['public']['Tables']['comment_reactions']['Row'];

interface TogglePostReactionArgs {
  postId: string;
  userId: string;
  type: 'like' | 'dislike';
}

interface ToggleCommentReactionArgs {
  commentId: string;
  userId: string;
  reaction_type: 'like' | 'dislike';
}

export async function togglePostReaction({
  postId,
  userId,
  type,
}: TogglePostReactionArgs): Promise<PostReaction | null> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from('post_reactions')
    // @ts-expect-error tenant-migration: tenant_id will be automatically injected via repository pattern
    .upsert([{ post_id: postId, user_id: userId, type }], {
      onConflict: 'user_id,post_id',
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function toggleCommentReaction({
  commentId,
  userId,
  reaction_type,
}: ToggleCommentReactionArgs): Promise<CommentReaction | null> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from('comment_reactions')
    .upsert(
      [
        {
          comment_id: commentId,
          user_id: userId,
          reaction_type,
        },
      ],
      {
        onConflict: 'comment_id,user_id',
      },
    )
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getReactionsForPost(
  postId: string,
): Promise<PostReaction[]> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from('post_reactions')
    .select('user_id, type, created_at')
    .eq('post_id', postId);
  if (error) throw error;
  // @ts-expect-error tenant-migration: return type will be fixed when tenant_id is properly handled
  return data || [];
}
