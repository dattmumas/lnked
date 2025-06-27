import { createBrowserClient, createServerClient } from '@supabase/ssr';

import { 
  parseChain, 
  parseChains,
  parseChainsWithAuthor,
  ChainInsertSchema,
  type Chain, 
  type ChainInsert,
  type ChainWithAuthor,
  type ChainReaction
} from './schemas/chain.schema';

import type { Database } from '@/lib/database.types';

/**
 * Chain Repository
 * 
 * Handles all chain-related database operations (microthread posts).
 */
export class ChainRepository {
  constructor(private supabase: ReturnType<typeof createBrowserClient<Database>> | ReturnType<typeof createServerClient<Database>>) {}

  /**
   * Create a new chain
   */
  async create(chain: ChainInsert): Promise<Chain | undefined> {
    const dbChain = ChainInsertSchema.parse(chain);
    
    const { status, visibility, collective_id, parent_chain_id, attachments, meta, ...rest } = dbChain;
    const cleanedChain = {
      ...rest,
      ...(status !== null ? { status } : {}),
      ...(visibility !== null ? { visibility } : {}),
      ...(collective_id !== null ? { collective_id } : {}),
      ...(parent_chain_id !== null ? { parent_chain_id } : {}),
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
      .select(`
        *,
        author:users!author_id (
          id,
          username,
          full_name,
          avatar_url
        )
      `)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error !== undefined || data === undefined) {
      return [];
    }

    return parseChainsWithAuthor(data);
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
  async getReplies(parentChainId: string, limit = 20): Promise<ChainWithAuthor[]> {
    const { data, error } = await this.supabase
      .from('chains')
      .select(`
        *,
        author:users!author_id (
          id,
          username,
          full_name,
          avatar_url
        )
      `)
      .eq('parent_chain_id', parentChainId)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error !== undefined || data === undefined) {
      return [];
    }

    return parseChainsWithAuthor(data);
  }

  /**
   * Add a reaction to a chain
   */
  async addReaction(chainId: string, userId: string, reaction: 'like' | 'rechain' = 'like'): Promise<boolean> {
    const { error } = await this.supabase
      .from('chain_reactions')
      .upsert({
        chain_id: chainId,
        user_id: userId,
        reaction
      });

    return error === undefined;
  }

  /**
   * Remove a reaction from a chain
   */
  async removeReaction(chainId: string, userId: string, reaction: 'like' | 'rechain' = 'like'): Promise<boolean> {
    const { error } = await this.supabase
      .from('chain_reactions')
      .delete()
      .match({
        chain_id: chainId,
        user_id: userId,
        reaction
      });

    return error === undefined;
  }

  /**
   * Get user's reactions to chains
   */
  async getUserReactions(userId: string, chainIds: string[]): Promise<ChainReaction[]> {
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
        updated_at: new Date().toISOString()
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
        status: 'deleted'
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
      .select(`
        *,
        author:users!author_id (
          id,
          username,
          full_name,
          avatar_url
        )
      `)
      .textSearch('tsv', query)
      .eq('status', 'active')
      .limit(limit);

    if (error !== undefined || data === undefined) {
      return [];
    }

    return parseChainsWithAuthor(data);
  }
} 