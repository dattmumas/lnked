import { useCallback, useEffect, useState } from 'react';

import { createSupabaseBrowserClient } from '@/lib/supabase/browser';

import type { Database } from '@/lib/database.types';

interface ReactionState {
  liked: Set<string>;
  disliked: Set<string>;
  initialized: boolean;
  deltas: Map<string, { like: number; dislike: number }>;
}

export interface ChainReactions {
  likedChains: Set<string>;
  dislikedChains: Set<string>;
  initialized: boolean;
  toggleLike: (id: string) => Promise<void>;
  toggleDislike: (id: string) => Promise<void>;
  getDeltas: (id: string) => { like: number; dislike: number };
  clearDelta: (id: string) => void;
}

/**
 * Hook to manage like / dislike reactions for Chains.
 */
export function useChainReactions(userId: string | undefined): ChainReactions {
  const supabase = createSupabaseBrowserClient();
  const [state, setState] = useState<ReactionState>({
    liked: new Set(),
    disliked: new Set(),
    initialized: false,
    deltas: new Map(),
  });

  // Initial fetch of reaction state
  useEffect(() => {
    if (!userId || state.initialized) return;
    let mounted = true;

    const load = async (): Promise<void> => {
      try {
        const { data, error } = await supabase
          .from('chain_reactions')
          .select('chain_id, reaction')
          .eq('user_id', userId);
        if (error) throw error;
        if (!mounted) return;
        const liked = new Set<string>();
        const disliked = new Set<string>();
        for (const row of data ?? []) {
          const r = row.reaction as string;
          if (r === 'like') liked.add(row.chain_id);
          if (r === 'dislike') disliked.add(row.chain_id);
        }
        setState({ liked, disliked, initialized: true, deltas: new Map() });
      } catch (err) {
        console.error('[useChainReactions] load error', err);
      }
    };

    void load();
    return () => {
      mounted = false;
    };
  }, [userId, state.initialized, supabase]);

  const mutateDelta = useCallback(
    (id: string, likeDelta: number, dislikeDelta: number): void => {
      setState((prev) => {
        const deltas = new Map(prev.deltas);
        const current = deltas.get(id) ?? { like: 0, dislike: 0 };
        deltas.set(id, {
          like: current.like + likeDelta,
          dislike: current.dislike + dislikeDelta,
        });
        return { ...prev, deltas };
      });
    },
    [],
  );

  const toggleLike = useCallback(
    async (id: string): Promise<void> => {
      if (!userId) return;
      const isLiked = state.liked.has(id);
      const isDisliked = state.disliked.has(id);
      // optimistic UI
      setState((prev) => {
        const liked = new Set(prev.liked);
        const disliked = new Set(prev.disliked);
        if (isLiked) liked.delete(id);
        else liked.add(id);
        if (isDisliked) disliked.delete(id);
        return { ...prev, liked, disliked };
      });
      // delta adjustments
      if (isLiked) mutateDelta(id, -1, 0);
      else if (isDisliked) mutateDelta(id, 1, -1);
      else mutateDelta(id, 1, 0);
      try {
        if (isLiked) {
          await supabase
            .from('chain_reactions')
            .delete()
            .match({ chain_id: id, user_id: userId, reaction: 'like' });
        } else {
          await supabase.from('chain_reactions').upsert(
            {
              chain_id: id,
              user_id: userId,
              reaction:
                'like' as Database['public']['Enums']['chain_reaction_type'],
            },
            { onConflict: 'chain_id,user_id' },
          );
        }
      } catch (err) {
        console.error('[useChainReactions] toggleLike', err);
      }
    },
    [userId, state.liked, state.disliked, supabase, mutateDelta],
  );

  const toggleDislike = useCallback(
    async (id: string): Promise<void> => {
      if (!userId) return;
      const isDisliked = state.disliked.has(id);
      const isLiked = state.liked.has(id);
      setState((prev) => {
        const liked = new Set(prev.liked);
        const disliked = new Set(prev.disliked);
        if (isDisliked) disliked.delete(id);
        else disliked.add(id);
        if (isLiked) liked.delete(id);
        return { ...prev, liked, disliked };
      });
      // delta adjustments
      if (isDisliked) mutateDelta(id, 0, -1);
      else if (isLiked) mutateDelta(id, -1, 1);
      else mutateDelta(id, 0, 1);
      try {
        if (isDisliked) {
          await supabase
            .from('chain_reactions')
            .delete()
            .match({ chain_id: id, user_id: userId, reaction: 'dislike' });
        } else {
          await supabase.from('chain_reactions').upsert(
            {
              chain_id: id,
              user_id: userId,
              reaction:
                'dislike' as Database['public']['Enums']['chain_reaction_type'],
            },
            { onConflict: 'chain_id,user_id' },
          );
        }
      } catch (err) {
        console.error('[useChainReactions] toggleDislike', err);
      }
    },
    [userId, state.liked, state.disliked, supabase, mutateDelta],
  );

  const getDeltas = useCallback(
    (id: string): { like: number; dislike: number } => {
      return state.deltas.get(id) ?? { like: 0, dislike: 0 };
    },
    [state.deltas],
  );

  const clearDelta = useCallback((id: string): void => {
    setState((prev) => {
      if (!prev.deltas.has(id)) return prev;
      const deltas = new Map(prev.deltas);
      deltas.delete(id);
      return { ...prev, deltas };
    });
  }, []);

  return {
    likedChains: state.liked,
    dislikedChains: state.disliked,
    initialized: state.initialized,
    toggleLike,
    toggleDislike,
    getDeltas,
    clearDelta,
  };
}
