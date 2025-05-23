'use client';

import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';
import { Search, Bookmark, Share2, TrendingUp, Zap, Globe } from 'lucide-react';

const DigitalPrintroom = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(containerRef, { once: true, amount: 0.3 });

  const features = [
    {
      icon: Search,
      title: 'Smart Discovery',
      description:
        'Find content that matters to you through intelligent recommendations and search.',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50 dark:bg-blue-900/20',
    },
    {
      icon: Bookmark,
      title: 'Save & Organize',
      description:
        'Bookmark articles and organize them into collections for easy access.',
      color: 'text-green-600',
      bgColor: 'bg-green-50 dark:bg-green-900/20',
    },
    {
      icon: TrendingUp,
      title: 'Analytics Dashboard',
      description:
        'Track your readership and understand what resonates with your audience.',
      color: 'text-purple-600',
      bgColor: 'bg-purple-50 dark:bg-purple-900/20',
    },
    {
      icon: Share2,
      title: 'Cross-Platform Sharing',
      description: 'Share your content across all platforms with one click.',
      color: 'text-red-600',
      bgColor: 'bg-red-50 dark:bg-red-900/20',
    },
    {
      icon: Zap,
      title: 'Real-time Collaboration',
      description:
        'Work together in real-time with live editing and instant feedback.',
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50 dark:bg-yellow-900/20',
    },
    {
      icon: Globe,
      title: 'Global Reach',
      description:
        'Publish to a worldwide audience with built-in internationalization.',
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50 dark:bg-indigo-900/20',
    },
  ];

  return (
    <section
      ref={containerRef}
      className="py-24 bg-gray-50 dark:bg-gray-900 relative overflow-hidden"
    >
      {/* Newspaper grid background */}
      <div className="absolute inset-0 opacity-5">
        <div
          className="h-full w-full"
          style={{
            backgroundImage: `linear-gradient(rgba(0,0,0,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.1) 1px, transparent 1px)`,
            backgroundSize: '30px 30px',
          }}
        />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
        >
          <span className="bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 px-4 py-2 rounded-full text-sm font-semibold uppercase tracking-wide">
            Features
          </span>
          <h2 className="text-4xl md:text-5xl font-bold font-serif text-black dark:text-white mt-6 mb-4">
            Digital{' '}
            <span className="text-green-600 dark:text-green-400">Newsroom</span>
          </h2>
          <div className="w-24 h-1 bg-black dark:bg-white mx-auto mb-6" />
          <p className="text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
            Everything you need to create, collaborate, and publish in the
            modern age.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              className={`p-8 rounded-xl ${feature.bgColor} border border-gray-200 dark:border-gray-700 hover:shadow-xl transition-all duration-300`}
              initial={{ opacity: 0, y: 30, rotateX: -10 }}
              animate={isInView ? { opacity: 1, y: 0, rotateX: 0 } : {}}
              transition={{ delay: index * 0.1, duration: 0.6 }}
              whileHover={{
                scale: 1.05,
                rotateY: 5,
                transition: { duration: 0.3 },
              }}
            >
              <div
                className={`w-16 h-16 ${feature.bgColor} rounded-lg flex items-center justify-center mb-6 border`}
              >
                <feature.icon className={`w-8 h-8 ${feature.color}`} />
              </div>

              <h3 className="text-xl font-bold text-black dark:text-white mb-3">
                {feature.title}
              </h3>

              <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                {feature.description}
              </p>

              {/* Fake content preview */}
              <div className="mt-6 space-y-2">
                <div className="h-2 bg-gray-300 dark:bg-gray-600 rounded w-full" />
                <div className="h-2 bg-gray-300 dark:bg-gray-600 rounded w-3/4" />
                <div className="h-2 bg-gray-300 dark:bg-gray-600 rounded w-1/2" />
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default DigitalPrintroom;
