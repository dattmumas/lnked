'use client';

import { Building, User } from 'lucide-react';

import { useTenant } from '@/providers/TenantProvider';

import type { UserTenantsResponse } from '@/types/tenant.types';

interface TenantSwitcherSidebarProps {
  tenants: UserTenantsResponse[];
  currentTenant: UserTenantsResponse | null;
}

export function TenantSwitcherSidebar({
  tenants,
  currentTenant,
}: TenantSwitcherSidebarProps): React.JSX.Element {
  const { switchTenant } = useTenant();

  const getTenantIcon = (tenant: UserTenantsResponse) => {
    if (tenant.tenant_type === 'personal') {
      return <User className="w-5 h-5" />;
    }
    return <Building className="w-5 h-5" />;
  };

  const getTenantInitials = (tenant: UserTenantsResponse) => {
    return tenant.tenant_name.charAt(0).toUpperCase();
  };

  return (
    <div className="flex flex-col w-16 bg-muted/30 border-r border-border/40">
      {/* Header */}
      <div className="p-3 border-b border-border/40">
        <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
          <span className="text-primary-foreground font-bold text-sm">L</span>
        </div>
      </div>

      {/* Tenant List */}
      <div className="flex-1 overflow-y-auto py-3">
        <div className="space-y-2 px-2">
          {tenants.map((tenant) => (
            <button
              key={tenant.tenant_id}
              onClick={() => switchTenant(tenant.tenant_id)}
              className={`w-12 h-12 rounded-lg flex items-center justify-center transition-colors relative group ${
                currentTenant?.tenant_id === tenant.tenant_id
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground'
              }`}
              title={tenant.tenant_name}
            >
              {/* TODO: Add tenant avatar support when available */}
              <div className="flex items-center justify-center w-full h-full">
                {tenant.tenant_type === 'personal' ? (
                  <User className="w-5 h-5" />
                ) : (
                  <span className="font-semibold text-sm">
                    {getTenantInitials(tenant)}
                  </span>
                )}
              </div>

              {/* Active indicator */}
              {currentTenant?.tenant_id === tenant.tenant_id && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-primary-foreground rounded-r-full" />
              )}

              {/* Tooltip */}
              <div className="absolute left-full ml-2 px-2 py-1 bg-popover text-popover-foreground text-sm rounded shadow-lg opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 whitespace-nowrap">
                {tenant.tenant_name}
                <div className="text-xs text-muted-foreground">
                  {tenant.tenant_type === 'personal'
                    ? 'Personal'
                    : 'Collective'}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-border/40">
        <div className="text-center">
          <div className="text-xs text-muted-foreground">
            {tenants.length} tenant{tenants.length !== 1 ? 's' : ''}
          </div>
        </div>
      </div>
    </div>
  );
}
