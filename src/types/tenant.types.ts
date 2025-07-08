// Tenant System Types
// Comprehensive TypeScript types for the unified tenant model

import type { Database } from '@/lib/database.types';

// =============================================================================
// CORE TENANT TYPES
// =============================================================================

export type TenantType = 'personal' | 'collective';
export type MemberRole = 'owner' | 'admin' | 'editor' | 'member';

// Base tenant interface
export interface Tenant {
  id: string;
  type: TenantType;
  name: string;
  slug: string;
  description: string | null;
  is_public: boolean;
  member_count: number;
  created_at: string;
  updated_at: string;
}

// Tenant member interface
export interface TenantMember {
  id: string;
  tenant_id: string;
  user_id: string;
  role: MemberRole;
  joined_at: string;
  user_name: string;
  user_email: string | null;
  user_avatar_url: string | null;
}

// =============================================================================
// ENHANCED TENANT INTERFACES
// =============================================================================

// Tenant with user's role information
export interface TenantWithUserRole extends Tenant {
  user_role: MemberRole;
  is_personal: boolean;
}

// Tenant with member details
export interface TenantWithMembers extends Tenant {
  members: Array<{
    id: string;
    user_id: string;
    role: MemberRole;
    joined_at: string;
    user: {
      id: string;
      username: string | null;
      full_name: string | null;
      avatar_url: string | null;
    };
  }>;
}

// =============================================================================
// TENANT-AWARE CONTENT TYPES
// =============================================================================

// Base interface for tenant-scoped content
export interface TenantScopedContent {
  tenant_id: string;
  tenant?: Tenant;
}

// Enhanced post with tenant information
export interface PostWithTenant extends TenantScopedContent {
  // Post fields
  id: string;
  title: string | null;
  content: string | null;
  author_id: string;
  collective_id: string | null;
  created_at: string;
  published_at: string | null;
  is_public: boolean;
  like_count: number | null;
  dislike_count: number | null;
  view_count: number | null;

  // Enhanced fields
  tenant: Tenant;
  author: {
    id: string;
    username: string | null;
    full_name: string | null;
    avatar_url: string | null;
  };
}

// Enhanced conversation with tenant information
export interface ConversationWithTenant {
  // Conversation fields
  id: string;
  title: string | null;
  description: string | null;
  type: string;
  created_by: string | null;
  created_at: string | null;
  updated_at: string | null;
  is_private: boolean | null;
  archived: boolean | null;
  last_message_at: string | null;

  // Tenant fields
  tenant_id: string | null;
  tenant?: Tenant | null;

  // Enhanced fields
  participants: Array<{
    user_id: string;
    role: string | null;
    user: {
      id: string;
      username: string | null;
      full_name: string | null;
      avatar_url: string | null;
    };
  }>;
}

// =============================================================================
// API RESPONSE TYPES
// =============================================================================

// Response from get_user_tenants function
export interface UserTenantsResponse {
  tenant_id: string;
  tenant_type: TenantType;
  tenant_name: string;
  tenant_slug: string;
  user_role: MemberRole;
  is_personal: boolean;
  member_count: number;
  is_public: boolean;
}

// Response from get_tenant_context function
export interface TenantContextResponse {
  tenant_id: string;
  name: string;
  slug: string;
  type: TenantType;
  description: string | null;
  is_public: boolean;
  user_role: MemberRole;
  member_count: number;
  created_at: string;
}

// =============================================================================
// PERMISSION CHECKING TYPES
// =============================================================================

export interface TenantPermissions {
  canRead: boolean;
  canWrite: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canManageMembers: boolean;
  canManageSettings: boolean;
}

// =============================================================================
// UTILITY TYPES
// =============================================================================

// Helper type for tenant-scoped queries
export type TenantScopedQuery<T> = T & {
  tenant_id: string;
};

// Helper type for tenant creation
export interface CreateTenantRequest {
  name: string;
  slug: string;
  description?: string;
  is_public?: boolean;
  type: 'collective'; // Personal tenants are auto-created
}

// Helper type for tenant updates
export interface UpdateTenantRequest {
  name?: string;
  slug?: string;
  description?: string;
  is_public?: boolean;
}

// Helper type for member invitation
export interface InviteMemberRequest {
  tenant_id: string;
  email: string;
  role: MemberRole;
}

// Helper type for member role updates
export interface UpdateMemberRoleRequest {
  tenant_id: string;
  user_id: string;
  role: MemberRole;
}

// =============================================================================
// HOOKS AND CONTEXT TYPES
// =============================================================================

// Context value for tenant provider
export interface TenantContextValue {
  currentTenant: Tenant | null;
  userTenants: UserTenantsResponse[];
  switchTenant: (tenantId: string) => void;
  refreshTenants: () => Promise<void>;
  isLoading: boolean;
  error: string | null;
}

// Hook return type for useTenant
export interface UseTenantReturn {
  tenant: Tenant | null;
  userRole: MemberRole | null;
  permissions: TenantPermissions;
  isLoading: boolean;
  error: string | null;
}

// Hook return type for useTenantMembers
export interface UseTenantMembersReturn {
  members: TenantMember[];
  isLoading: boolean;
  error: string | null;
  inviteMember: (email: string, role?: MemberRole) => Promise<void>;
  updateMemberRole: (memberId: string, newRole: MemberRole) => Promise<void>;
  removeMember: (memberId: string) => Promise<void>;
  refreshMembers: () => Promise<void>;
}

// =============================================================================
// FORM TYPES
// =============================================================================

// Form data for creating collective
export interface CreateCollectiveFormData {
  name: string;
  slug: string;
  description: string;
  is_public: boolean;
}

// Form data for tenant settings
export interface TenantSettingsFormData {
  name: string;
  description: string;
  is_public: boolean;
}

// =============================================================================
// ERROR TYPES
// =============================================================================

export interface TenantError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

// =============================================================================
// EXPORT TYPES FROM DATABASE
// =============================================================================

// Re-export relevant database types
export type TenantsTable = Database['public']['Tables']['tenants'];
export type TenantMembersTable = Database['public']['Tables']['tenant_members'];
export type TenantRow = TenantsTable['Row'];
export type TenantInsert = TenantsTable['Insert'];
export type TenantUpdate = TenantsTable['Update'];
export type TenantMemberRow = TenantMembersTable['Row'];
export type TenantMemberInsert = TenantMembersTable['Insert'];
export type TenantMemberUpdate = TenantMembersTable['Update'];
