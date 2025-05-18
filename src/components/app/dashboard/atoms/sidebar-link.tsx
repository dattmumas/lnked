"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface SidebarLinkProps {
  href: string;
  icon?: LucideIcon;
  label: string;
  exact?: boolean;
}

export function SidebarLink({
  href,
  icon: Icon,
  label,
  exact = false,
}: SidebarLinkProps) {
  const pathname = usePathname();
  const isActive = exact ? pathname === href : pathname.startsWith(href);

  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-colors",
        isActive
          ? "bg-sidebar-accent/10 text-sidebar-accent font-medium"
          : "text-sidebar-foreground/80 hover:bg-sidebar-accent/5 hover:text-sidebar-foreground"
      )}
      aria-current={isActive ? "page" : undefined}
    >
      {Icon && <Icon className="size-4 shrink-0" />}
      <span>{label}</span>
    </Link>
  );
}
