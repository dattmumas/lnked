"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

const heroContainerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.2,
      delayChildren: 0.2,
    },
  },
};

const titleItemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: { type: "spring", stiffness: 100, damping: 12 },
  },
};

const textItemVariants = {
  hidden: { y: 15, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: { type: "tween", duration: 0.5 },
  },
};

const buttonItemVariants = {
  hidden: { scale: 0.8, opacity: 0 },
  visible: {
    scale: 1,
    opacity: 1,
    transition: { type: "spring", stiffness: 120, damping: 10 },
  },
};

const wordContainerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.08,
    },
  },
};

const wordVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: "spring", stiffness: 100, damping: 12 },
  },
};

const AnimatedHero = () => {
  const tagline = "The Future of Your Feed, Forged by You.";
  const taglineWords = tagline.split(" ");

  return (
    <motion.section
      className="z-10 flex flex-col items-center text-center space-y-8 py-16 md:py-20"
      variants={heroContainerVariants}
      initial="hidden"
      animate="visible"
    >
      <motion.h1
        className="text-5xl md:text-7xl font-bold font-serif tracking-tight"
        variants={titleItemVariants}
      >
        Lnked
        <motion.span variants={titleItemVariants} className="text-primary">
          .
        </motion.span>
      </motion.h1>

      <motion.p
        className="text-xl md:text-2xl text-muted-foreground max-w-2xl"
        variants={wordContainerVariants}
      >
        {taglineWords.map((word, index) => (
          <motion.span
            key={index}
            variants={wordVariants}
            style={{ display: "inline-block", marginRight: "0.25em" }}
          >
            {word}
          </motion.span>
        ))}
      </motion.p>

      <motion.p
        className="text-lg text-muted-foreground max-w-xl"
        variants={textItemVariants}
      >
        Unearth unique newsletters. Forge collaborative collectives. Own your
        narrative.
      </motion.p>

      <motion.div variants={buttonItemVariants}>
        <Link href="/discover">
          <Button size="lg" variant="default">
            Explore Now
          </Button>
        </Link>
      </motion.div>
    </motion.section>
  );
};

export default AnimatedHero;
