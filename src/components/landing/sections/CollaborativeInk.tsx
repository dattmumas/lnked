'use client';

import { motion, useScroll, useTransform, useInView } from 'framer-motion';
import { useRef } from 'react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Users, Edit3, Share2, Merge, Printer } from 'lucide-react';

const CollaborativeInk = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(containerRef, { once: true, amount: 0.3 });

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start end', 'end start'],
  });

  // Mechanical animations
  const gearRotation = useTransform(scrollYProgress, [0, 1], [0, 360]);
  const pressMovement = useTransform(scrollYProgress, [0, 1], ['0%', '10%']);

  const sectionVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { duration: 0.8, staggerChildren: 0.2 },
    },
  };

  const mechanicalVariants = {
    hidden: { opacity: 0, scale: 0.8 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: {
        duration: 1,
        type: 'spring',
        stiffness: 100,
        damping: 15,
      },
    },
  };

  return (
    <section
      ref={containerRef}
      className="relative py-24 bg-white dark:bg-black"
    >
      <div className="container mx-auto px-4 relative z-10">
        <motion.div
          className="grid lg:grid-cols-2 gap-16 items-center"
          variants={sectionVariants}
          initial="hidden"
          animate={isInView ? 'visible' : 'hidden'}
        >
          {/* Simple Collaboration Visual */}
          <motion.div
            className="space-y-8 order-1"
            initial={{ opacity: 0, x: -50 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.8 }}
          >
            <div className="text-center">
              <div className="text-8xl font-mono text-black dark:text-white mb-4">
                +
              </div>
              <p className="text-sm font-mono uppercase tracking-wider text-gray-600 dark:text-gray-400">
                Multiple Voices, One Feed
              </p>
            </div>
          </motion.div>

          {/* Content Column */}
          <motion.div
            className="space-y-8 order-2"
            variants={{
              hidden: { opacity: 0, x: 50 },
              visible: {
                opacity: 1,
                x: 0,
                transition: { duration: 0.8, ease: 'easeOut' },
              },
            }}
          >
            <div className="space-y-4">
              <motion.div
                className="inline-block"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={isInView ? { opacity: 1, scale: 1 } : {}}
                transition={{ delay: 0.2, duration: 0.6 }}
              >
                <span className="bg-black dark:bg-white text-white dark:text-black px-4 py-2 text-sm font-mono uppercase tracking-wider">
                  The Solution
                </span>
              </motion.div>

              <h2 className="text-5xl md:text-6xl font-bold font-serif text-black dark:text-white leading-tight">
                Collaborative{' '}
                <span className="border-b-4 border-red-600">Creation</span>
              </h2>

              <div className="w-32 h-px bg-black dark:bg-white mt-4" />
            </div>

            <div className="space-y-6 text-lg text-gray-700 dark:text-gray-300 leading-relaxed">
              <p>
                Launch a newsletter in minutes. Invite peers, editors or an
                entire collective to co-author. Every post can be{' '}
                <span className="font-semibold text-black dark:text-white">
                  solo or collaborative
                </span>
                — you decide.
              </p>
              <p>
                Readers see a single, organised feed; collaborators share{' '}
                <span className="italic">
                  drafts, comments and revenue splits
                </span>{' '}
                behind the scenes.
              </p>
            </div>

            {/* Features grid */}
            <motion.div
              className="grid grid-cols-2 gap-4"
              initial={{ opacity: 0, y: 30 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: 0.8, duration: 0.6 }}
            >
              {[
                { icon: Edit3, label: 'Co-Author', color: 'text-blue-600' },
                {
                  icon: Share2,
                  label: 'Share Drafts',
                  color: 'text-green-600',
                },
                {
                  icon: Users,
                  label: 'Invite Teams',
                  color: 'text-purple-600',
                },
                { icon: Merge, label: 'Merge Ideas', color: 'text-red-600' },
              ].map((feature, index) => (
                <motion.div
                  key={feature.label}
                  className="flex items-center space-x-3 p-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={isInView ? { opacity: 1, scale: 1 } : {}}
                  transition={{ delay: 1 + index * 0.1, duration: 0.4 }}
                  whileHover={{ scale: 1.05, transition: { duration: 0.2 } }}
                >
                  <feature.icon className={`w-6 h-6 ${feature.color}`} />
                  <span className="font-semibold text-gray-900 dark:text-gray-100">
                    {feature.label}
                  </span>
                </motion.div>
              ))}
            </motion.div>

            {/* CTA */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: 1.2, duration: 0.6 }}
            >
              <Link href="/sign-up">
                <Button
                  size="lg"
                  className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 text-lg font-semibold shadow-xl transform hover:scale-105 transition-all duration-200"
                >
                  <Printer className="mr-2 h-5 w-5" />
                  Start Creating Together
                </Button>
              </Link>
            </motion.div>

            {/* Process steps */}
            <motion.div
              className="pt-8 border-t border-gray-200 dark:border-gray-700"
              initial={{ opacity: 0 }}
              animate={isInView ? { opacity: 1 } : {}}
              transition={{ delay: 1.4, duration: 0.8 }}
            >
              <div className="flex items-center justify-between text-sm">
                <div className="text-center">
                  <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold mb-2">
                    1
                  </div>
                  <span className="text-gray-600 dark:text-gray-400">
                    Write
                  </span>
                </div>
                <div className="h-px bg-gray-300 dark:bg-gray-600 flex-1 mx-4" />
                <div className="text-center">
                  <div className="w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center font-bold mb-2">
                    2
                  </div>
                  <span className="text-gray-600 dark:text-gray-400">
                    Collaborate
                  </span>
                </div>
                <div className="h-px bg-gray-300 dark:bg-gray-600 flex-1 mx-4" />
                <div className="text-center">
                  <div className="w-8 h-8 bg-purple-600 text-white rounded-full flex items-center justify-center font-bold mb-2">
                    3
                  </div>
                  <span className="text-gray-600 dark:text-gray-400">
                    Publish
                  </span>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};

export default CollaborativeInk;
