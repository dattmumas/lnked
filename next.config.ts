import type { NextConfig } from 'next';

/** @type {import('next').NextConfig} */
const nextConfig: NextConfig = {
  // From audit: transpile the Lexical packages
  transpilePackages: [
    'lexical',
    '@lexical/react',
    '@lexical/rich-text',
    '@lexical/code',
    '@lexical/list',
    '@lexical/link',
    '@lexical/table',
    '@lexical/markdown',
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
      {
        protocol: 'https',
        hostname: 'image.mux.com',
      },
    ],
  },
  // Redirects - Consider removing these for better performance and simplicity
  // Most apps don't need vanity URLs and they add complexity + performance overhead
  async redirects() {
    return [];
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
  async rewrites() {
    if (process.env.NODE_ENV === 'development') {
      return [
        {
          source: '/mux-proxy/:path*',
          destination: 'https://stream.mux.com/:path*',
        },
      ];
    }
    return [];
  },
};

export default nextConfig;
