'use client';

import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import {
  ArrowRight,
  Newspaper,
  Twitter,
  Github,
  Mail,
  MapPin,
  Send,
} from 'lucide-react';

const NewsstandFooter = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(containerRef, { once: true, amount: 0.2 });

  const footerLinks = {
    product: [
      { label: 'Features', href: '#' },
      { label: 'Pricing', href: '#' },
      { label: 'Templates', href: '#' },
      { label: 'Integrations', href: '#' },
    ],
    company: [
      { label: 'About', href: '#' },
      { label: 'Blog', href: '#' },
      { label: 'Careers', href: '#' },
      { label: 'Press', href: '#' },
    ],
    resources: [
      { label: 'Documentation', href: '#' },
      { label: 'Help Center', href: '#' },
      { label: 'Community', href: '#' },
      { label: 'Status', href: '#' },
    ],
    legal: [
      { label: 'Privacy', href: '#' },
      { label: 'Terms', href: '#' },
      { label: 'Security', href: '#' },
      { label: 'Cookies', href: '#' },
    ],
  };

  return (
    <footer
      ref={containerRef}
      className="relative bg-black dark:bg-gray-950 text-white overflow-hidden"
    >
      {/* Newspaper texture overlay */}
      <div className="absolute inset-0 opacity-5">
        <div
          className="h-full w-full"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='60' height='60' viewBox='0 0 60 60'%3E%3Cg fill-opacity='0.1'%3E%3Cpath d='M0 0h60v60H0z' fill='%23fff'/%3E%3Cpath d='M0 15h60M0 30h60M0 45h60' stroke='%23ccc' stroke-width='0.5'/%3E%3C/g%3E%3C/svg%3E")`,
            backgroundSize: '60px 60px',
          }}
        />
      </div>

      {/* Main CTA Section */}
      <motion.section
        className="relative py-20 border-b border-gray-800"
        initial={{ opacity: 0 }}
        animate={isInView ? { opacity: 1 } : {}}
        transition={{ duration: 0.8 }}
      >
        <div className="container mx-auto px-4 text-center">
          <motion.div
            className="max-w-4xl mx-auto space-y-8"
            initial={{ y: 50, opacity: 0 }}
            animate={isInView ? { y: 0, opacity: 1 } : {}}
            transition={{ delay: 0.2, duration: 0.8 }}
          >
            {/* Headlines */}
            <div className="space-y-6">
              <motion.h2
                className="text-5xl md:text-6xl font-bold font-serif leading-tight"
                initial={{ scale: 0.9 }}
                animate={isInView ? { scale: 1 } : {}}
                transition={{ delay: 0.4, duration: 0.6 }}
              >
                Ready to Start Your <span className="text-red-500">Story</span>?
              </motion.h2>

              <motion.p
                className="text-xl text-gray-300 max-w-2xl mx-auto"
                initial={{ opacity: 0 }}
                animate={isInView ? { opacity: 1 } : {}}
                transition={{ delay: 0.6, duration: 0.8 }}
              >
                Join thousands of writers and readers building the future of
                digital publishing.
              </motion.p>
            </div>

            {/* CTAs */}
            <motion.div
              className="flex flex-col sm:flex-row gap-4 justify-center items-center"
              initial={{ y: 30, opacity: 0 }}
              animate={isInView ? { y: 0, opacity: 1 } : {}}
              transition={{ delay: 0.8, duration: 0.6 }}
            >
              <Link href="/sign-up">
                <Button
                  size="lg"
                  className="bg-red-600 hover:bg-red-700 text-white px-8 py-4 text-lg font-semibold shadow-xl transform hover:scale-105 transition-all duration-200"
                >
                  <Newspaper className="mr-2 h-5 w-5" />
                  Start Writing Today
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>

              <Link href="/discover">
                <Button
                  variant="outline"
                  size="lg"
                  className="border-2 border-white text-white px-8 py-4 text-lg font-semibold hover:bg-white hover:text-black transition-all duration-200"
                >
                  Explore Content
                </Button>
              </Link>
            </motion.div>

            {/* Social proof */}
            <motion.div
              className="pt-8 border-t border-gray-800"
              initial={{ opacity: 0 }}
              animate={isInView ? { opacity: 1 } : {}}
              transition={{ delay: 1, duration: 0.8 }}
            >
              <p className="text-gray-400 text-sm mb-4">
                Trusted by creators worldwide
              </p>
              <div className="flex justify-center items-center space-x-8 opacity-60">
                {[...Array(5)].map((_, i) => (
                  <div
                    key={i}
                    className="w-16 h-8 bg-gray-700 rounded flex items-center justify-center"
                  >
                    <span className="text-xs font-mono">LOGO</span>
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        </div>
      </motion.section>

      {/* Footer Links */}
      <motion.section
        className="py-16"
        initial={{ opacity: 0 }}
        animate={isInView ? { opacity: 1 } : {}}
        transition={{ delay: 0.4, duration: 0.8 }}
      >
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-2 lg:grid-cols-6 gap-8">
            {/* Brand column */}
            <motion.div
              className="lg:col-span-2 space-y-6"
              initial={{ x: -30, opacity: 0 }}
              animate={isInView ? { x: 0, opacity: 1 } : {}}
              transition={{ delay: 0.6, duration: 0.6 }}
            >
              <div>
                <h3 className="text-3xl font-bold font-serif mb-2">Lnked.</h3>
                <p className="text-gray-400 leading-relaxed">
                  The future of collaborative content creation and
                  community-driven publishing.
                </p>
              </div>

              {/* Newsletter signup */}
              <div className="space-y-3">
                <h4 className="font-semibold">Stay Updated</h4>
                <div className="flex">
                  <input
                    type="email"
                    placeholder="Your email"
                    className="flex-1 px-4 py-2 bg-gray-800 border border-gray-700 rounded-l-lg focus:outline-none focus:border-red-500"
                  />
                  <Button
                    className="bg-red-600 hover:bg-red-700 rounded-l-none"
                    size="sm"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Social links */}
              <div className="flex space-x-4">
                {[
                  { icon: Twitter, href: '#' },
                  { icon: Github, href: '#' },
                  { icon: Mail, href: '#' },
                ].map((social, index) => (
                  <motion.a
                    key={index}
                    href={social.href}
                    className="w-10 h-10 bg-gray-800 rounded-lg flex items-center justify-center hover:bg-red-600 transition-colors duration-200"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <social.icon className="h-5 w-5" />
                  </motion.a>
                ))}
              </div>
            </motion.div>

            {/* Link columns */}
            {Object.entries(footerLinks).map(([category, links], index) => (
              <motion.div
                key={category}
                className="space-y-4"
                initial={{ y: 20, opacity: 0 }}
                animate={isInView ? { y: 0, opacity: 1 } : {}}
                transition={{ delay: 0.8 + index * 0.1, duration: 0.6 }}
              >
                <h4 className="font-semibold text-white uppercase tracking-wide text-sm">
                  {category}
                </h4>
                <ul className="space-y-2">
                  {links.map((link, linkIndex) => (
                    <motion.li
                      key={link.label}
                      initial={{ x: -10, opacity: 0 }}
                      animate={isInView ? { x: 0, opacity: 1 } : {}}
                      transition={{
                        delay: 1 + index * 0.1 + linkIndex * 0.05,
                        duration: 0.4,
                      }}
                    >
                      <Link
                        href={link.href}
                        className="text-gray-400 hover:text-white transition-colors duration-200 text-sm"
                      >
                        {link.label}
                      </Link>
                    </motion.li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.section>

      {/* Bottom bar */}
      <motion.section
        className="py-6 border-t border-gray-800"
        initial={{ opacity: 0 }}
        animate={isInView ? { opacity: 1 } : {}}
        transition={{ delay: 1.2, duration: 0.8 }}
      >
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <div className="flex items-center space-x-4 text-sm text-gray-400">
              <span>© 2024 Lnked. All rights reserved.</span>
              <div className="flex items-center space-x-1">
                <MapPin className="h-4 w-4" />
                <span>Built with ❤️ globally</span>
              </div>
            </div>

            <div className="flex items-center space-x-4 text-sm text-gray-400">
              <span>Version 1.0.0</span>
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span>All systems operational</span>
            </div>
          </div>
        </div>
      </motion.section>

      {/* Decorative elements */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-red-600 via-blue-600 via-green-600 to-purple-600"></div>
    </footer>
  );
};

export default NewsstandFooter;
