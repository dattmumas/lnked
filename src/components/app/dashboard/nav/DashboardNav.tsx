"use client";

import { Menu, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ModeToggle } from "@/components/ui/mode-toggle";
import type { CollectiveSummary } from "../template/dashboard-shell";
import React, { useState, useEffect } from "react";
import { CollectiveSelectorDropdown } from "../molecules/CollectiveSelectorDropdown";
import { UserMenu } from "../molecules/UserMenu";
import { createBrowserClient } from "@supabase/ssr";
import { SidebarNav } from "../molecules/SidebarNav";
import * as Sheet from "@radix-ui/react-dialog";

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
  const [feedType, setFeedType] = useState<"personal" | "collective">(
    "personal"
  );
  // Selected collective for collective feed
  const [selectedCollective, setSelectedCollective] = useState<string | null>(
    null
  );
  // User state
  const [user, setUser] = useState<UserProfile | null>(null);
  // Mobile sidebar sheet state
  const [sheetOpen, setSheetOpen] = useState<boolean>(false);

  useEffect(() => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    supabase.auth.getUser().then(async ({ data }: { data: any }) => {
      if (data.user) {
        const { id, email } = data.user;
        // Fetch the corresponding profile from the 'users' table
        const { data: profile } = await supabase
          .from("users")
          .select("full_name, avatar_url")
          .eq("id", id)
          .single();
        setUser({
          email: email ?? undefined,
          avatar_url: profile?.avatar_url || undefined,
          full_name: profile?.full_name || undefined,
        });
      } else {
        setUser(null);
      }
    });
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
          <Sheet.Content
            side="left"
            className="fixed top-0 left-0 h-full w-64 bg-sidebar text-sidebar-foreground shadow-lg z-50 p-0"
          >
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
          variant={feedType === "personal" ? "secondary" : "ghost"}
          aria-pressed={feedType === "personal"}
          onClick={() => setFeedType("personal")}
        >
          Personal
        </Button>
        <Button
          size="sm"
          variant={feedType === "collective" ? "secondary" : "ghost"}
          aria-pressed={feedType === "collective"}
          onClick={() => setFeedType("collective")}
        >
          Collectives
        </Button>
      </div>

      {/* Collective selector dropdown (only when collective feed) */}
      {feedType === "collective" && (
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
