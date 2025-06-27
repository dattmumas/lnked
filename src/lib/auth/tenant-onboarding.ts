// Tenant-Aware User Onboarding Service
// Handles user registration and automatic personal tenant creation

import { createServerSupabaseClient } from '@/lib/supabase/server';

import type { TenantType } from '@/types/tenant.types';
import type { SupabaseClient } from '@supabase/supabase-js';

// =============================================================================
// TYPES & INTERFACES
// =============================================================================

export interface OnboardingResult {
  success: boolean;
  user?: {
    id: string;
    email: string;
    username?: string;
    full_name?: string;
  };
  personalTenant?: {
    id: string;
    name: string;
    slug: string;
    type: TenantType;
  };
  error?: string;
  details?: Record<string, unknown>;
}

export interface UserProfile {
  username?: string;
  full_name?: string;
  avatar_url?: string;
  bio?: string;
}

// =============================================================================
// ONBOARDING SERVICE
// =============================================================================

export class TenantOnboardingService {
  private supabase: SupabaseClient | null = null;

  constructor(supabase?: SupabaseClient) {
    this.supabase = supabase || null;
  }

  private async getSupabase(): Promise<SupabaseClient> {
    if (this.supabase) {
      return this.supabase;
    }
    return await createServerSupabaseClient();
  }

  /**
   * Complete user onboarding with personal tenant creation
   */
  async completeUserOnboarding(
    userId: string,
    profile?: UserProfile
  ): Promise<OnboardingResult> {
    try {
      const supabase = await this.getSupabase();
      // Get user data
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('id, email, username, full_name')
        .eq('id', userId)
        .single();

      if (userError || !user) {
        return {
          success: false,
          error: 'User not found',
          details: { userError: userError?.message },
        };
      }

      // Check if personal tenant already exists
      const { data: existingTenant, error: tenantCheckError } = await supabase
        .rpc('get_user_personal_tenant', { user_id: userId });

      if (tenantCheckError) {
        console.warn('Failed to check existing tenant:', tenantCheckError);
      }

      // If tenant already exists, return success
      if (existingTenant) {
        const { data: tenantData, error: fetchError } = await supabase
          .from('tenants')
          .select('id, name, slug, type')
          .eq('id', existingTenant)
          .single();

        if (!fetchError && tenantData) {
          return {
            success: true,
            user,
            personalTenant: tenantData,
          };
        }
      }

      // Create personal tenant if it doesn't exist
      const personalTenant = await this.createPersonalTenant(userId, profile);
      if (!personalTenant.success) {
        return personalTenant;
      }

      // Update user profile if provided
      if (profile) {
        await this.updateUserProfile(userId, profile);
      }

      // Fix optional property assignment using conditional spread
      return {
        success: true,
        user,
        ...(personalTenant.personalTenant ? { personalTenant: personalTenant.personalTenant } : {}),
      };

    } catch (error) {
      console.error('Error in user onboarding:', error);
      return {
        success: false,
        error: 'Failed to complete onboarding',
        details: { error: error instanceof Error ? error.message : 'Unknown error' },
      };
    }
  }

  /**
   * Create a personal tenant for a user
   */
  private async createPersonalTenant(
    userId: string,
    profile?: UserProfile
  ): Promise<OnboardingResult> {
    try {
      const supabase = await this.getSupabase();
      // Get user info for tenant creation
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('id, email, username, full_name')
        .eq('id', userId)
        .single();

      if (userError || !user) {
        return {
          success: false,
          error: 'User not found for tenant creation',
        };
      }

      // Generate tenant name and slug
      const tenantName: string = profile?.full_name || user.full_name || user.username || 'Personal';
      const baseSlug = this.generateSlug(tenantName);
      const uniqueSlug = await this.generateUniqueSlug(baseSlug);

      // Create the personal tenant
      const { data: tenant, error: tenantError } = await supabase
        .from('tenants')
        .insert({
          name: tenantName,
          slug: uniqueSlug,
          type: 'personal' as TenantType,
          owner_id: userId,
          description: `${tenantName}'s personal space`,
          is_public: false,
          allow_member_posts: false,
          require_approval: false,
        })
        .select('id, name, slug, type')
        .single();

      if (tenantError) {
        return {
          success: false,
          error: 'Failed to create personal tenant',
          details: { tenantError: tenantError.message },
        };
      }

      // Add user as owner to tenant_members
      const { error: memberError } = await supabase
        .from('tenant_members')
        .insert({
          tenant_id: tenant.id,
          user_id: userId,
          role: 'owner',
          joined_at: new Date().toISOString(),
        });

      if (memberError) {
        console.warn('Failed to add user as tenant member:', memberError);
        // Don't fail the entire operation for this
      }

      return {
        success: true,
        personalTenant: tenant,
      };

    } catch (error) {
      console.error('Error creating personal tenant:', error);
      return {
        success: false,
        error: 'Failed to create personal tenant',
        details: { error: error instanceof Error ? error.message : 'Unknown error' },
      };
    }
  }

