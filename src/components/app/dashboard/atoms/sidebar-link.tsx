"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import React from "react";

// Tiny helper until we have a central utility
function clsx(...classes: (string | undefined | null | false)[]) {
  return classes.filter(Boolean).join(" ");
}

interface SidebarLinkProps {
  href: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}

// Radix primitive not needed for a simple anchor; interactive state is handled
// by Tailwind state classes. Component marked as client because it relies on
// `usePathname` (hook).
export default function SidebarLink({
  href,
  icon,
  children,
}: SidebarLinkProps) {
  const pathname = usePathname();
  const active = pathname === href;

  return (
    <Link
      href={href}
      className={clsx(
        "group flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
        active
          ? "bg-primary text-primary-foreground hover:bg-primary/90"
          : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
      )}
    >
      {icon && (
        <span className="h-5 w-5" aria-hidden>
          {icon}
        </span>
      )}
      <span>{children}</span>
    </Link>
  );
}
