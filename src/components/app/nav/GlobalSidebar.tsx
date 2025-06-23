'use client';

import {
  ChevronDown,
  ChevronRight,
  Home,
  MessageCircle,
  Users,
  Video,
  Search,
  Settings,
  Plus,
  User,
  LogOut,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

import { NotificationDropdown } from '@/components/notifications/NotificationDropdown';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useUser } from '@/hooks/useUser';
import { createSupabaseBrowserClient } from '@/lib/supabase/browser';

interface GlobalSidebarProps {
  isCollapsed?: boolean;
  onToggle?: () => void;
}

export function GlobalSidebar({
  isCollapsed: controlledCollapsed,
  onToggle,
}: GlobalSidebarProps): React.JSX.Element {
  const [internalCollapsed, setInternalCollapsed] = useState(false);
  const isCollapsed = controlledCollapsed ?? internalCollapsed;

  const handleToggle = useCallback(() => {
    if (onToggle) {
      onToggle();
    } else {
      setInternalCollapsed((prev) => !prev);
    }
  }, [onToggle]);

  const pathname = usePathname();
  const { user, loading } = useUser();
  const [userProfile, setUserProfile] = useState<{
    avatar_url: string | null;
    full_name: string | null;
    username: string | null;
  } | null>(null);

  // Fetch user profile data
  useEffect(() => {
    const fetchUserProfile = async (): Promise<void> => {
      if (!user?.id) return;

      try {
        const supabase = createSupabaseBrowserClient();
        const { data, error } = await supabase
          .from('users')
          .select('avatar_url, full_name, username')
          .eq('id', user.id)
          .single();

        if (error) {
          console.error('Error fetching user profile:', error);
          return;
        }

        setUserProfile(data);
      } catch (error) {
        console.error('Error fetching user profile:', error);
      }
    };

    void fetchUserProfile();
  }, [user?.id]);

  const handleSignOut = useCallback(async (): Promise<void> => {
    try {
      const supabase = createSupabaseBrowserClient();
      await supabase.auth.signOut();
      window.location.href = '/';
    } catch (error) {
      console.error('Error signing out:', error);
    }
  }, []);

  const getUserDisplayName = useCallback((): string => {
    if (!userProfile) return 'User';
    return userProfile.full_name || userProfile.username || 'User';
  }, [userProfile]);

  const getUserAvatarUrl = useCallback((): string | null => {
    return userProfile?.avatar_url || null;
  }, [userProfile]);

  const mainNavItems = [
    { href: '/home', icon: Home, label: 'Home' },
    { href: '/chat', icon: MessageCircle, label: 'Chat' },
    { href: '/collectives', icon: Users, label: 'Collectives' },
    { href: '/videos', icon: Video, label: 'Videos' },
    { href: '/search', icon: Search, label: 'Search' },
  ];

  return (
    <aside
      className={`flex h-screen flex-col bg-white border-r transition-all duration-200 ${isCollapsed ? 'w-16' : 'w-64'}`}
    >
      {/* Header */}
      <div className="flex h-16 items-center justify-between border-b px-4">
        {!isCollapsed && (
          <Link href="/home" className="flex items-center space-x-2">
            <div className="h-8 w-8 rounded bg-blue-600 flex items-center justify-center">
              <span className="text-white font-bold text-sm">L</span>
            </div>
            <span className="font-semibold text-lg">Lnked</span>
          </Link>
        )}

        <Button
          variant="ghost"
          size="sm"
          onClick={handleToggle}
          className="h-8 w-8 p-0"
        >
          {isCollapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-4 space-y-2">
        {mainNavItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center space-x-3 rounded-lg px-3 py-2 transition-colors ${
                isActive
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <item.icon className="h-5 w-5" />
              {!isCollapsed && <span>{item.label}</span>}
            </Link>
          );
        })}

        {/* Quick Actions */}
        {!isCollapsed && (
          <div className="pt-4 mt-4 border-t">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              Quick Actions
            </h3>
            <div className="space-y-2">
              <Link
                href="/posts/new"
                className="flex items-center space-x-3 rounded-lg px-3 py-2 text-gray-700 hover:bg-gray-100"
              >
                <Plus className="h-5 w-5" />
                <span>New Post</span>
              </Link>
              <Link
                href="/videos/upload"
                className="flex items-center space-x-3 rounded-lg px-3 py-2 text-gray-700 hover:bg-gray-100"
              >
                <Video className="h-5 w-5" />
                <span>Upload Video</span>
              </Link>
            </div>
          </div>
        )}
      </nav>

      {/* User Profile Section */}
      <div className="border-t p-4">
        {loading ? (
          <div className="flex items-center space-x-3">
            <div className="h-8 w-8 rounded-full bg-gray-200 animate-pulse" />
            {!isCollapsed && (
              <div className="h-4 bg-gray-200 rounded flex-1 animate-pulse" />
            )}
          </div>
        ) : user ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3 flex-1 min-w-0">
              <Avatar className="h-8 w-8">
                <AvatarImage
                  src={getUserAvatarUrl() || ''}
                  alt={getUserDisplayName()}
                />
                <AvatarFallback>
                  {getUserDisplayName().charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              {!isCollapsed && (
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {getUserDisplayName()}
                  </p>
                </div>
              )}
            </div>

            <div className="flex items-center space-x-1">
              <NotificationDropdown />

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <Settings className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem asChild>
                    <Link
                      href="/dashboard/profile"
                      className="flex items-center"
                    >
                      <User className="mr-2 h-4 w-4" />
                      <span>Profile</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link
                      href="/dashboard/settings"
                      className="flex items-center"
                    >
                      <Settings className="mr-2 h-4 w-4" />
                      <span>Settings</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut}>
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Sign Out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <Link href="/sign-in">
              <Button variant="outline" size="sm" className="w-full">
                Sign In
              </Button>
            </Link>
          </div>
        )}
      </div>
    </aside>
  );
}
