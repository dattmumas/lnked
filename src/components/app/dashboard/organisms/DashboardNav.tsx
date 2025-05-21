'use client';

import { Menu, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ModeToggle } from '@/components/ui/mode-toggle';
import type { CollectiveSummary } from './DashboardShell';
import React, { useState, useEffect } from 'react';
import { CollectiveSelectorDropdown } from './CollectiveSelectorDropdown';
import { UserMenu } from '@/components/app/dashboard/organisms/UserMenu';
import { createSupabaseBrowserClient } from '@/lib/supabase/browser';
import { getCurrentUserProfile } from '@/lib/supabase/actions';
import { SidebarNav } from './SidebarNav';
import * as Sheet from '@radix-ui/react-dialog';

interface DashboardNavProps {
  sidebarCollapsed: boolean;
  onToggleSidebar: () => void;
  collectives: CollectiveSummary[];
}

interface UserProfile {
  email?: string;
  avatar_url?: string;
  full_name?: string;
}

export function DashboardNav({
  sidebarCollapsed,
  onToggleSidebar,
  collectives,
}: DashboardNavProps) {
  // Feed type: 'personal' or 'collective'
  const [feedType, setFeedType] = useState<'personal' | 'collective'>(
    'personal',
  );
  // Selected collective for collective feed
  const [selectedCollective, setSelectedCollective] = useState<string | null>(
    null,
  );
  // User state
  const [user, setUser] = useState<UserProfile | null>(null);
  // Mobile sidebar sheet state
  const [sheetOpen, setSheetOpen] = useState<boolean>(false);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        // First try the server action
        const result = await getCurrentUserProfile();

        if (result?.user) {
          setUser({
            email: result.user.email || undefined,
            avatar_url:
              result.profile?.avatar_url ||
              result.user.user_metadata?.avatar_url,
            full_name:
              result.profile?.full_name ||
              result.user.user_metadata?.full_name ||
              result.user.email?.split('@')[0],
          });
          return;
        }

        // Fall back to client-side auth if server action fails
        const supabase = createSupabaseBrowserClient();
        const { data: userData } = await supabase.auth.getUser();

        if (userData?.user) {
          setUser({
            email: userData.user.email || undefined,
            avatar_url: userData.user.user_metadata?.avatar_url,
            full_name:
              userData.user.user_metadata?.full_name ||
              userData.user.email?.split('@')[0],
          });
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
      }
    };

    fetchUserData();
  }, []);

  return (
    <header className="flex items-center w-full h-12 px-4 border-b border-border bg-background sticky top-0 z-40">
      {/* Sidebar toggle button (desktop) */}
      <Button
        variant="ghost"
        size="icon"
        className="mr-2 hidden md:inline-flex"
        aria-label="Toggle sidebar"
        onClick={onToggleSidebar}
      >
        {sidebarCollapsed ? (
          <ChevronRight className="size-5" />
        ) : (
          <ChevronLeft className="size-5" />
        )}
      </Button>
      {/* Mobile sidebar sheet trigger */}
      <Sheet.Root open={sheetOpen} onOpenChange={setSheetOpen}>
        <Sheet.Trigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="mr-2 md:hidden"
            aria-label="Open navigation menu"
          >
            <Menu className="size-5" />
          </Button>
        </Sheet.Trigger>
        <Sheet.Portal>
          <Sheet.Overlay className="fixed inset-0 bg-black/40 z-50" />
          <Sheet.Content className="fixed top-0 left-0 h-full w-64 bg-sidebar text-sidebar-foreground shadow-lg z-50 p-0">
            <div className="p-4 border-b border-border font-semibold text-lg">
              Navigation
            </div>
            <SidebarNav collectives={collectives} collapsed={false} />
          </Sheet.Content>
        </Sheet.Portal>
      </Sheet.Root>

      {/* Feed type toggle */}
      <div className="flex items-center gap-1">
        <Button
          size="sm"
          variant={feedType === 'personal' ? 'secondary' : 'ghost'}
          aria-pressed={feedType === 'personal'}
          onClick={() => setFeedType('personal')}
        >
          Personal
        </Button>
        <Button
          size="sm"
          variant={feedType === 'collective' ? 'secondary' : 'ghost'}
          aria-pressed={feedType === 'collective'}
          onClick={() => setFeedType('collective')}
        >
          Collectives
        </Button>
      </div>

      {/* Collective selector dropdown (only when collective feed) */}
      {feedType === 'collective' && (
        <div className="ml-3">
          <CollectiveSelectorDropdown
            collectives={collectives}
            value={selectedCollective}
            onChange={setSelectedCollective}
          />
        </div>
      )}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Mode toggle and user menu */}
      <div className="flex items-center gap-2">
        <ModeToggle />
        <UserMenu user={user} />
      </div>
    </header>
  );
}
