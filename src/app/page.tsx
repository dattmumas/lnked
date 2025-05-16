import Link from "next/link";
import { ArrowDown } from "lucide-react";
import SnippetCard from "@/components/landing/SnippetCard";
import AnimatedBackground from "@/components/landing/AnimatedBackground";

// Removed unused imports and variables related to the old feed page
// import { cookies } from "next/headers";
// import { createServerClient, type CookieOptions } from "@supabase/ssr";
// import type { Database } from "@/lib/database.types";
// import PostCard from "@/components/PostCard";
// import { Button } from "@/components/ui/button";

// type ActualFeedItem =
//   Database["public"]["Functions"]["get_user_feed"]["Returns"][number];

// const WelcomeContent = () => ( ... );

// Sample data for snippet cards - use iconName (string) instead of direct component
const sampleSnippets = [
  {
    id: "1",
    headline: "The Quantum Entanglement of Thought",
    iconName: "Brain",
    categoryHint: "Metaphysics",
    abstract:
      "Exploring the interconnectedness of consciousness and reality through the lens of quantum mechanics.",
    delay: "0.1s",
  },
  {
    id: "2",
    headline: "Ephemeral Cities: A Cartography of Dreams",
    iconName: "Globe",
    categoryHint: "Urban Futures",
    abstract:
      "Mapping the ever-changing landscapes of cities that exist only in collective imagination and memory.",
    delay: "0.2s",
  },
  {
    id: "3",
    headline: "The Syntax of Silence: Unspoken Narratives",
    iconName: "Feather",
    categoryHint: "Literary Theory",
    abstract:
      "Delving into the profound meanings conveyed by what remains unsaid in literature and art.",
    delay: "0.3s",
  },
  {
    id: "4",
    headline: "AI, Ancient Myths, and Algorithmic Archetypes",
    iconName: "Code",
    categoryHint: "Tech & Culture",
    abstract:
      "Investigating how modern AI echoes ancient mythological structures and archetypal patterns.",
    delay: "0.15s",
  },
  {
    id: "5",
    headline: "Bio-Luminescent Botany: The Future of Light",
    iconName: "Leaf",
    categoryHint: "Speculative Bio",
    abstract:
      "Unveiling the potential of genetically engineered plants as sustainable, living light sources.",
    delay: "0.25s",
  },
  {
    id: "6",
    headline: "Decentralized Chronicles: Histories Reimagined",
    iconName: "BookOpen",
    categoryHint: "New Media",
    abstract:
      "How blockchain and distributed ledgers are enabling new forms of recording and validating historical narratives.",
    delay: "0.35s",
  },
];

export default function LandingPage() {
  return (
    <>
      <div className="min-h-screen text-white flex flex-col items-center justify-center p-4 relative overflow-hidden bg-almost-black">
        {/* Animated SVG Blobs and Noise Overlay */}
        <AnimatedBackground />
        {/* Main Content */}
        <main className="z-10 flex flex-col items-center text-center space-y-8 py-20">
          <h1 className="text-5xl md:text-7xl font-bold font-sans">
            <span className="text-gray-100">l</span>
            <span className="text-gray-100">n</span>
            <span className="text-gray-100">k</span>
            <span className="text-gray-100">e</span>
            <span className="text-gray-100">d</span>
            <span className="text-blue-400">.</span>
          </h1>

          <p className="text-xl md:text-2xl text-gray-300 max-w-2xl font-sans">
            The Future of Your Feed, Forged by You.
          </p>

          <p className="text-lg text-gray-400 max-w-xl font-sans">
            Unearth unique newsletters. Forge collaborative collectives. Own
            your narrative.
          </p>

          <Link
            href="/discover"
            className="mt-8 px-8 py-3 bg-transparent border-2 border-white text-white text-lg font-semibold rounded-lg hover:bg-white hover:text-almost-black transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-white focus:ring-opacity-50 font-sans"
          >
            Explore Now
          </Link>
        </main>

        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center space-y-1 animate-bounce">
          <span className="text-sm text-gray-400 font-sans">Scroll</span>
          <ArrowDown className="w-5 h-5 text-gray-400" />
        </div>
      </div>

      {/* Stream of Consciousness Section */}
      <section
        id="stream"
        className="w-full py-16 md:py-24 bg-true-black text-white"
      >
        <div className="container mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold font-sans text-center mb-12 md:mb-16">
            A Glimpse Into the Flow...
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
            {sampleSnippets.map((snippet) => (
              <SnippetCard
                key={snippet.id}
                headline={snippet.headline}
                iconName={snippet.iconName}
                categoryHint={snippet.categoryHint}
                abstract={snippet.abstract}
              />
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
