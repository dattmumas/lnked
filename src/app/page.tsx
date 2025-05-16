import Link from "next/link";
import { ArrowDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import FragmentedFeeds from "@/components/landing/sections/FragmentedFeeds";
import CreateCollaborate from "@/components/landing/sections/CreateCollaborate";

// Removed unused imports and variables related to the old feed page
// import { cookies } from "next/headers";
// import { createServerClient, type CookieOptions } from "@supabase/ssr";
// import type { Database } from "@/lib/database.types";
// import PostCard from "@/components/PostCard";
// import { Button } from "@/components/ui/button";

// type ActualFeedItem =
//   Database["public"]["Functions"]["get_user_feed"]["Returns"][number];

// const WelcomeContent = () => ( ... );

export default function LandingPage() {
  return (
    <>
      <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-4 relative overflow-hidden">
        {/* Animated SVG Blobs and Noise Overlay */}
        {/* Background animation removed as per latest direction */}
        {/* Main Content */}
        <main className="z-10 flex flex-col items-center text-center space-y-8 py-20">
          <h1 className="text-5xl md:text-7xl font-bold font-serif tracking-tight">
            Lnked<span className="text-primary">.</span>
          </h1>

          <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl">
            The Future of Your Feed, Forged by You.
          </p>

          <p className="text-lg text-muted-foreground max-w-xl">
            Unearth unique newsletters. Forge collaborative collectives. Own
            your narrative.
          </p>

          <Link href="/discover">
            <Button size="lg" variant="outline">
              Explore Now
            </Button>
          </Link>
        </main>

        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center space-y-1 animate-bounce">
          <span className="text-sm text-muted-foreground">Scroll</span>
          <ArrowDown className="w-5 h-5 text-muted-foreground" />
        </div>
      </div>

      <FragmentedFeeds />

      <CreateCollaborate />

      {/* Stream section removed */}
    </>
  );
}

export const dynamic = "force-static"; // ensure RSC caching for landing
