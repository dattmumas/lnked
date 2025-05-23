'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { motion, useScroll, useTransform } from 'framer-motion';
import { useRef } from 'react';
import { ArrowDown, Newspaper, Edit3 } from 'lucide-react';

const NewspaperHero = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end start'],
  });

  // Parallax transforms
  const opacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);

  // Typography animations
  const heroContainerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
        delayChildren: 0.3,
      },
    },
  };

  const titleItemVariants = {
    hidden: { y: 50, opacity: 0, rotateX: -15 },
    visible: {
      y: 0,
      opacity: 1,
      rotateX: 0,
      transition: {
        type: 'spring',
        stiffness: 100,
        damping: 12,
        duration: 0.8,
      },
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
    hidden: { opacity: 0, y: 20, rotateX: -10 },
    visible: {
      opacity: 1,
      y: 0,
      rotateX: 0,
      transition: { type: 'spring', stiffness: 100, damping: 12 },
    },
  };

  const tagline = 'The Future of Your Feed, Forged by You.';
  const taglineWords = tagline.split(' ');

  return (
    <div
      ref={containerRef}
      className="relative min-h-screen overflow-hidden bg-white dark:bg-black"
    >
      {/* Subtle newspaper texture */}
      <div className="absolute inset-0 opacity-[0.02]">
        <div
          className="absolute inset-0 bg-repeat"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='60' height='60' viewBox='0 0 60 60'%3E%3Cg fill='none' stroke='%23000' stroke-width='0.5' opacity='0.1'%3E%3Cpath d='M0 20h60M0 40h60'/%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />
      </div>

      {/* Hero content */}
      <motion.div
        className="relative z-10 min-h-screen flex flex-col items-center justify-center px-4"
        style={{ opacity }}
      >
        <motion.section
          className="text-center space-y-8 max-w-4xl mx-auto"
          variants={heroContainerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* Logo with newspaper masthead styling */}
          <motion.div variants={titleItemVariants} className="relative">
            <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 w-full h-px bg-gradient-to-r from-transparent via-black/20 to-transparent" />
            <h1 className="text-7xl md:text-9xl font-bold font-serif tracking-tight text-black dark:text-white relative">
              <span className="relative">
                Lnked
                <motion.span
                  className="text-red-600 dark:text-red-500"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 1, type: 'spring' }}
                >
                  .
                </motion.span>
              </span>
            </h1>
            <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-full h-px bg-gradient-to-r from-transparent via-black/20 to-transparent" />
          </motion.div>

          {/* Tagline with typewriter effect */}
          <motion.p
            className="text-2xl md:text-4xl text-black dark:text-white max-w-3xl font-light leading-tight"
            variants={wordContainerVariants}
          >
            {taglineWords.map((word, index) => (
              <motion.span
                key={index}
                variants={wordVariants}
                className="inline-block mr-2"
              >
                {word}
              </motion.span>
            ))}
          </motion.p>

          {/* Subtitle */}
          <motion.p
            className="text-lg md:text-xl text-gray-700 dark:text-gray-300 max-w-2xl leading-relaxed"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 2, duration: 0.8 }}
          >
            The future of social media is{' '}
            <span className="text-black dark:text-white font-semibold border-b-2 border-red-600">
              collective experience.
            </span>
            <br />
            Create your own.
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            className="flex flex-col sm:flex-row gap-4 justify-center items-center"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 2.5, duration: 0.8 }}
          >
            <Link href="/discover">
              <Button
                size="lg"
                className="bg-red-600 hover:bg-red-700 text-white px-8 py-3 text-lg font-semibold shadow-xl transform hover:scale-105 transition-all duration-200"
              >
                <Newspaper className="mr-2 h-5 w-5" />
                Explore Now
              </Button>
            </Link>
            <Link href="/sign-up">
              <Button
                variant="outline"
                size="lg"
                className="border-2 border-black dark:border-white text-black dark:text-white px-8 py-3 text-lg font-semibold hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-all duration-200"
              >
                <Edit3 className="mr-2 h-5 w-5" />
                Start Writing
              </Button>
            </Link>
          </motion.div>

          {/* Stats bar - newspaper style */}
          <motion.div
            className="border-t border-b border-black dark:border-white py-6 mt-12"
            initial={{ opacity: 0, width: 0 }}
            animate={{ opacity: 1, width: '100%' }}
            transition={{ delay: 3, duration: 1 }}
          >
            <div className="flex justify-center space-x-16 text-sm font-mono uppercase tracking-wider">
              <div className="text-center">
                <div className="text-3xl font-bold text-black dark:text-white">
                  ∞
                </div>
                <div className="text-gray-600 dark:text-gray-400 mt-1">
                  Stories
                </div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-black dark:text-white">
                  ∞
                </div>
                <div className="text-gray-600 dark:text-gray-400 mt-1">
                  Writers
                </div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-red-600">∞</div>
                <div className="text-gray-600 dark:text-gray-400 mt-1">
                  Readers
                </div>
              </div>
            </div>
          </motion.div>
        </motion.section>

        {/* Scroll indicator */}
        <motion.div
          className="absolute bottom-10 left-1/2 transform -translate-x-1/2 flex flex-col items-center space-y-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 4, duration: 0.8 }}
        >
          <span className="text-sm text-gray-500 dark:text-gray-400 font-mono">
            SCROLL TO CONTINUE
          </span>
          <motion.div
            animate={{ y: [0, 10, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          >
            <ArrowDown className="w-6 h-6 text-gray-500 dark:text-gray-400" />
          </motion.div>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default NewspaperHero;
