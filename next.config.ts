import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  experimental: {
    optimizePackageImports: ["@chakra-ui/react"],
  },
  // Add transpilePackages to handle external dependencies
  transpilePackages: ["@chakra-ui/react", "@chakra-ui/next-js"],
  // Disable server components for now to debug the issue
  reactStrictMode: true,
};

export default nextConfig;
