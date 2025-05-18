import React from "react";
import DashboardShell from "@/components/app/dashboard/template/dashboard-shell";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dashboard | Lnked",
  description: "Manage your posts, newsletters, and collectives",
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DashboardShell>{children}</DashboardShell>;
}
