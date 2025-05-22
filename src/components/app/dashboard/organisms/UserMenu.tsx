'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { LogOut, Settings, User as UserIcon } from 'lucide-react';
import supabase from '@/lib/supabase/browser';

export interface UserMenuProps {
  user: {
    email?: string;
    avatar_url?: string;
    full_name?: string;
    id?: string;
    username?: string;
  } | null;
}

export function UserMenu({ user }: UserMenuProps) {
  const router = useRouter();

  if (!user) return null;

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  const displayName = user.full_name || user.email || 'User';
  const profileUrl = user.username
    ? `/profile/${user.username}`
    : '/dashboard/profile/edit';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="rounded-md px-2 py-1 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-ring/50">
          {displayName}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[180px]">
        <DropdownMenuItem asChild>
          <Link href={profileUrl}>
            <UserIcon className="size-4" />
            <span>My Profile</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/dashboard/settings">
            <Settings className="size-4" />
            <span>Account Settings</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={() => {
            handleSignOut();
          }}
          className="text-destructive focus:bg-destructive focus:text-destructive-foreground"
        >
          <LogOut className="size-4" />
          <span>Sign Out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
