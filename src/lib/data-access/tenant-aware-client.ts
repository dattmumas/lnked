import { createSupabaseBrowserClient } from '@/lib/supabase/browser';
import type { Database } from '@/lib/database.types';

type Tables = Database['public']['Tables'];

/**
 * Client-side tenant-aware database helpers that automatically inject tenant_id
 * from the current session context to prevent manual tenant_id management
 */
export class TenantAwareRepositoryClient {
  private supabase: any;
  private tenantId: string | null = null;

  constructor(supabase: any, tenantId: string) {
    this.supabase = supabase;
    this.tenantId = tenantId;
  }

  /**
   * Insert into post_reactions with automatic tenant_id injection
   */
  async insertPostReaction(data: {
    user_id: string;
    post_id: string;
    type: string;
  }) {
    if (!this.tenantId) {
      throw new Error('Tenant context required for post reactions');
    }

    return this.supabase.from('post_reactions').upsert(
      {
        ...data,
        tenant_id: this.tenantId,
      },
      { onConflict: 'user_id,post_id' },
    );
  }

  /**
   * Upsert into post_reactions with automatic tenant_id injection
   */
  async upsertPostReaction(data: {
    user_id: string;
    post_id: string;
    type: string;
    created_at?: string;
  }) {
    if (!this.tenantId) {
      throw new Error('Tenant context required for post reactions');
    }

    const result = await this.supabase.from('post_reactions').upsert(
      {
        ...data,
        tenant_id: this.tenantId,
      },
      { onConflict: 'user_id,post_id' },
    );

    // Debug logging
    /* eslint-disable no-console */
    console.log('[post_reactions] upsert result', {
      data: result.data,
      error: result.error,
    });
    /* eslint-enable no-console */

    return result;
  }

  /**
   * Insert into post_bookmarks with automatic tenant_id injection
   */
  async insertPostBookmark(data: { user_id: string; post_id: string }) {
    if (!this.tenantId) {
      throw new Error('Tenant context required for bookmarks');
    }

    return this.supabase.from('post_bookmarks').insert({
      ...data,
      tenant_id: this.tenantId,
    });
  }

  /**
   * Delete from post_bookmarks
   */
  async deletePostBookmark(data: { user_id: string; post_id: string }) {
    return this.supabase.from('post_bookmarks').delete().match(data);
  }
}

/**
 * Factory function to create client-side tenant-aware repository
 */
export async function createTenantAwareRepositoryClient(): Promise<TenantAwareRepositoryClient> {
  const supabase = createSupabaseBrowserClient();

  // Get current user session
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Authentication required for tenant-aware operations');
  }

  // Get user's current tenant_id from their session or user metadata
  const { data: tenantMember, error: tenantLookupError } = await supabase
    .from('tenant_members')
    .select('tenant_id')
    .eq('user_id', user.id)
    .limit(1)
    .maybeSingle();

  if (tenantLookupError) {
    throw new Error(
      `Failed to look up tenant membership: ${tenantLookupError.message}`,
    );
  }

  const tenantId = tenantMember?.tenant_id;

  if (!tenantId) {
    throw new Error('User is not associated with any tenant');
  }

  return new TenantAwareRepositoryClient(supabase, tenantId);
}
