"use client";

import {
  LayoutDashboard,
  FileText,
  Users2,
  UserSquare,
  Newspaper,
  PlusCircle,
  ListFilter,
} from "lucide-react";
import { SidebarLink } from "../atoms/sidebar-link";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { Button } from "@/components/ui/button";

interface DashboardSidebarProps {
  className?: string;
  // This could also accept user data for showing personal info
}

const mainNavItems = [
  {
    href: "/dashboard",
    icon: LayoutDashboard,
    label: "Overview",
  },
  {
    href: "/dashboard/posts",
    icon: FileText,
    label: "My Posts",
  },
];

const collectiveNavItems = [
  {
    href: "/dashboard/collectives",
    icon: Users2,
    label: "My Collectives",
  },
];

const settingsNavItems = [
  {
    href: "/dashboard/profile/edit",
    icon: UserSquare,
    label: "Edit Profile",
  },
  {
    href: "/dashboard/my-newsletter/subscribers",
    icon: Newspaper,
    label: "Newsletter",
  },
];

export function DashboardSidebar({ className }: DashboardSidebarProps) {
  return (
    <aside
      className={cn(
        "bg-sidebar text-sidebar-foreground flex flex-col border-r border-sidebar-border h-full w-64 py-4 overflow-y-auto",
        className
      )}
      aria-label="Dashboard sidebar"
    >
      <div className="px-4 mb-6">
        <Link
          href="/"
          className="flex items-center gap-2 text-lg font-semibold"
        >
          <span className="text-sidebar-primary">Lnked</span>
        </Link>
      </div>

      <div className="space-y-6 px-2">
        <nav className="flex flex-col gap-1" aria-label="Main">
          {mainNavItems.map((item) => (
            <SidebarLink
              key={item.href}
              href={item.href}
              icon={item.icon}
              label={item.label}
              exact={item.href === "/dashboard"}
            />
          ))}
        </nav>

        <div>
          <div className="px-3 py-2 flex items-center justify-between">
            <h2 className="text-xs uppercase tracking-wider font-medium text-sidebar-foreground/50">
              Collectives
            </h2>
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                aria-label="Filter collectives"
              >
                <ListFilter className="size-3" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                aria-label="Create new collective"
                asChild
              >
                <Link href="/dashboard/collectives/new">
                  <PlusCircle className="size-3" />
                </Link>
              </Button>
            </div>
          </div>

          <nav className="flex flex-col gap-1" aria-label="Collectives">
            {collectiveNavItems.map((item) => (
              <SidebarLink
                key={item.href}
                href={item.href}
                icon={item.icon}
                label={item.label}
              />
            ))}
          </nav>
        </div>

        <div>
          <div className="px-3 py-2">
            <h2 className="text-xs uppercase tracking-wider font-medium text-sidebar-foreground/50">
              Settings
            </h2>
          </div>

          <nav className="flex flex-col gap-1" aria-label="Settings">
            {settingsNavItems.map((item) => (
              <SidebarLink
                key={item.href}
                href={item.href}
                icon={item.icon}
                label={item.label}
              />
            ))}
          </nav>
        </div>
      </div>

      <div className="mt-auto px-4 py-4 flex justify-center">
        <Button variant="outline" size="sm" asChild className="w-full">
          <Link href="/dashboard/new-personal-post">
            <PlusCircle className="size-4 mr-2" />
            Create Post
          </Link>
        </Button>
      </div>
    </aside>
  );
}
