import type { NextConfig } from "next";

const nextConfig: NextConfig = {
 /* config options here */
  // Suppress TypeScript errors during build
  typescript: {
    ignoreBuildErrors: true,
  },
  
  // Suppress ESLint errors during build
  eslint: {
    ignoreDuringBuilds: true,
  },
  
  // Suppress experimental warnings
  onDemandEntries: {
    maxInactiveAge: 25 * 1000,
    pagesBufferLength: 2,
  },};

export default nextConfig;
