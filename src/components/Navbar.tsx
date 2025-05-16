"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase";
import type { User } from "@supabase/supabase-js";
import { Button } from "./ui/button";

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

  return (
    <nav className="bg-background border-b sticky top-0 z-50">
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
          <div className="flex items-center space-x-3">
            {isLoading ? (
              <div className="h-8 w-20 bg-muted rounded animate-pulse"></div> // Skeleton loader
            ) : user ? (
              <>
                <Button
                  variant={pathname === "/" ? "secondary" : "ghost"}
                  onClick={() => router.push("/")}
                >
                  Feed
                </Button>
                <Button
                  variant={pathname === "/dashboard" ? "secondary" : "ghost"}
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
        </div>
      </div>
    </nav>
  );
}
