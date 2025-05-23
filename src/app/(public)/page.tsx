// Previous sections - kept for reference
// import FragmentedFeeds from '@/components/landing/sections/FragmentedFeeds';
// import CreateCollaborate from '@/components/landing/sections/CreateCollaborate';
// import AnimatedHero from '@/components/landing/sections/AnimatedHero';
import NewspaperHero from '@/components/landing/sections/NewspaperHero';
import PrintFragmentation from '@/components/landing/sections/PrintFragmentation';
import NewsstandFooter from '@/components/landing/sections/NewsstandFooter';

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
      {/* Hero Section - Animated newspaper unfold */}
      <NewspaperHero />

      {/* Fragmentation Section - 3D scattered papers */}
      <PrintFragmentation />

      {/* Footer Section - Newsstand display */}
      <NewsstandFooter />
    </>
  );
}

export const dynamic = 'force-static'; // ensure RSC caching for landing
