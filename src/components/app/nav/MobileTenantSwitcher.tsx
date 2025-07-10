'use client';

import React from 'react';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useTenant } from '@/providers/TenantProvider';
import { useUser } from '@/providers/UserContext';

/**
 * MobileTenantSwitcher – a tiny avatar circle fixed to the top-right of
 * the mobile viewport (within the search bar area). Tapping it shows a
 * dropdown list of the user's tenants and lets them switch instantly.
 */
export default function MobileTenantSwitcher(): React.ReactElement {
  const { profile } = useUser();
  const { personalTenant, collectiveTenants, actions } = useTenant();

  // Derive avatar src / fallback
  const avatarSrc = profile?.avatar_url ?? undefined;
  const initials = (profile?.full_name || profile?.username || 'U')
    .slice(0, 2)
    .toUpperCase();

  const getDisplayName = (tenant: {
    type: string;
    name: string;
    slug: string;
  }): string => (tenant.type === 'personal' ? tenant.slug : tenant.name);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Switch tenant"
          className="fixed top-2 right-4 z-40 rounded-full md:hidden"
        >
          <Avatar className="h-9 w-9 border border-white/20 shadow-sm">
            {avatarSrc && <AvatarImage src={avatarSrc} alt="User avatar" />}
            <AvatarFallback className="text-xs">{initials}</AvatarFallback>
          </Avatar>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        sideOffset={8}
        className="w-64 md:hidden"
      >
        {personalTenant && (
          <DropdownMenuItem
            onClick={() => {
              void actions.switchTenant(personalTenant.id);
            }}
            className="cursor-pointer"
          >
            Personal Space — {getDisplayName(personalTenant)}
          </DropdownMenuItem>
        )}
        {collectiveTenants.length > 0 && (
          <>
            {collectiveTenants.map((tenant) => (
              <DropdownMenuItem
                key={tenant.id}
                onClick={() => {
                  void actions.switchTenant(tenant.id);
                }}
                className="cursor-pointer"
              >
                {getDisplayName(tenant)}
              </DropdownMenuItem>
            ))}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