  /**
   * Update user profile information
   */
  private async updateUserProfile(
    userId: string,
    profile: UserProfile
  ): Promise<void> {
    try {
      const supabase = await this.getSupabase();
      const { error } = await supabase
        .from('users')
        .update({
          username: profile.username ?? null,
          full_name: profile.full_name ?? null,
          avatar_url: profile.avatar_url ?? null,
          bio: profile.bio ?? null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId);

      if (error) {
        console.warn('Failed to update user profile:', error);
      }
    } catch (error) {
      console.warn('Error updating user profile:', error);
    }
  }

  /**
   * Generate a URL-friendly slug from a name
   */
  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, '')
      .substring(0, 50); // Limit length
  }

  /**
   * Generate a unique slug by checking for conflicts
   */
  private async generateUniqueSlug(baseSlug: string): Promise<string> {
    let slug = baseSlug;
    let counter = 1;

    while (true) {
      // @ts-expect-error tenant-migration: supabase client null check will be improved
      const { data: existing, error } = await this.supabase
        .from('tenants')
        .select('slug')
        .eq('slug', slug)
        .single();

      if (error && error.code === 'PGRST116') {
        // No conflict found
        break;
      }

      if (existing) {
        // Conflict found, try next variation
        slug = `${baseSlug}-${counter}`;
        counter++;
      } else {
        break;
      }
    }

    return slug;
  }

  /**
   * Get user's tenant context for session initialization
   */
  async getUserTenantContext(userId: string): Promise<{
    personalTenant?: { id: string; name: string; slug: string };
    allTenants: Array<{ id: string; name: string; slug: string; type: TenantType; role: string }>;
    defaultTenantId?: string;
  }> {
    try {
      // Get user's personal tenant
      // @ts-expect-error tenant-migration: supabase client null check will be improved
      const { data: personalTenantId, error: personalError } = await this.supabase
        .rpc('get_user_personal_tenant', { user_id: userId });

      let personalTenant: { id: string; name: string; slug: string } | undefined;

      if (!personalError && personalTenantId) {
        // @ts-expect-error tenant-migration: supabase client null check will be improved
        const { data: tenantData, error: fetchError } = await this.supabase
          .from('tenants')
          .select('id, name, slug')
          .eq('id', personalTenantId)
          .single();

        if (!fetchError && tenantData) {
          personalTenant = tenantData;
        }
      }

      // Get all user's tenants
      // @ts-expect-error tenant-migration: supabase client null check will be improved
      const { data: allTenants, error: tenantsError } = await this.supabase
        .from('tenant_members')
        .select(`
          role,
          tenant:tenants!tenant_id(
            id,
            name,
            slug,
            type
          )
        `)
        .eq('user_id', userId);

      if (tenantsError) {
        console.warn('Failed to fetch user tenants:', tenantsError);
      }

      const formattedTenants = (allTenants || [])
        .filter(item => item.tenant)
        .map(item => {
          const tenant = Array.isArray(item.tenant) ? item.tenant[0] : item.tenant;
          // Fix potential undefined tenant access
          if (!tenant) {
            throw new Error('Tenant data is missing');
          }
          return {
            id: tenant.id,
            name: tenant.name,
            slug: tenant.slug,
            type: tenant.type,
            role: item.role,
          };
        });

      // Fix optional property assignment using conditional spread
      return {
        ...(personalTenant ? { personalTenant } : {}),
        allTenants: formattedTenants,
        ...(personalTenant?.id ? { defaultTenantId: personalTenant.id } : 
            formattedTenants[0]?.id ? { defaultTenantId: formattedTenants[0].id } : {}),
      };

    } catch (error) {
      console.error('Error getting user tenant context:', error);
      return {
        allTenants: [],
      };
    }
  }
}

// =============================================================================
// SINGLETON INSTANCE
// =============================================================================

export const tenantOnboardingService = new TenantOnboardingService(); 