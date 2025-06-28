'use client';

import {
  User,
  Bell,
  Shield,
  CreditCard,
  Users2,
  Palette,
  Globe,
  Settings,
  ChevronDown,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/Collapsible';
import { cn } from '@/lib/utils';

interface Tenant {
  id: string;
  name: string;
  slug: string;
  avatar_url?: string | null;
  role: string;
}

interface SettingsSidebarProps {
  tenants: Tenant[];
  userId: string;
}

const userSettingsItems = [
  { icon: User, label: 'Profile', href: '/settings/user' },
  { icon: Bell, label: 'Notifications', href: '/settings/user/notifications' },
  { icon: Shield, label: 'Security', href: '/settings/user/security' },
  { icon: CreditCard, label: 'Billing', href: '/settings/user/billing' },
  { icon: Palette, label: 'Appearance', href: '/settings/user/appearance' },
  { icon: Globe, label: 'Advanced', href: '/settings/user/advanced' },
];

const getTenantSettingsItems = (tenantSlug: string, role: string) => {
  const items = [
    { icon: Settings, label: 'General', href: `/settings/${tenantSlug}` },
    { icon: Users2, label: 'Members', href: `/settings/${tenantSlug}/members` },
  ];

  // Add role-specific items
  if (role === 'owner' || role === 'admin') {
    items.push(
      {
        icon: Shield,
        label: 'Permissions',
        href: `/settings/${tenantSlug}/permissions`,
      },
      {
        icon: CreditCard,
        label: 'Billing',
        href: `/settings/${tenantSlug}/billing`,
      },
    );
  }

  if (role === 'owner') {
    items.push({
      icon: Globe,
      label: 'Advanced',
      href: `/settings/${tenantSlug}/advanced`,
    });
  }

  return items;
};

export default function SettingsSidebar({
  tenants,
  userId,
}: SettingsSidebarProps) {
  const pathname = usePathname();
  const [tenantsExpanded, setTenantsExpanded] = useState(true);

  const isActiveRoute = (href: string) => {
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  return (
    <aside className="w-64 border-r bg-background min-h-screen sticky top-16">
      <nav className="p-4 space-y-6">
        {/* User Settings Section */}
        <div>
          <h3 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Personal Settings
          </h3>
          <div className="space-y-1">
            {userSettingsItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
                  'hover:bg-accent hover:text-accent-foreground',
                  isActiveRoute(item.href) &&
                    'bg-accent text-accent-foreground font-medium',
                )}
              >
                <item.icon className="h-4 w-4" />
                <span>{item.label}</span>
              </Link>
            ))}
          </div>
        </div>

        {/* Tenant Settings Section */}
        {tenants.length > 0 && (
          <div>
            <Collapsible
              open={tenantsExpanded}
              onOpenChange={setTenantsExpanded}
            >
              <CollapsibleTrigger asChild title="Toggle tenant settings">
                <Button
                  variant="ghost"
                  className="w-full justify-between p-0 h-auto hover:bg-transparent"
                >
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                    Tenant Settings
                  </h3>
                  <ChevronDown
                    className={cn(
                      'h-4 w-4 transition-transform',
                      tenantsExpanded && 'rotate-180',
                    )}
                  />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-3 space-y-4">
                {tenants.map((tenant) => (
                  <div key={tenant.id} className="space-y-1">
                    <div className="flex items-center gap-2 px-3 py-1">
                      <Avatar className="h-5 w-5">
                        <AvatarImage src={tenant.avatar_url || undefined} />
                        <AvatarFallback className="text-xs">
                          {tenant.name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm font-medium truncate">
                        {tenant.name}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        ({tenant.role})
                      </span>
                    </div>
                    <div className="pl-7 space-y-1">
                      {getTenantSettingsItems(tenant.slug, tenant.role).map(
                        (item) => (
                          <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                              'flex items-center gap-3 px-3 py-1.5 rounded-lg text-sm transition-colors',
                              'hover:bg-accent hover:text-accent-foreground',
                              isActiveRoute(item.href) &&
                                'bg-accent text-accent-foreground font-medium',
                            )}
                          >
                            <item.icon className="h-3.5 w-3.5" />
                            <span>{item.label}</span>
                          </Link>
                        ),
                      )}
                    </div>
                  </div>
                ))}
              </CollapsibleContent>
            </Collapsible>
          </div>
        )}
      </nav>
    </aside>
  );
}
