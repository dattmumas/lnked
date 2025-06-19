'use client';

import {
  Menu,
  PenSquare,
  FileText,
  User as UserIcon,
  Settings,
  LogOut,
  Search,
  MessageCircle,
  Video,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState, useMemo } from 'react';

import ModeToggle from '@/components/app/nav/ModeToggle';
import SearchBar from '@/components/app/nav/SearchBar';
import { NotificationDropdown } from '@/components/notifications/NotificationDropdown';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
} from '@/components/ui/sheet';
import { useUnreadMessages } from '@/hooks/use-unread-messages';
import { useUser } from '@/hooks/useUser';
import supabase from '@/lib/supabase/browser';
import { getOptimizedAvatarUrl } from '@/lib/utils/avatar';

import { Button } from './ui/button';

import type { User } from '@supabase/supabase-js';

// Navigation items are now handled by GlobalSidebar
const publicNavItems: never[] = [];
const authenticatedNavItems: never[] = [];

export interface ModernNavbarProps {
  initialUser?: User | null;
  initialProfile?: {
    username: string | null;
    full_name: string | null;
    avatar_url: string | null;
  } | null;
}

export default function ModernNavbar({
  initialUser,
  initialProfile,
}: ModernNavbarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading } = useUser();
  const [username, setUsername] = useState<string | null>(
    initialProfile?.username ?? null,
  );
  const [userMetadata, setUserMetadata] = useState({
    full_name: initialProfile?.full_name ?? null,
    avatar_url: initialProfile?.avatar_url ?? null,
  });
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const { unreadCount } = useUnreadMessages(user?.id);

  // supabase is now the singleton instance directly

  // Memoized optimized avatar URLs
  const optimizedAvatarUrls = useMemo(() => {
    if (!userMetadata.avatar_url) return null;
    return {
      small: getOptimizedAvatarUrl(userMetadata.avatar_url, {
        width: 36,
        height: 36,
      }),
      medium: getOptimizedAvatarUrl(userMetadata.avatar_url, {
        width: 48,
        height: 48,
      }),
    };
  }, [userMetadata.avatar_url]);

  useEffect((): void => {
    // If the user object is available from the hook but we don't have profile data, fetch it.
    // This handles client-side sign-ins where initialProfile isn't available.
    if (user && !username && !userMetadata.full_name) {
      supabase
        .from('users')
        .select('username, full_name, avatar_url')
        .eq('id', user.id)
        .single()
        .then(
          ({
            data: profile,
          }: {
            data: {
              username: string | null;
              full_name: string | null;
              avatar_url: string | null;
            } | null;
          }) => {
            if (profile) {
              setUsername(profile.username);
              setUserMetadata({
                full_name: profile.full_name,
                avatar_url: profile.avatar_url,
              });
            }
          },
        );
    } else if (!user) {
      // Clear profile data on sign out
      setUsername(null);
      setUserMetadata({ full_name: null, avatar_url: null });
    }
  }, [user, username, userMetadata.full_name, supabase]);

  const handleSignOut = async () => {
    await void supabase.auth.signOut();
    void router.push('/');
    // No need to set user/loading state manually, the useUser hook handles it.
  };

  const isAuthPage = pathname === '/sign-in' || pathname === '/sign-up';

  if (isAuthPage) {
    return (
      <div className="flex items-center gap-4 h-16 px-8">
        <Button
          variant="ghost"
          size="default"
          asChild
          className="gap-2 h-10 px-4 font-medium"
        >
          <Link href="/">← Back to Home</Link>
        </Button>
        <ModeToggle />
      </div>
    );
  }

  const getUserInitials = () => {
    const name = userMetadata.full_name || username || user?.email;
    return name
      ? name
          .split(' ')
          .map((part) => part[0])
          .join('')
          .toUpperCase()
          .slice(0, 2)
      : 'U';
  };

  return (
    <nav className="w-full">
      <div className="w-full px-4 md:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-8">
            <Link
              href="/"
              className="text-2xl font-extrabold-serif tracking-tight flex items-center gap-0.5 select-none hover:opacity-80 transition-opacity"
              style={{ letterSpacing: '-0.04em' }}
            >
              Lnked<span className="text-accent text-2xl leading-none">.</span>
            </Link>
          </div>

          {user && (
            <div className="hidden lg:block flex-1 max-w-xl mx-8">
              <SearchBar className="w-full h-9" />
            </div>
          )}

          <div className="flex items-center gap-2">
            {loading ? (
              <div className="flex items-center gap-3">
                <div className="h-10 w-20 rounded-lg bg-muted animate-pulse" />
                <div className="h-10 w-10 rounded-full bg-muted animate-pulse" />
              </div>
            ) : user ? (
              <>
                <Button
                  variant="default"
                  size="sm"
                  asChild
                  className="hidden sm:flex gap-2 h-9 px-3 font-medium"
                >
                  <Link href="/posts/new">
                    <PenSquare className="h-4 w-4" />
                    <span>Write</span>
                  </Link>
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  className="lg:hidden h-9 w-9 p-0"
                  onClick={() => void router.push('/search')}
                >
                  <Search className="h-4 w-4" />
                  <span className="sr-only">Search</span>
                </Button>

                <NotificationDropdown userId={user.id} />

                <Button
                  variant="ghost"
                  size="sm"
                  className="relative h-9 w-9 p-0 ml-1"
                  asChild
                >
                  <Link href="/chat">
                    <MessageCircle className="h-4 w-4" />
                    {unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-destructive text-destructive-foreground text-xs font-medium flex items-center justify-center">
                        {unreadCount > 99 ? '99+' : unreadCount}
                      </span>
                    )}
                    <span className="sr-only">Chat</span>
                  </Link>
                </Button>

                <DropdownMenu
                  open={isUserMenuOpen}
                  onOpenChange={setIsUserMenuOpen}
                >
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="relative rounded-full p-0 h-9 w-9"
                    >
                      <Avatar className="h-9 w-9">
                        <AvatarImage
                          src={
                            optimizedAvatarUrls?.small ||
                            userMetadata.avatar_url ||
                            undefined
                          }
                          alt={userMetadata.full_name || username || 'User'}
                        />
                        <AvatarFallback className="text-xs font-medium">
                          {getUserInitials()}
                        </AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-64 shadow-lg">
                    <div className="flex flex-col gap-1 p-3 border-b">
                      <p className="font-medium">
                        {userMetadata.full_name || username || 'User'}
                      </p>
                      <span className="text-xs text-foreground/60">
                        {user.email}
                      </span>
                    </div>
                    <div className="p-1">
                      <DropdownMenuItem asChild className="cursor-pointer">
                        <Link
                          href={`/profile/${username ?? user.id}`}
                          className="gap-3 p-2"
                        >
                          <UserIcon className="h-4 w-4" />
                          <span>Profile</span>
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild className="cursor-pointer">
                        <Link href="/chat" className="gap-3 p-2">
                          <MessageCircle className="h-4 w-4" />
                          <span>Chat</span>
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild className="cursor-pointer">
                        <Link href="/dashboard/posts" className="gap-3 p-2">
                          <FileText className="h-4 w-4" />
                          <span>My Posts</span>
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild className="cursor-pointer">
                        <Link href="/videos" className="gap-3 p-2">
                          <Video className="h-4 w-4" />
                          <span>Video Management</span>
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild className="cursor-pointer">
                        <Link href="/dashboard/settings" className="gap-3 p-2">
                          <Settings className="h-4 w-4" />
                          <span>Settings</span>
                        </Link>
                      </DropdownMenuItem>
                    </div>
                    <DropdownMenuSeparator />
                    <div className="p-1">
                      <DropdownMenuItem
                        onSelect={handleSignOut}
                        className="gap-3 p-2 text-destructive focus:text-destructive cursor-pointer"
                      >
                        <LogOut className="h-4 w-4" />
                        <span>Sign out</span>
                      </DropdownMenuItem>
                    </div>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  asChild
                  className="h-9 px-3 font-medium"
                >
                  <Link href="/sign-in">Sign In</Link>
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  asChild
                  className="h-9 px-3 font-medium"
                >
                  <Link href="/sign-up">Get Started</Link>
                </Button>
              </>
            )}

            <div className="h-5 w-px bg-border mx-1" />
            <ModeToggle />

            {user && (
              <div className="md:hidden">
                <Sheet>
                  <SheetTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-9 w-9 p-0">
                      <Menu className="h-4 w-4" />
                      <span className="sr-only">Menu</span>
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="right" className="w-80">
                    <SheetTitle className="text-xl font-semibold">
                      Menu
                    </SheetTitle>

                    <div className="flex flex-col gap-6 mt-8">
                      <div className="flex items-center gap-4 p-4 rounded-lg bg-accent/30">
                        <Avatar className="h-12 w-12">
                          <AvatarImage
                            src={
                              optimizedAvatarUrls?.medium ||
                              userMetadata.avatar_url ||
                              undefined
                            }
                            alt={userMetadata.full_name || username || 'User'}
                          />
                          <AvatarFallback className="text-sm font-medium">
                            {getUserInitials()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">
                            {userMetadata.full_name || username || 'User'}
                          </p>
                          <p className="text-sm text-foreground/60 truncate">
                            {user.email}
                          </p>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <p className="text-xs font-semibold text-foreground/60 uppercase tracking-wider px-3">
                          Actions
                        </p>
                        <Button
                          variant="default"
                          className="w-full justify-start gap-3 h-11"
                          asChild
                        >
                          <Link href="/posts/new">
                            <PenSquare className="h-5 w-5" />
                            <span className="font-medium">Write New Post</span>
                          </Link>
                        </Button>
                        <Button
                          variant="ghost"
                          className="w-full justify-start gap-3 h-11"
                          asChild
                        >
                          <Link href="/chat">
                            <MessageCircle className="h-5 w-5" />
                            <span className="font-medium">Open Chat</span>
                          </Link>
                        </Button>
                      </div>

                      <div className="space-y-2">
                        <p className="text-xs font-semibold text-foreground/60 uppercase tracking-wider px-3">
                          Account
                        </p>
                        <Button
                          variant="ghost"
                          className="w-full justify-start gap-3 h-11"
                          asChild
                        >
                          <Link href={`/profile/${username ?? user.id}`}>
                            <UserIcon className="h-5 w-5" />
                            <span className="font-medium">Profile</span>
                          </Link>
                        </Button>
                        <Button
                          variant="ghost"
                          className="w-full justify-start gap-3 h-11"
                          asChild
                        >
                          <Link href="/dashboard/settings">
                            <Settings className="h-5 w-5" />
                            <span className="font-medium">Settings</span>
                          </Link>
                        </Button>
                        <Button
                          variant="ghost"
                          className="w-full justify-start gap-3 h-11 text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => void handleSignOut()}
                        >
                          <LogOut className="h-5 w-5" />
                          <span className="font-medium">Sign Out</span>
                        </Button>
                      </div>
                    </div>
                  </SheetContent>
                </Sheet>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
