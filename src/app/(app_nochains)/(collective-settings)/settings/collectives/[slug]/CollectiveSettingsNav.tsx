'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { cn } from '@/lib/utils';

const settingsNavItems = [
  { name: 'General', href: '' },
  { name: 'Members', href: '/members' },
  { name: 'Branding', href: '/branding' },
  { name: 'Monetization', href: '/monetization' },
  { name: 'Moderation', href: '/moderation' },
  { name: 'Danger Zone', href: '/danger' },
];

export function CollectiveSettingsNav() {
  const pathname = usePathname();

  // Extract the base path for settings to correctly match links
  const basePath = pathname.substring(
    0,
    pathname.lastIndexOf('/settings/') + 9,
  );
  const collectiveSlug = pathname.split('/')[3];
  const settingsBasePath = `/settings/collectives/${collectiveSlug}`;

  return (
    <nav className="flex flex-col space-y-2">
      <h2 className="text-lg font-semibold tracking-tight">
        Collective Settings
      </h2>
      <div className="space-y-1">
        {settingsNavItems.map((item) => {
          const href = `${settingsBasePath}${item.href}`;
          const isActive = pathname === href;
          return (
            <Link
              key={item.name}
              href={href}
              className={cn(
                'block px-3 py-2 text-sm rounded-md',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'hover:bg-accent hover:text-accent-foreground',
              )}
            >
              {item.name}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
