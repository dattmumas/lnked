"use client";

import {
  LayoutDashboard,
  FileText,
  Users2,
  UserSquare,
  Newspaper,
} from "lucide-react";
import { SidebarLink } from "../atoms/sidebar-link";
import type { CollectiveSummary } from "../template/dashboard-shell";

interface SidebarNavProps {
  collectives: CollectiveSummary[];
  collapsed?: boolean;
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

export function SidebarNav({
  collectives,
  collapsed = false,
}: SidebarNavProps) {
  return (
    <div className={collapsed ? "space-y-2 px-0" : "space-y-6 px-2"}>
      {/* Main section */}
      <nav
        className={
          collapsed ? "flex flex-col items-center gap-2" : "flex flex-col gap-1"
        }
        aria-label={collapsed ? "Collapsed Main" : "Main"}
      >
        {mainNavItems.map((item) => (
          <SidebarLink
            key={item.href}
            href={item.href}
            icon={item.icon}
            label={item.label}
            exact={item.href === "/dashboard"}
            collapsed={collapsed}
          />
        ))}
      </nav>

      {/* Collectives section */}
      <div>
        {!collapsed && (
          <div className="px-3 py-2 flex items-center justify-between">
            <h2 className="text-xs uppercase tracking-wider font-medium text-sidebar-foreground/50">
              Collectives
            </h2>
          </div>
        )}
        <nav
          className={
            collapsed
              ? "flex flex-col items-center gap-2"
              : "flex flex-col gap-1"
          }
          aria-label={collapsed ? "Collapsed Collectives" : "Collectives"}
        >
          {collectives.length === 0
            ? !collapsed && (
                <span className="text-xs text-muted-foreground px-3 py-1">
                  No collectives
                </span>
              )
            : collectives.map((col) => (
                <SidebarLink
                  key={col.id}
                  href={`/dashboard/collectives/${col.id}`}
                  icon={Users2}
                  label={col.name}
                  collapsed={collapsed}
                />
              ))}
        </nav>
      </div>

      {/* Settings section */}
      <div>
        {!collapsed && (
          <div className="px-3 py-2">
            <h2 className="text-xs uppercase tracking-wider font-medium text-sidebar-foreground/50">
              Settings
            </h2>
          </div>
        )}
        <nav
          className={
            collapsed
              ? "flex flex-col items-center gap-2"
              : "flex flex-col gap-1"
          }
          aria-label={collapsed ? "Collapsed Settings" : "Settings"}
        >
          {settingsNavItems.map((item) => (
            <SidebarLink
              key={item.href}
              href={item.href}
              icon={item.icon}
              label={item.label}
              collapsed={collapsed}
            />
          ))}
        </nav>
      </div>
    </div>
  );
}
