'use client';

import { motion, useScroll, useTransform, useInView } from 'framer-motion';
import { useRef } from 'react';
import { Mail, Rss, FileText } from 'lucide-react';

const PrintFragmentation = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(containerRef, { once: true, amount: 0.3 });

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start end', 'end start'],
  });

  // Parallax for floating papers
  const y1 = useTransform(scrollYProgress, [0, 1], ['20%', '-20%']);
  const y2 = useTransform(scrollYProgress, [0, 1], ['-10%', '30%']);
  const y3 = useTransform(scrollYProgress, [0, 1], ['30%', '-10%']);

  const feeds = [
    {
      id: 1,
      title: 'Monday Marketing Memo',
      description: 'A 20-minute read buried in your inbox.',
      icon: Mail,
      color: 'bg-blue-100 border-blue-300',
      textColor: 'text-blue-800',
    },
    {
      id: 2,
      title: 'Thursday Tech Thoughts',
      description: 'Another tab, another context-switch.',
      icon: Rss,
      color: 'bg-green-100 border-green-300',
      textColor: 'text-green-800',
    },
    {
      id: 3,
      title: 'Weekend Wellness',
      description: 'Saved to read-later… and forgotten.',
      icon: FileText,
      color: 'bg-purple-100 border-purple-300',
      textColor: 'text-purple-800',
    },
  ];

  const sectionVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { duration: 0.8, staggerChildren: 0.3 },
    },
  };

  const paperVariants = {
    hidden: { opacity: 0, rotateX: -90, rotateY: 45, z: -200 },
    visible: {
      opacity: 1,
      rotateX: [0, 5, 0],
      rotateY: [0, -3, 0],
      z: 0,
      transition: {
        duration: 1.2,
        type: 'tween',
        ease: 'easeInOut',
        repeat: Infinity,
        repeatType: 'reverse' as const,
        repeatDelay: 3,
      },
    },
  };

  return (
    <section
      ref={containerRef}
      className="relative py-24 bg-gray-50 dark:bg-gray-950 overflow-hidden"
    >
      {/* Subtle background elements */}
      <div className="absolute inset-0 pointer-events-none opacity-5">
        {[
          { left: 10, top: 20 },
          { left: 85, top: 70 },
          { left: 60, top: 10 },
        ].map((pos, i) => (
          <motion.div
            key={i}
            className="absolute w-40 h-52 bg-black dark:bg-white border border-gray-300 dark:border-gray-700"
            style={{
              left: `${pos.left}%`,
              top: `${pos.top}%`,
            }}
            initial={{ opacity: 0, rotate: -5 + i * 3 }}
            animate={{ opacity: 0.05, rotate: -3 + i * 2 }}
            transition={{ duration: 2, delay: i * 0.3 }}
          />
        ))}
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <motion.div
          className="grid lg:grid-cols-2 gap-16 items-center"
          variants={sectionVariants}
          initial="hidden"
          animate={isInView ? 'visible' : 'hidden'}
        >
          {/* Content Column */}
          <motion.div
            className="space-y-8 order-2 lg:order-1"
            variants={{
              hidden: { opacity: 0, x: -50 },
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
                  The Problem
                </span>
              </motion.div>

              <h2 className="text-5xl md:text-6xl font-bold font-serif text-black dark:text-white leading-tight">
                Fragmented{' '}
                <span className="border-b-4 border-red-600">Information</span>
              </h2>

              <div className="w-32 h-px bg-black dark:bg-white mt-4" />
            </div>

            <div className="space-y-6 text-xl text-gray-800 dark:text-gray-200 leading-relaxed font-light">
              <p>
                Content arrives in isolation—different emails, tabs and apps.
                Keeping up feels like{' '}
                <span className="font-medium text-black dark:text-white">
                  whiplash
                </span>
                .
              </p>
              <p>
                Your attention is{' '}
                <span className="italic font-medium">scattered</span> across a
                dozen sources, each demanding immediate focus while context
                disappears into the void.
              </p>
              <p className="text-black dark:text-white font-medium border-l-4 border-red-600 pl-4">
                Lnked weaves these voices together so you can follow ideas, not
                inboxes.
              </p>
            </div>

            {/* Stats */}
            <motion.div
              className="grid grid-cols-2 gap-6 pt-8 border-t border-gray-200 dark:border-gray-700"
              initial={{ opacity: 0, y: 30 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: 0.8, duration: 0.6 }}
            >
              <div className="text-center">
                <div className="text-3xl font-bold text-red-600">12+</div>
                <div className="text-sm text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                  Average Sources
                </div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600">73%</div>
                <div className="text-sm text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                  Context Lost
                </div>
              </div>
            </motion.div>
          </motion.div>

          {/* Feed Examples */}
          <motion.div
            className="space-y-8 order-1 lg:order-2"
            variants={{
              hidden: { opacity: 0, x: 50 },
              visible: {
                opacity: 1,
                x: 0,
                transition: { duration: 0.8, ease: 'easeOut' },
              },
            }}
          >
            {feeds.map((feed, index) => (
              <motion.div
                key={feed.id}
                className="bg-white dark:bg-black border-2 border-black dark:border-white p-6"
                initial={{ opacity: 0, y: 30 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ delay: 0.3 + index * 0.2, duration: 0.6 }}
              >
                <div className="flex items-start justify-between mb-4">
                  <feed.icon className="w-6 h-6 text-black dark:text-white" />
                  <div className="text-xs font-mono uppercase tracking-wider text-gray-500">
                    Source {index + 1}
                  </div>
                </div>

                <h3 className="text-lg font-bold text-black dark:text-white leading-tight mb-2">
                  {feed.title}
                </h3>

                <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
                  {feed.description}
                </p>

                {/* Text lines */}
                <div className="space-y-2 mt-4">
                  {[85, 92, 78].map((width, i) => (
                    <div
                      key={i}
                      className="h-px bg-gray-300 dark:bg-gray-700"
                      style={{ width: `${width}%` }}
                    />
                  ))}
                </div>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};

export default PrintFragmentation;
