// Tenant Switcher Component
// Allows users to switch between their personal and collective tenants

'use client';

import { ChevronDown } from 'lucide-react';
import React from 'react';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useTenantStore } from '@/stores/tenant-store';

import type { Database } from '@/lib/database.types';

// Constants
const AVATAR_FALLBACK_LENGTH = 2;

type TenantType = Database['public']['Tables']['tenants']['Row'];

interface TenantSwitcherProps {
  compact?: boolean;
}

function TenantSwitcher({
  compact = false,
}: TenantSwitcherProps): React.JSX.Element {
  const { currentTenant, personalTenant, collectiveTenants, actions } =
    useTenantStore();

  const getDisplayName = React.useCallback((tenant: TenantType): string => {
    if (tenant.type === 'personal') {
      return tenant.slug;
    }
    return tenant.name;
  }, []);

  const getAvatarFallback = React.useCallback(
    (tenant: TenantType): string => {
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

  // For currentTenant (TenantContext), use the appropriate display logic
  const displayName =
    currentTenant.type === 'personal' ? currentTenant.slug : currentTenant.name;
  const initials = displayName.slice(0, AVATAR_FALLBACK_LENGTH).toUpperCase();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="h-auto p-3 justify-start space-x-3 hover:bg-accent/50"
        >
          <div className="h-8 w-8 rounded-md bg-muted flex items-center justify-center">
            <span className="text-sm font-medium">{initials}</span>
          </div>
          <span className="text-sm font-medium truncate max-w-[120px]">
            {displayName}
          </span>
          <ChevronDown className="h-4 w-4 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        {personalTenant && (
          <DropdownMenuItem
            className="flex items-center space-x-2 cursor-pointer"
            onClick={() => {
              if (
                personalTenant.slug === null ||
                personalTenant.slug === undefined
              ) {
                console.error('Cannot switch to tenant: missing slug');
                return;
              }
              void actions.switchTenant(personalTenant.id);
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
          </DropdownMenuItem>
        )}

        {collectiveTenants.length > 0 && (
          <>
            <DropdownMenuSeparator />
            {collectiveTenants.map((tenant) => (
              <DropdownMenuItem
                key={tenant.id}
                onClick={() => {
                  if (tenant.slug === null || tenant.slug === undefined) {
                    console.error('Cannot switch to tenant: missing slug');
                    return;
                  }
                  void actions.switchTenant(tenant.id);
                }}
                className="flex items-center space-x-2 cursor-pointer"
              >
                <div className="h-6 w-6 rounded-md bg-muted flex items-center justify-center">
                  <span className="text-xs font-medium">
                    {getAvatarFallback(tenant)}
                  </span>
                </div>
                <div className="flex flex-col flex-1 min-w-0">
                  <span className="text-sm font-medium truncate">
                    {getDisplayName(tenant)}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    Collective
                  </span>
                </div>
              </DropdownMenuItem>
            ))}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default TenantSwitcher;
