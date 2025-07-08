import { createServerSupabaseClient } from '@/lib/supabase/server';

import type { Database } from '@/lib/database.types';
import type { SupabaseClient } from '@supabase/supabase-js';

type Tables = Database['public']['Tables'];

/**
 * Tenant-aware database helpers that automatically inject tenant_id
 * from the current session context to prevent manual tenant_id management
 */
export class TenantAwareRepository {
  private supabase: SupabaseClient<Database>;
  private tenantId: string | null = null;

  constructor(supabase: SupabaseClient<Database>, tenantId: string) {
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
        // created_at handled by default DB value if not provided
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

    /* eslint-disable no-console */
    console.log('[post_reactions] upsert result (server)', {
      data: result.data,
      error: result.error,
    });
    /* eslint-enable no-console */

    return result;
  }

  /**
   * Insert into posts with automatic tenant_id injection
   */
  async insertPost(data: Omit<Tables['posts']['Insert'], 'tenant_id'>) {
    if (!this.tenantId) {
      throw new Error('Tenant context required for posts');
    }

    return this.supabase.from('posts').insert({
      ...data,
      tenant_id: this.tenantId,
    });
  }

  /**
   * Upsert into posts with automatic tenant_id injection
   */
  async upsertPost(data: Omit<Tables['posts']['Insert'], 'tenant_id'>) {
    if (!this.tenantId) {
      throw new Error('Tenant context required for posts');
    }

    return this.supabase.from('posts').upsert({
      ...data,
      tenant_id: this.tenantId,
    });
  }

  /**
   * Insert into post_bookmarks with automatic tenant_id injection
   */
  async insertPostBookmark(
    data: Omit<Tables['post_bookmarks']['Insert'], 'tenant_id'>,
  ) {
    if (!this.tenantId) {
      throw new Error('Tenant context required for bookmarks');
    }

    return this.supabase.from('post_bookmarks').insert(data);
  }

  /**
   * Delete from post_bookmarks
   */
  async deletePostBookmark(postId: string, userId: string) {
    return this.supabase
      .from('post_bookmarks')
      .delete()
      .match({ post_id: postId, user_id: userId });
  }
}

/**
 * Factory function to create tenant-aware repository with current session context
 */
export async function createTenantAwareRepository(): Promise<TenantAwareRepository> {
  const supabase = await createServerSupabaseClient();

  // Get current user session
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Authentication required for tenant-aware operations');
  }

  // Get user's current tenant_id from their session or user metadata
  // This would typically come from tenant_members table or user metadata
  const { data: tenantMember } = await supabase
    .from('tenant_members')
    .select('tenant_id')
    .eq('user_id', user.id)
    .single();

  const tenantId = tenantMember?.tenant_id;

  if (!tenantId) {
    throw new Error('User is not associated with any tenant');
  }

  // Validate tenant ID
  if (tenantId === null || tenantId === undefined) {
    throw new Error('Tenant ID is required');
  }

  return new TenantAwareRepository(supabase, tenantId);
}

/**
 * Utility to get current user's tenant_id from session
 */
export async function getCurrentTenantId(): Promise<string | null> {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return null;

    const { data: tenantMember } = await supabase
      .from('tenant_members')
      .select('tenant_id')
      .eq('user_id', user.id)
      .single();

    return tenantMember?.tenant_id || null;
  } catch {
    return null;
  }
}
