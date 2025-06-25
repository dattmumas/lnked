// Tenant Switcher Component
// Allows users to switch between their personal and collective tenants

'use client';

import { ChevronDown } from 'lucide-react';
import React from 'react';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useTenant } from '@/providers/TenantProvider';

import type { UserTenantsResponse } from '@/types/tenant.types';

// Constants
const AVATAR_FALLBACK_LENGTH = 2;

interface TenantSwitcherProps {
  compact?: boolean;
}

function TenantSwitcher({
  compact = false,
}: TenantSwitcherProps): React.JSX.Element {
  const {
    currentTenant,
    userTenants,
    personalTenant,
    collectiveTenants,
    switchTenant,
  } = useTenant();

  const getDisplayName = React.useCallback(
    (tenant: UserTenantsResponse): string => {
      if (tenant.is_personal) {
        return tenant.tenant_slug;
      }
      return tenant.tenant_name;
    },
    [],
  );

  const getAvatarFallback = React.useCallback(
    (tenant: UserTenantsResponse): string => {
      const displayName = getDisplayName(tenant);
      return displayName.slice(0, AVATAR_FALLBACK_LENGTH).toUpperCase();
    },
    [getDisplayName],
  );

  if (!currentTenant) {
    return (
      <div className="flex items-center space-x-2 px-3 py-2 text-sm text-muted-foreground">
        No tenant selected
      </div>
    );
  }

  const displayName = getDisplayName(currentTenant);
  const initials = displayName.slice(0, AVATAR_FALLBACK_LENGTH).toUpperCase();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="h-auto p-2 justify-start space-x-2 hover:bg-accent/50"
        >
          <Avatar className="h-6 w-6">
            <AvatarFallback className="text-xs font-medium">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col items-start min-w-0">
            <span className="text-sm font-medium truncate max-w-[120px]">
              {displayName}
            </span>
            {!currentTenant.is_personal && (
              <Badge variant="secondary" className="text-xs px-1 py-0">
                Collective
              </Badge>
            )}
          </div>
          <ChevronDown className="h-4 w-4 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        {personalTenant && (
          <DropdownMenuItem
              className="flex items-center space-x-2 cursor-pointer"
              onClick={() => {
                switchTenant(personalTenant.tenant_id);
              }}
            >
              <Avatar className="h-6 w-6">
                <AvatarFallback className="text-xs">
                  {getAvatarFallback(personalTenant)}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col flex-1 min-w-0">
                <span className="text-sm font-medium truncate">
                  {getDisplayName(personalTenant)}
                </span>
                <span className="text-xs text-muted-foreground">
                  Personal Space
                </span>
              </div>
              {currentTenant.tenant_id === personalTenant.tenant_id && (
                <Badge variant="default" className="text-xs">
                  Current
                </Badge>
              )}
            </DropdownMenuItem>
        )}

        {collectiveTenants.length > 0 && (
          <>
            <DropdownMenuSeparator />
            {collectiveTenants.map((tenant) => (
              <DropdownMenuItem
                key={tenant.tenant_id}
                className="flex items-center space-x-2 cursor-pointer"
                onClick={() => {
                  switchTenant(tenant.tenant_id);
                }}
              >
                <Avatar className="h-6 w-6">
                  <AvatarFallback className="text-xs">
                    {getAvatarFallback(tenant)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col flex-1 min-w-0">
                  <span className="text-sm font-medium truncate">
                    {getDisplayName(tenant)}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {tenant.user_role}
                  </span>
                </div>
                {currentTenant.tenant_id === tenant.tenant_id && (
                  <Badge variant="default" className="text-xs">
                    Current
                  </Badge>
                )}
              </DropdownMenuItem>
            ))}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default TenantSwitcher;
