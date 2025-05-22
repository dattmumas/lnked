import type { NextConfig } from "next";

/** @type {import('next').NextConfig} */
const nextConfig: NextConfig = {
  // From audit: transpile the Lexical packages
  transpilePackages: [
    "lexical",
    "@lexical/react",
    "@lexical/rich-text",
    "@lexical/code",
    "@lexical/list",
    "@lexical/link",
    "@lexical/table",
    "@lexical/markdown",
  ],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
    ],
  },
  async redirects() {
    return [
      {
        source:
          '/:slug((?!dashboard|sign-in|sign-up|discover|invite|posts|settings|search|api|collectives|_next).*?)',
        destination: '/collectives/:slug',
        permanent: true,
      },
      {
        source:
          '/:slug((?!dashboard|sign-in|sign-up|discover|invite|posts|settings|search|api|collectives|_next).*?)/:path*',
        destination: '/collectives/:slug/:path*',
        permanent: true,
      },
      { source: "/collectives/:slug/:id", destination: "/posts/:id", permanent: true },
    ];
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
