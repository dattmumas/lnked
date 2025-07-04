'use client';

import { useEffect } from 'react';

import { createSupabaseBrowserClient } from '@/lib/supabase/browser';

import type { Database } from '@/lib/database.types';

export type ChainRow = Database['public']['Tables']['chains']['Row'];

/**
 * Subscribes to realtime changes for all rows that share the same thread_root.
 * The subscription is automatically cleaned up when the component unmounts
 * or when the `rootId` changes.
 *
 * Single-channel singleton: createSupabaseBrowserClient() already returns a
 * singleton Supabase client per-browser-tab, so multiple calls to this hook
 * share the underlying websocket without duplicating connections.
 */
export function useRealtimeChain(
  rootId: string,
  onDelta: (row: ChainRow) => void,
): void {
  useEffect(() => {
    if (!rootId) return undefined;

    const supabase = createSupabaseBrowserClient();

    const channel = supabase
      .channel(`chains_${rootId}`)
      .on<ChainRow>(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chains',
          filter: `thread_root=eq.${rootId}`,
        },
        (payload) => {
          // payload.new / payload.old contain row images depending on event type
          // we're interested in the NEW state for inserts / updates
          if (payload.new !== null) onDelta(payload.new as ChainRow);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [rootId, onDelta]);
}
