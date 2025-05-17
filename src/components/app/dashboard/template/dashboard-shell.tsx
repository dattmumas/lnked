import React from "react";
import DashboardSidebar from "../organisms/dashboard-sidebar";

interface DashboardShellProps {
  children: React.ReactNode;
}

export default function DashboardShell({ children }: DashboardShellProps) {
  return (
    <div className="flex w-full h-[calc(100vh-5rem)] bg-background text-foreground">
      {/* Sidebar – hidden on mobile, collapses on small screens */}
      <aside className="hidden md:flex md:flex-col md:w-64 bg-sidebar text-sidebar-foreground border-r-2 border-border flex-shrink-0">
        <DashboardSidebar />
      </aside>
      {/* Main content area */}
      <div className="flex-1 overflow-y-auto p-4 md:p-8">{children}</div>
    </div>
  );
}
