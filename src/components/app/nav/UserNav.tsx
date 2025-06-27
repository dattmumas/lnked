'use client';

import { Settings, LogOut, ChevronDown } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import React, { useCallback, useState, useEffect } from 'react';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { useUser } from '@/hooks/useUser';
import { Database } from '@/lib/database.types';
import supabase from '@/lib/supabase/browser';
import { getOptimizedAvatarUrl } from '@/lib/utils/avatar';

type Profile = Database['public']['Tables']['users']['Row'];

export function UserNav(): React.ReactElement {
  const { user, loading } = useUser();
  const [profile, setProfile] = useState<Profile | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (user) {
      const fetchProfile = async () => {
        const { data } = await supabase
          .from('users')
          .select('*')
          .eq('id', user.id)
          .single();
        setProfile(data);
      };
      void fetchProfile();
    }
  }, [user]);

  const handleSignOut = useCallback(async (): Promise<void> => {
    await supabase.auth.signOut();
    router.push('/');
  }, [router]);

  if (loading) {
    return <Skeleton className="h-10 w-10 rounded-full" />;
  }

  if (!user) {
    return (
      <Button asChild variant="ghost">
        <Link href="/sign-in">Sign In</Link>
      </Button>
    );
  }

  const avatarUrl = getOptimizedAvatarUrl(profile?.avatar_url ?? undefined, {
    width: 44,
    height: 44,
  });

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="relative h-10 w-10 rounded-full group"
        >
          <Avatar className="h-10 w-10">
            <AvatarImage src={avatarUrl} alt={profile?.username ?? ''} />
            <AvatarFallback>
              {(
                profile?.full_name?.[0] ??
                user?.email?.[0] ??
                'U'
              ).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <ChevronDown className="h-4 w-4 absolute bottom-0 -right-1 bg-background rounded-full text-muted-foreground group-hover:text-foreground transition-colors" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">
              {profile?.full_name ?? user.email}
            </p>
            <p className="text-xs leading-none text-muted-foreground">
              {profile?.username ? `@${profile.username}` : ''}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/dashboard/settings">
            <Settings className="mr-2 h-4 w-4" />
            <span>Settings</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleSignOut}>
          <LogOut className="mr-2 h-4 w-4" />
          <span>Log out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
