'use client';

import { useEffect, useRef } from 'react';

import { createSupabaseBrowserClient } from '@/lib/supabase/browser';

import type { Database } from '@/lib/database.types';

export type ChainRow = Database['public']['Tables']['chains']['Row'];

/**
 * Subscribes to realtime changes for chains.
 * Can operate in two modes: 'thread' or 'timeline'.
 */
export function useRealtimeChain(
  mode: 'thread' | 'timeline',
  id: string | null, // thread_root for thread mode, null for timeline
  onDelta: (payload: unknown) => void,
): void {
  const onDeltaRef = useRef(onDelta);

  useEffect(() => {
    onDeltaRef.current = onDelta;
  });

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    let channel: ReturnType<typeof supabase.channel> | null = null;

    if (mode === 'thread' && id) {
      channel = supabase
        .channel(`chains_${id}`)
        .on<ChainRow>(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'chains',
            filter: `thread_root=eq.${id}`,
          },
          (payload) => {
            if (payload.new) onDeltaRef.current(payload.new as ChainRow);
          },
        )
        .subscribe();
    } else if (mode === 'timeline') {
      channel = supabase
        .channel('new_public_chains')
        .on('broadcast', { event: 'new_chain' }, (payload) => {
          onDeltaRef.current(payload);
        })
        .subscribe();
    }

    return () => {
      if (channel) {
        void supabase.removeChannel(channel);
      }
    };
  }, [mode, id]);
}
