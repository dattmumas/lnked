import crypto from 'crypto';

import { createBrowserClient } from '@supabase/ssr';

import { createServerSupabaseClient } from '@/lib/supabase/server';

import {
  parseChain,
  parseChains,
  parseChainsWithAuthor,
  ChainInsertSchema,
  type Chain,
  type ChainInsert,
  type ChainWithAuthor,
  type ChainReaction,
} from './schemas/chain.schema';

import type { Database } from '@/lib/database.types';

/**
 * Chain Repository
 *
 * Handles all chain-related database operations (microthread posts).
 */
export class ChainRepository {
  constructor(
    private supabase: ReturnType<typeof createBrowserClient<Database>>,
  ) {}

  /**
   * Create a new chain
   */
  async create(chain: ChainInsert): Promise<Chain | undefined> {
    const dbChain = ChainInsertSchema.parse(chain);

    // Generate id & thread_root logic
    const id =
      typeof dbChain.id === 'string' && dbChain.id.length > 0
        ? dbChain.id
        : crypto.randomUUID();

    const parent_id = dbChain.parent_id ?? null;
    const thread_root =
      dbChain.thread_root ?? (parent_id === null ? id : undefined);

    if (parent_id !== null && thread_root === undefined) {
      throw new Error('thread_root must be provided for replies');
    }

    const { status, visibility, collective_id, attachments, meta, ...rest } =
      dbChain;
    const cleanedChain = {
      ...rest,
      ...(status !== null ? { status } : {}),
      ...(visibility !== null ? { visibility } : {}),
      ...(collective_id !== null ? { collective_id } : {}),
      ...(parent_id !== null ? { parent_id } : {}),
      thread_root: thread_root as string,
      id,
      ...(attachments !== null ? { attachments } : {}),
      ...(meta !== null ? { meta } : {}),
    };

    const { data, error } = await this.supabase
      .from('chains')
      .insert(cleanedChain)
      .select()
      .single();

    if (error !== undefined || data === undefined) {
      return undefined;
    }

    return parseChain(data);
  }

  /**
   * Get a chain by ID
   */
  async getById(id: string): Promise<Chain | undefined> {
    const { data, error } = await this.supabase
      .from('chains')
      .select('*')
      .eq('id', id)
      .single();

    if (error !== undefined || data === undefined) {
      return undefined;
    }

    return parseChain(data);
  }

  /**
   * Get chains with author info
   */
  async getChainsWithAuthors(limit = 20): Promise<ChainWithAuthor[]> {
    const { data, error } = await this.supabase
      .from('chains')
      .select(
        `
        *,
        author:users!author_id (
          id,
          username,
          full_name,
          avatar_url
        )
      `,
      )
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error !== null && error !== undefined) {
      return [];
    }
    if (data === undefined) {
      return [];
    }

