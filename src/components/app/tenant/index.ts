// Tenant Components Index
// Centralized exports for all tenant-related components

// Main components
export { default as TenantSwitcher } from './TenantSwitcher';
export { TenantSettings } from './TenantSettings';
export { TenantMembers } from './TenantMembers';
export { TenantPermissionsDisplay, PermissionGate } from './TenantPermissions';

// Types (re-export for convenience)
export type {
  TenantType,
  MemberRole,
  Tenant,
  TenantMember,
  TenantPermissions as TenantPermissionsType,
  UserTenantsResponse,
  UseTenantReturn,
  UseTenantMembersReturn,
} from '@/types/tenant.types';
