"use client";

import { PlusCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import type { CollectiveSummary } from "./DashboardShell";
import { SidebarNav } from "./SidebarNav";

interface DashboardSidebarProps {
  className?: string;
  collectives: CollectiveSummary[];
  collapsed?: boolean;
}

export function DashboardSidebar({
  className,
  collectives,
  collapsed = false,
}: DashboardSidebarProps) {
  return (
    <aside
      className={cn(
        "bg-sidebar text-sidebar-foreground flex flex-col border-r border-sidebar-border h-full transition-all duration-200 overflow-y-auto",
        collapsed ? "w-16" : "w-64 py-4",
        className
      )}
      aria-label="Dashboard sidebar"
    >
      <div className={cn("px-4 mb-6", collapsed && "text-center px-0 mb-2")}>
        <Link
          href="/"
          className={cn(
            "flex items-center gap-2 font-semibold",
            collapsed ? "justify-center text-xl" : "text-lg"
          )}
        >
          <span className="text-sidebar-primary">
            {collapsed ? "L" : "Lnked"}
          </span>
        </Link>
      </div>

      {/* Navigation sections */}
      <SidebarNav collectives={collectives} collapsed={collapsed} />

      <div
        className={cn(
          "mt-auto px-4 py-4 flex justify-center",
          collapsed && "px-0 py-2"
        )}
      >
        {collapsed ? (
          <Button asChild variant="outline" size="icon">
            <Link href="/dashboard/new-personal-post">
              <PlusCircle className="h-5 w-5" aria-label="Create Post" />
            </Link>
          </Button>
        ) : (
          <Button variant="outline" size="sm" asChild className="w-full">
            <Link href="/dashboard/new-personal-post">
              <PlusCircle className="size-4 mr-2" />
              Create Post
            </Link>
          </Button>
        )}
      </div>
    </aside>
  );
}
