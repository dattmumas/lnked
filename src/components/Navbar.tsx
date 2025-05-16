"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase";
import type { User } from "@supabase/supabase-js";
import { Button } from "./ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  Menu,
  LayoutDashboard,
  FileText,
  Users2,
  UserSquare,
  Newspaper,
  LogOut,
} from "lucide-react";
import ModeToggle from "@/components/app/nav/ModeToggle";

const dashboardNavItems = [
  {
    href: "/dashboard",
    label: "Overview",
    icon: <LayoutDashboard className="size-4 mr-2" />,
  },
  {
    href: "/dashboard/posts",
    label: "My Posts",
    icon: <FileText className="size-4 mr-2" />,
  },
  {
    href: "/dashboard/collectives",
    label: "My Collectives",
    icon: <Users2 className="size-4 mr-2" />,
  },
  {
    href: "/dashboard/profile/edit",
    label: "Edit Profile",
    icon: <UserSquare className="size-4 mr-2" />,
  },
];

export default function Navbar() {
  const supabase = createSupabaseBrowserClient();
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user: currentUser },
      } = await supabase.auth.getUser();
      setUser(currentUser);
      setIsLoading(false);
    };
    getUser();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null);
      }
    );

    return () => {
      authListener?.subscription?.unsubscribe();
    };
  }, [supabase.auth, router]);

  const handleSignOut = async () => {
    setIsLoading(true);
    await supabase.auth.signOut();
    setUser(null);
    router.push("/"); // Redirect to home or sign-in page after sign out
    router.refresh();
    setIsLoading(false);
  };

  // Hide Navbar on auth pages or specific routes if desired
  if (pathname === "/sign-in" || pathname === "/sign-up") {
    return null;
  }

  const isDashboardPath = pathname.startsWith("/dashboard");

  return (
    <nav className="bg-background border-b border-border fixed top-0 inset-x-0 z-50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <Link
              href="/"
              className="text-2xl font-bold text-primary hover:text-primary/80 transition-colors"
            >
              Lnked
            </Link>
            {/* You can add more nav links here for different sections if needed */}
            {/* <div className="hidden md:ml-6 md:flex md:space-x-8">
              <Link href="/features" className="text-muted-foreground hover:text-foreground transition-colors">Features</Link>
              <Link href="/pricing" className="text-muted-foreground hover:text-foreground transition-colors">Pricing</Link>
            </div> */}
          </div>
          <div className="hidden md:flex items-center space-x-3">
            {isLoading ? (
              <div className="h-8 w-20 bg-muted rounded animate-pulse"></div> // Skeleton loader
            ) : user ? (
              <>
                <Button
                  variant={pathname === "/discover" ? "secondary" : "ghost"}
                  onClick={() => router.push("/discover")}
                >
                  Discover
                </Button>
                <Button
                  variant={isDashboardPath ? "secondary" : "ghost"}
                  onClick={() => router.push("/dashboard")}
                >
                  Dashboard
                </Button>
                <Button
                  variant="outline"
                  onClick={handleSignOut}
                  disabled={isLoading}
                >
                  Sign Out
                </Button>
              </>
            ) : (
              <>
                <Button variant="ghost" onClick={() => router.push("/sign-in")}>
                  Sign In
                </Button>
                <Button onClick={() => router.push("/sign-up")}>Sign Up</Button>
              </>
            )}
          </div>

          {/* Mobile hamburger */}
          <div className="md:hidden flex items-center space-x-2">
            <ModeToggle />
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Open menu">
                  <Menu className="size-5" />
                </Button>
              </SheetTrigger>
              <SheetContent
                side="left"
                className="p-6 space-y-1 w-[250px] sm:w-[300px]"
              >
                <Link
                  href="/"
                  className="text-xl font-bold text-primary mb-4 block"
                >
                  Lnked
                </Link>
                {isLoading ? (
                  <div className="h-8 w-full bg-muted rounded animate-pulse mt-4" />
                ) : user ? (
                  <div className="flex flex-col space-y-1">
                    {isDashboardPath ? (
                      <>
                        {dashboardNavItems.map((item) => (
                          <Button
                            key={item.href}
                            variant={
                              pathname === item.href ? "secondary" : "ghost"
                            }
                            className="justify-start"
                            onClick={() => router.push(item.href)}
                          >
                            {item.icon} {item.label}
                          </Button>
                        ))}
                        <hr className="my-2" />
                        <Button
                          variant={
                            pathname === "/discover" ? "secondary" : "ghost"
                          }
                          className="justify-start"
                          onClick={() => router.push("/discover")}
                        >
                          <Newspaper className="size-4 mr-2" /> Discover
                        </Button>
                        <Button
                          variant="outline"
                          className="justify-start mt-4"
                          onClick={handleSignOut}
                        >
                          <LogOut className="size-4 mr-2" /> Sign Out
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button
                          variant={
                            pathname === "/discover" ? "secondary" : "ghost"
                          }
                          className="justify-start"
                          onClick={() => router.push("/discover")}
                        >
                          <Newspaper className="size-4 mr-2" /> Discover
                        </Button>
                        <Button
                          variant={isDashboardPath ? "secondary" : "ghost"}
                          className="justify-start"
                          onClick={() => router.push("/dashboard")}
                        >
                          <LayoutDashboard className="size-4 mr-2" /> Dashboard
                        </Button>
                        <Button
                          variant="outline"
                          className="justify-start mt-4"
                          onClick={handleSignOut}
                        >
                          <LogOut className="size-4 mr-2" /> Sign Out
                        </Button>
                      </>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col space-y-2">
                    <Button
                      variant="ghost"
                      className="justify-start"
                      onClick={() => router.push("/sign-in")}
                    >
                      Sign In
                    </Button>
                    <Button
                      className="w-full"
                      onClick={() => router.push("/sign-up")}
                    >
                      Sign Up
                    </Button>
                  </div>
                )}
              </SheetContent>
            </Sheet>
          </div>

          {/* Desktop theme toggle */}
          <div className="hidden md:block">
            <ModeToggle />
          </div>
        </div>
      </div>
    </nav>
  );
}
