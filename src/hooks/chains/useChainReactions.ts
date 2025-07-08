import { useCallback, useEffect, useState, useMemo } from 'react';

import { createSupabaseBrowserClient } from '@/lib/supabase/browser';

import type { Database } from '@/lib/database.types';

interface ReactionState {
  liked: Set<string>;
  disliked: Set<string>;
  rechained: Set<string>;
  initialized: boolean;
  deltas: Map<string, { like: number; dislike: number; rechain: number }>;
}

export interface ChainReactions {
  likedChains: Set<string>;
  dislikedChains: Set<string>;
  rechainedChains: Set<string>;
  initialized: boolean;
  toggleLike: (id: string) => Promise<void>;
  toggleDislike: (id: string) => Promise<void>;
  toggleRechain: (id: string) => Promise<void>;
  getDeltas: (id: string) => { like: number; dislike: number; rechain: number };
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
    rechained: new Set(),
    initialized: false,
    deltas: new Map(),
  });

  // Initial fetch of reaction state
  useEffect(() => {
    if (!userId || state.initialized) return;
    // Mark initialized early to avoid duplicate fetches
    setState((prev) => ({ ...prev, initialized: true }));

    const load = async (): Promise<void> => {
      try {
        const { data, error } = await supabase
          .from('chain_reactions')
          .select('chain_id, reaction')
          .eq('user_id', userId);

        if (error) throw error;

        const liked = new Set<string>();
        const disliked = new Set<string>();
        const rechained = new Set<string>();
        for (const row of data ?? []) {
          const r = row.reaction as string;
          if (r === 'like') liked.add(row.chain_id);
          if (r === 'dislike') disliked.add(row.chain_id);
          if (r === 'rechain') rechained.add(row.chain_id);
        }

        setState({
          liked,
          disliked,
          rechained,
          initialized: true,
          deltas: new Map(),
        });
      } catch (err) {
        console.error('[useChainReactions] load error', err);
      }
    };

    void load();
  }, [userId, state.initialized, supabase]);

  const mutateDelta = useCallback(
    (
      id: string,
      likeDelta: number,
      dislikeDelta: number,
      rechainDelta: number,
    ): void => {
      setState((prev) => {
        const deltas = new Map(prev.deltas);
        const current = deltas.get(id) ?? {
          like: 0,
          dislike: 0,
          rechain: 0,
        };
        deltas.set(id, {
          like: current.like + likeDelta,
          dislike: current.dislike + dislikeDelta,
          rechain: current.rechain + rechainDelta,
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
        const likedBefore = liked.has(id);
        const dislikedBefore = disliked.has(id);
        if (likedBefore) liked.delete(id);
        else liked.add(id);
        if (dislikedBefore) disliked.delete(id);
        return { ...prev, liked, disliked };
      });
      // delta adjustments
      if (isLiked) mutateDelta(id, -1, 0, 0);
      else if (isDisliked) mutateDelta(id, 1, -1, 0);
      else mutateDelta(id, 1, 0, 0);
      try {
        let apiError: unknown = undefined;
        if (isLiked) {
          // user wants to remove like
          const { error } = await supabase
            .from('chain_reactions')
            .delete()
            .match({ chain_id: id, user_id: userId });
          apiError = error;
        } else {
          // set or switch to like (single upsert updates reaction column)
          const { error } = await supabase.from('chain_reactions').upsert(
            {
              chain_id: id,
              user_id: userId,
              reaction:
                'like' as Database['public']['Enums']['chain_reaction_type'],
            },
            { onConflict: 'chain_id,user_id', ignoreDuplicates: false },
          );
          apiError = error;
        }

        if (process.env.NODE_ENV === 'development') {
          // eslint-disable-next-line no-console
          console.log('[CHAIN_REACTION_API] toggleLike response', {
            chainId: id,
            action: isLiked ? 'remove_like' : 'set_like',
            error: apiError,
          });
        }
      } catch (err) {
        console.error('[useChainReactions] toggleLike', err);
        // rollback UI on error
        setState((prev) => ({
          ...prev,
          liked: new Set(state.liked),
          disliked: new Set(state.disliked),
        }));
      }
    },
    [userId, supabase, mutateDelta, state.liked, state.disliked],
  );

  const toggleDislike = useCallback(
    async (id: string): Promise<void> => {
      if (!userId) return;
      const isDisliked = state.disliked.has(id);
      const isLiked = state.liked.has(id);
      setState((prev) => {
        const liked = new Set(prev.liked);
        const disliked = new Set(prev.disliked);
        const likedBefore = liked.has(id);
        const dislikedBefore = disliked.has(id);
        if (dislikedBefore) disliked.delete(id);
        else disliked.add(id);
        if (likedBefore) liked.delete(id);
        return { ...prev, liked, disliked };
      });
      // delta adjustments
      if (isDisliked) mutateDelta(id, 0, -1, 0);
      else if (isLiked) mutateDelta(id, -1, 1, 0);
      else mutateDelta(id, 0, 1, 0);
      try {
        let apiError: unknown = undefined;
        if (isDisliked) {
          const { error } = await supabase
            .from('chain_reactions')
            .delete()
            .match({ chain_id: id, user_id: userId });
          apiError = error;
        } else {
          const { error } = await supabase.from('chain_reactions').upsert(
            {
              chain_id: id,
              user_id: userId,
              reaction:
                'dislike' as Database['public']['Enums']['chain_reaction_type'],
            },
            { onConflict: 'chain_id,user_id', ignoreDuplicates: false },
          );
          apiError = error;
        }

        if (process.env.NODE_ENV === 'development') {
          // eslint-disable-next-line no-console
          console.log('[CHAIN_REACTION_API] toggleDislike response', {
            chainId: id,
            action: isDisliked ? 'remove_dislike' : 'set_dislike',
            error: apiError,
          });
        }
      } catch (err) {
        console.error('[useChainReactions] toggleDislike', err);
        // rollback UI on error
        setState((prev) => ({
          ...prev,
          liked: new Set(state.liked),
          disliked: new Set(state.disliked),
        }));
      }
    },
    [userId, supabase, mutateDelta, state.liked, state.disliked],
  );

  const toggleRechain = useCallback(
    async (id: string): Promise<void> => {
      if (!userId) return;
      const isRechained = state.rechained.has(id);

      setState((prev) => {
        const rechained = new Set(prev.rechained);
        if (isRechained) rechained.delete(id);
        else rechained.add(id);
        return { ...prev, rechained };
      });

      mutateDelta(id, 0, 0, isRechained ? -1 : 1);

      try {
        let apiError: unknown = undefined;
        if (isRechained) {
          const { error } = await supabase
            .from('chain_reactions')
            .delete()
            .match({
              chain_id: id,
              user_id: userId,
              reaction: 'rechain',
            });
          apiError = error;
        } else {
          const { error } = await supabase.from('chain_reactions').upsert(
            {
              chain_id: id,
              user_id: userId,
              reaction:
                'rechain' as Database['public']['Enums']['chain_reaction_type'],
            },
            { onConflict: 'chain_id,user_id', ignoreDuplicates: false },
          );
          apiError = error;
        }

        if (process.env.NODE_ENV === 'development') {
          // eslint-disable-next-line no-console
          console.log('[CHAIN_REACTION_API] toggleRechain response', {
            chainId: id,
            action: isRechained ? 'remove_rechain' : 'set_rechain',
            error: apiError,
          });
        }
      } catch (err) {
        console.error('[useChainReactions] toggleRechain', err);
        setState((prev) => ({
          ...prev,
          rechained: new Set(state.rechained),
        }));
      }
    },
    [userId, supabase, mutateDelta, state.rechained],
  );

  const getDeltas = useCallback(
    (id: string): { like: number; dislike: number; rechain: number } => {
      return (
        state.deltas.get(id) ?? {
          like: 0,
          dislike: 0,
          rechain: 0,
        }
      );
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

  return useMemo(
    () => ({
      likedChains: state.liked,
      dislikedChains: state.disliked,
      rechainedChains: state.rechained,
      initialized: state.initialized,
      toggleLike,
      toggleDislike,
      toggleRechain,
      getDeltas,
      clearDelta,
    }),
    [
      state.liked,
      state.disliked,
      state.rechained,
      state.initialized,
      toggleLike,
      toggleDislike,
      toggleRechain,
      getDeltas,
      clearDelta,
    ],
  );
}
