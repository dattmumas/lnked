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
  /* config options here */
};

export default nextConfig;
