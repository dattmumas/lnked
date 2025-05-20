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
