import type { NextConfig } from 'next';

/** @type {import('next').NextConfig} */
const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
      },
      {
        protocol: 'https',
        hostname: process.env.NEXT_PUBLIC_SUPABASE_PROJECT_ID + '.supabase.co',
        pathname: '/storage/**',
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
    formats: ['image/webp', 'image/avif'],
    minimumCacheTTL: 31536000, // 1 year cache for optimized images
    dangerouslyAllowSVG: false,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
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
  experimental: {
    optimizePackageImports: [
      'lucide-react',
      '@radix-ui/react-avatar',
      '@radix-ui/react-dialog',
      '@radix-ui/react-dropdown-menu',
      '@radix-ui/react-label',
      '@radix-ui/react-radio-group',
      '@radix-ui/react-select',
      '@radix-ui/react-slot',
      '@radix-ui/react-switch',
      '@radix-ui/react-tabs',
      '@radix-ui/react-tooltip',
    ],
  },
  webpack: (config, { isServer }) => {
    // Exclude test files and scripts from build
    config.module.rules.push({
      test: /\.(ts|tsx)$/,
      include: [/scripts\//, /\.test\./, /\.spec\./, /__tests__/],
      use: 'ignore-loader',
    });

    // Configure webpack to handle dynamic imports better
    if (!isServer) {
      config.output = {
        ...config.output,
        // Use a simpler chunk filename pattern to avoid URI encoding issues
        chunkFilename: 'static/chunks/[name].[contenthash].js',
      };
    }

    // Let Next.js handle chunk splitting automatically to avoid MIME type conflicts
    return config;
  },
  eslint: {
    // Keep linting enabled but suppress arrow function warnings via eslint.config.mjs
    ignoreDuringBuilds: false,
  },
};

// Bundle analyzer configuration
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

export default withBundleAnalyzer(nextConfig);
