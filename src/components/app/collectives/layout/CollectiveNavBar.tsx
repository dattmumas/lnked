'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { cn } from '@/lib/utils';

interface CollectiveNavBarProps {
  slug: string;
}

const navItems = [
  { name: 'Posts', href: '' },
  { name: 'About', href: '/about' },
  { name: 'Members', href: '/members' },
];

export function CollectiveNavBar({ slug }: CollectiveNavBarProps) {
  const pathname = usePathname();
  const basePath = `/collectives/${slug}`;

  return (
    <nav className="border-b border-gray-300">
      <div className="container mx-auto flex items-center justify-center space-x-8">
        {navItems.map((item) => {
          const href = `${basePath}${item.href}`;
          const isActive = pathname === href;
          return (
            <Link
              key={item.name}
              href={href}
              className={cn(
                'py-3 text-sm font-medium transition-colors',
                isActive
                  ? 'border-b-2 border-black text-black'
                  : 'text-gray-600 hover:text-black',
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
