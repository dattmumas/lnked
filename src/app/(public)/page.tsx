// import Link from "next/link"; // No longer used directly here
import { ArrowDown } from 'lucide-react';
// import { Button } from "@/components/ui/button"; // Button is now in AnimatedHero
import FragmentedFeeds from '@/components/landing/sections/FragmentedFeeds';
import CreateCollaborate from '@/components/landing/sections/CreateCollaborate';
import AnimatedHero from '@/components/landing/sections/AnimatedHero'; // Added import

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
        <AnimatedHero />{' '}
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

export const dynamic = 'force-static'; // ensure RSC caching for landing
