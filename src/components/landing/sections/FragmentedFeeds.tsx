"use client";

import SlideInCard from "../SlideInCard";
import { motion } from "framer-motion";
import { useInView } from "framer-motion";
import { useRef } from "react";

const feeds = [
  {
    id: 1,
    title: "Monday Marketing Memo",
    description: "A 20-minute read buried in your inbox.",
  },
  {
    id: 2,
    title: "Thursday Tech Thoughts",
    description: "Another tab, another context-switch.",
  },
  {
    id: 3,
    title: "Weekend Wellness",
    description: "Saved to read-later… and forgotten.",
  },
];

const sectionVariants = {
  hidden: { opacity: 0, y: 50 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: "easeOut" },
  },
};

export default function FragmentedFeeds() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, amount: 0.2 });

  return (
    <motion.section
      ref={ref}
      className="w-full py-12 md:py-16 bg-muted text-foreground border-b border-primary/10"
      initial="hidden"
      animate={isInView ? "visible" : "hidden"}
      variants={sectionVariants}
    >
      <div className="container mx-auto grid md:grid-cols-2 gap-12 px-4">
        {/* Cards column */}
        <div className="space-y-6 order-2 md:order-1">
          {feeds.map((f, i) => (
            <SlideInCard
              key={f.id}
              index={i}
              title={f.title}
              description={f.description}
            />
          ))}
        </div>

        {/* Copy column */}
        <div className="order-1 md:order-2 flex flex-col justify-center space-y-4">
          <h2 className="text-3xl md:text-4xl font-extrabold">
            Fragmented <span className="text-primary">Feeds</span>
          </h2>
          <p className="text-lg text-muted-foreground">
            Content arrives in isolation—different emails, tabs and apps.
            Keeping up feels like whiplash.
          </p>
          <p className="text-lg text-muted-foreground">
            Lnked weaves these voices together so you can follow ideas, not
            inboxes.
          </p>
        </div>
      </div>
    </motion.section>
  );
}
