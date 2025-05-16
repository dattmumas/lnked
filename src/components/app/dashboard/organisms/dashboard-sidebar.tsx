import Link from "next/link";
import { LayoutDashboard, FileText, Users2, UserSquare } from "lucide-react";
import SidebarLink from "../atoms/sidebar-link";

export default function DashboardSidebar() {
  return (
    <aside className="hidden md:flex md:flex-col w-56 md:w-64 max-w-xs bg-sidebar text-sidebar-foreground border-r-2 border-border flex-shrink-0">
      <div className="px-4 h-16 flex items-center border-b border-border">
        <Link href="/dashboard" className="flex items-center gap-2">
          <h1 className="text-xl font-semibold tracking-tight text-primary">
            Lnked
          </h1>
        </Link>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto">
        <SidebarLink
          href="/dashboard"
          icon={<LayoutDashboard className="h-5 w-5" />}
        >
          Overview
        </SidebarLink>
        <SidebarLink
          href="/dashboard/posts"
          icon={<FileText className="h-5 w-5" />}
        >
          My Posts
        </SidebarLink>
        <SidebarLink
          href="/dashboard/collectives"
          icon={<Users2 className="h-5 w-5" />}
        >
          My Collectives
        </SidebarLink>
      </nav>
      <div className="mt-auto p-3 border-t border-border space-y-1.5">
        <SidebarLink
          href="/dashboard/profile/edit"
          icon={<UserSquare className="h-5 w-5" />}
        >
          Edit Profile
        </SidebarLink>
      </div>
    </aside>
  );
}
