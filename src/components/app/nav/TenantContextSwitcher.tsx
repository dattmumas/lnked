'use client';

import { Check, ChevronDown, LayoutGrid, User, Building } from 'lucide-react';
import React from 'react';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useTenantStore } from '@/stores/tenant-store';

import type { Database } from '@/lib/database.types';

// Constants
const AVATAR_FALLBACK_LENGTH = 2;

type TenantType = Database['public']['Tables']['tenants']['Row'];

interface TenantContextSwitcherProps {
  className?: string;
}

export function TenantContextSwitcher({
  className = '',
}: TenantContextSwitcherProps): React.JSX.Element {
  const {
    currentTenant,
    personalTenant,
    collectiveTenants,
    feedScope,
    actions,
  } = useTenantStore();

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
      <div
        className={`animate-pulse rounded-full bg-muted h-10 w-48 ${className}`}
      />
    );
  }

  const isPersonal = currentTenant.type === 'personal';
  const displayName = isPersonal ? currentTenant.slug : currentTenant.name;
  const initials = displayName.slice(0, AVATAR_FALLBACK_LENGTH).toUpperCase();

  // Get scope display text
  const scopeText =
    feedScope === 'global'
      ? 'All Activity'
      : isPersonal
        ? 'This Space'
        : 'This Collective';

  const TenantIcon = isPersonal ? User : Building;

  return (
    <div className={`flex items-center ${className}`}>
      {/* Tenant Button */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            className="h-10 px-4 rounded-l-full rounded-r-none border-r-0 hover:bg-accent/50 focus:z-10"
          >
            <div className="flex items-center gap-2">
              <div className="h-5 w-5 rounded-sm bg-muted flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-medium">{initials}</span>
              </div>
              <span className="text-sm font-medium truncate max-w-[100px]">
                {displayName}
              </span>
              <ChevronDown className="h-3 w-3 opacity-50" />
            </div>
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="start" className="w-72">
          <DropdownMenuLabel className="text-xs text-muted-foreground uppercase tracking-wide">
            🔄 Switch Space
          </DropdownMenuLabel>

          {/* Current Tenant (highlighted) */}
          <DropdownMenuItem className="flex items-center gap-3 bg-accent/20">
            <TenantIcon className="h-4 w-4 text-primary" />
            <div className="flex flex-col flex-1 min-w-0">
              <span className="text-sm font-medium">{displayName}</span>
              <span className="text-xs text-muted-foreground">
                {isPersonal ? 'Personal Space' : 'Collective'} • Current
              </span>
            </div>
            <Check className="h-4 w-4 text-primary" />
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          {/* Personal Tenant */}
          {personalTenant && personalTenant.id !== currentTenant.id && (
            <DropdownMenuItem
              className="flex items-center gap-3 cursor-pointer"
              onClick={() => {
                if (personalTenant.slug) {
                  void actions.switchTenant(personalTenant.id);
                }
              }}
            >
              <User className="h-4 w-4 text-muted-foreground" />
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

          {/* Collective Tenants */}
          {collectiveTenants
            .filter((tenant) => tenant.id !== currentTenant.id)
            .map((tenant) => (
              <DropdownMenuItem
                key={tenant.id}
                onClick={() => {
                  if (tenant.slug) {
                    void actions.switchTenant(tenant.id);
                  }
                }}
                className="flex items-center gap-3 cursor-pointer"
              >
                <Building className="h-4 w-4 text-muted-foreground" />
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
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Scope Button */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            className="h-10 px-4 rounded-r-full rounded-l-none hover:bg-accent/50 focus:z-10"
          >
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">
                {feedScope === 'global' ? 'All' : 'Lim'}
              </span>
              <ChevronDown className="h-3 w-3 opacity-50" />
            </div>
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="w-72">
          <DropdownMenuLabel className="text-xs text-muted-foreground uppercase tracking-wide">
            {feedScope === 'global' ? 'All' : 'Limited'}
          </DropdownMenuLabel>

          {/* Tenant Scope */}
          <DropdownMenuItem
            onClick={() => actions.setFeedScope('tenant')}
            className="flex items-center gap-3 cursor-pointer"
          >
            <TenantIcon className="h-4 w-4 text-muted-foreground" />
            <div className="flex flex-col flex-1 min-w-0">
              <span className="text-sm font-medium">
                Limited - {isPersonal ? 'This Space' : 'This Collective'}
              </span>
              <span className="text-xs text-muted-foreground">
                Content from this {isPersonal ? 'space' : 'collective'} only
              </span>
            </div>
            {feedScope === 'tenant' && (
              <Check className="h-4 w-4 text-primary" />
            )}
          </DropdownMenuItem>

          {/* Global Scope */}
          <DropdownMenuItem
            onClick={() => actions.setFeedScope('global')}
            className="flex items-center gap-3 cursor-pointer"
          >
            <LayoutGrid className="h-4 w-4 text-muted-foreground" />
            <div className="flex flex-col flex-1 min-w-0">
              <span className="text-sm font-medium">All Activity</span>
              <span className="text-xs text-muted-foreground">
                Content from all your spaces
              </span>
            </div>
            {feedScope === 'global' && (
              <Check className="h-4 w-4 text-primary" />
            )}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

export default TenantContextSwitcher;
