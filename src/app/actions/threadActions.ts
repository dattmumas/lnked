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