    return parseChainsWithAuthor((data ?? []) as unknown[]);
  }

  /**
   * Get chains by author
   */
  async getByAuthor(authorId: string, limit = 20): Promise<Chain[]> {
    const { data, error } = await this.supabase
      .from('chains')
      .select('*')
      .eq('author_id', authorId)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error !== undefined || data === undefined) {
      return [];
    }

    return parseChains(data);
  }

  /**
   * Get replies to a chain
   */
  async getReplies(
    parentChainId: string,
    limit = 20,
  ): Promise<ChainWithAuthor[]> {
    const { data, error } = await this.supabase
      .from('chains')
      .select(
        `
        *,
        author:users!author_id (
          id,
          username,
          full_name,
          avatar_url
        )
      `,
      )
      .eq('parent_id', parentChainId)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error !== undefined || data === undefined) {
      return [];
    }

    return parseChainsWithAuthor((data ?? []) as unknown[]);
  }

  /**
   * Add a reaction to a chain
   */
  async addReaction(
    chainId: string,
    userId: string,
    reaction: 'like' | 'rechain' = 'like',
  ): Promise<boolean> {
    const { error } = await this.supabase.from('chain_reactions').upsert({
      chain_id: chainId,
      user_id: userId,
      reaction,
    });

    return error === undefined;
  }

  /**
   * Remove a reaction from a chain
   */
  async removeReaction(
    chainId: string,
    userId: string,
    reaction: 'like' | 'rechain' = 'like',
  ): Promise<boolean> {
    const { error } = await this.supabase
      .from('chain_reactions')
      .delete()
      .match({
        chain_id: chainId,
        user_id: userId,
        reaction,
      });

    return error === undefined;
  }

  /**
   * Get user's reactions to chains
   */
  async getUserReactions(
    userId: string,
    chainIds: string[],
  ): Promise<ChainReaction[]> {
    const { data, error } = await this.supabase
      .from('chain_reactions')
      .select('*')
      .eq('user_id', userId)
      .in('chain_id', chainIds);

    if (error !== undefined || data === undefined) {
      return [];
    }

    // Parse reactions - we don't have a parser for this yet, so return as is
    return data as ChainReaction[];
  }

  /**
   * Update a chain (for editing)
   */
  async update(chainId: string, content: string): Promise<Chain | undefined> {
    const { data, error } = await this.supabase
      .from('chains')
      .update({
        content,
        updated_at: new Date().toISOString(),
      })
      .eq('id', chainId)
      .select()
      .single();

    if (error !== undefined || data === undefined) {
      return undefined;
    }

    return parseChain(data);
  }

  /**
   * Delete a chain (soft delete)
   */
  async delete(chainId: string): Promise<boolean> {
    const { error } = await this.supabase
      .from('chains')
      .update({
        status: 'deleted',
      })
      .eq('id', chainId);

    return error === undefined;
  }

  /**
   * Search chains by content
   */
  async search(query: string, limit = 20): Promise<ChainWithAuthor[]> {
    const { data, error } = await this.supabase
      .from('chains')
      .select(
        `
        *,
        author:users!author_id (
          id,
          username,
          full_name,
          avatar_url
        )
      `,
      )
      .textSearch('tsv', query)
      .eq('status', 'active')
      .limit(limit);

    if (error !== undefined || data === undefined) {
      return [];
    }

    return parseChainsWithAuthor((data ?? []) as unknown[]);
  }

  /**
   * Fetch a slice of a thread sorted newest → oldest.
   * @param rootId thread_root id
   * @param before optional ISO timestamp – returns rows created BEFORE this time
   * @param limit batch size (default 20)
   */
  async fetchThread(
    rootId: string,
    before?: string | null,
    limit = 20,
  ): Promise<ChainWithAuthor[]> {
    const query = this.supabase
      .from('chains')
      .select(
        `*,
        author:users!author_id (
          id,
          username,
          full_name,
          avatar_url
        )`,
      )
      .eq('thread_root', rootId)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (before) query.lt('created_at', before);

    const { data, error } = await query;
    if (error !== null && error !== undefined) {
      return [];
    }
    if (data === undefined) return [];

    return parseChainsWithAuthor((data ?? []) as unknown[]);
  }
}

// ---------------------------------------------------------------------------
// Convenience helpers for server-action usage
// ---------------------------------------------------------------------------

/** Insert a top-level chain (root post). */
export async function insertRoot(
  payload: Omit<ChainInsert, 'parent_id' | 'thread_root'>,
): Promise<Chain | undefined> {
  const supabase = await createServerSupabaseClient();
  const repo = new ChainRepository(supabase);
  return repo.create(payload as ChainInsert);
}

/** Insert a reply to an existing chain. */
export async function insertReply(
  params: { parent: { id: string; thread_root: string } } & Omit<
    ChainInsert,
    'parent_id' | 'thread_root'
  >,
): Promise<Chain | undefined> {
  const supabase = await createServerSupabaseClient();
  const repo = new ChainRepository(supabase);
  return repo.create({
    ...params,
    parent_id: params.parent.id,
    thread_root: params.parent.thread_root,
  } as ChainInsert);
}
