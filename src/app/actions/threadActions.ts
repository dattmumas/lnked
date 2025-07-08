'use server';

import { ChainRepository } from '@/lib/data-access/chain.repository';
import { createServerSupabaseClient } from '@/lib/supabase/server';

import type { ChainWithAuthor } from '@/lib/data-access/schemas/chain.schema';

/**
 * Server action to fetch older chains in a thread for infinite scroll.
 */
export async function loadOlder(
  rootId: string,
  beforeISO: string,
  batch = 20,
): Promise<ChainWithAuthor[]> {
  const supabase = await createServerSupabaseClient();
  const repo = new ChainRepository(supabase);
  return repo.fetchThread(rootId, beforeISO, batch);
}

export async function fetchInitialChains(
  rootId?: string | null,
  limit = 40,
): Promise<ChainWithAuthor[]> {
  'use server';
  const supabase = await createServerSupabaseClient();
  const repo = new ChainRepository(supabase);
  if (rootId && rootId.length > 0) {
    return repo.fetchThread(rootId, undefined, limit);
  }
  return repo.getChainsWithAuthors(limit);
}

export async function fetchChainsByIds(
  ids: string[],
): Promise<ChainWithAuthor[]> {
  const supabase = await createServerSupabaseClient();
  const repo = new ChainRepository(supabase);
  return repo.getChainsByIds(ids);
}
