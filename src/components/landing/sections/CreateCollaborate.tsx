"use client";

import { Button } from "@/components/ui/button";
import Link from "next/link";
import { motion } from "framer-motion";
import { useInView } from "framer-motion";
import { useRef } from "react";

const sectionVariants = {
  hidden: { opacity: 0, y: 50 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: "easeOut", delay: 0.2 }, // Added a small delay
  },
};

export default function CreateCollaborate() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, amount: 0.2 });

  return (
    <motion.section
      ref={ref}
      className="w-full py-12 md:py-16 bg-white text-[#1F1F1F] border-b-2 border-[#E50914]/10"
      initial="hidden"
      animate={isInView ? "visible" : "hidden"}
      variants={sectionVariants}
    >
      <div className="container mx-auto grid md:grid-cols-2 gap-12 px-4 items-center">
        {/* Illustration – two column feeds flowing into one channel */}
        <div className="w-full h-full flex items-center justify-center">
          <svg
            width="600"
            height="400"
            viewBox="0 0 600 400"
            xmlns="http://www.w3.org/2000/svg"
            className="max-w-full"
          >
            {/* Left feed lines */}
            {Array.from({ length: 5 }).map((_, i) => (
              <line
                key={i}
                x1="50"
                y1={60 + i * 50}
                x2="250"
                y2={60 + i * 50}
                stroke="hsl(var(--muted-foreground))"
                strokeWidth="3"
                strokeLinecap="round"
              />
            ))}

            {/* Right feed lines */}
            {Array.from({ length: 5 }).map((_, i) => (
              <line
                key={i + 10}
                x1="550"
                y1={60 + i * 50}
                x2="350"
                y2={60 + i * 50}
                stroke="hsl(var(--muted-foreground))"
                strokeWidth="3"
                strokeLinecap="round"
              />
            ))}

            {/* Converging arrow */}
            <path
              d="M250 200 L300 200 L300 140 L350 140"
              fill="none"
              stroke="hsl(var(--primary))"
              strokeWidth="5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <polygon
              points="350,140 340,130 340,150"
              fill="hsl(var(--primary))"
            />
          </svg>
        </div>

        {/* Copy */}
        <div className="space-y-6">
          <h2 className="text-3xl md:text-4xl font-extrabold">
            Create&nbsp;Your <span className="text-[#E50914]">Channel</span>
          </h2>
          <p className="text-lg text-[#1F1F1F]/80">
            Launch a newsletter in minutes. Invite peers, editors or an entire
            collective to co-author. Every post can be solo or collaborative—
            you decide.
          </p>
          <p className="text-lg text-[#1F1F1F]/80">
            Readers see a single, organised feed; collaborators share drafts,
            comments and revenue splits behind the scenes.
          </p>
          <Button
            asChild
            size="lg"
            className="bg-[#E50914] hover:bg-[#FFCA28] text-white font-bold transition-colors border-none shadow-lg"
          >
            <Link href="/sign-up">Start Writing</Link>
          </Button>
        </div>
      </div>
    </motion.section>
  );
}
