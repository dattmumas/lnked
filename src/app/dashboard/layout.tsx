import React from "react";
import Link from "next/link";

// TODO: Implement actual sidebar navigation links and active states
const DashboardSidebar = () => {
  return (
    <aside className="w-64 bg-gray-100 dark:bg-gray-800 p-4 border-r border-gray-200 dark:border-gray-700 flex-shrink-0">
      <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-200">
        Dashboard
      </h2>
      <nav>
        <ul>
          <li className="mb-2">
            <Link
              href="/dashboard"
              className="text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            >
              Overview
            </Link>
          </li>
          <li className="mb-2">
            <Link
              href="/dashboard/posts"
              className="text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            >
              My Posts
            </Link>
          </li>
          <li className="mb-2">
            <Link
              href="/dashboard/collectives"
              className="text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            >
              My Collectives
            </Link>
          </li>
          <li className="mb-2">
            <Link
              href="/dashboard/profile/edit"
              className="text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            >
              Edit Profile
            </Link>
          </li>
          {/* Add more dashboard links here */}
        </ul>
      </nav>
    </aside>
  );
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen bg-background text-foreground">
      <DashboardSidebar />
      <main className="flex-1 p-6 overflow-y-auto">{children}</main>
    </div>
  );
}
