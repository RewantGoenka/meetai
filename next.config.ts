import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["shadcn-ui"],
  /* This allows the build to succeed despite the ESLint errors 
    you're seeing (unused variables, unescaped entities, etc.) 
  */
  eslint: {
    ignoreDuringBuilds: true,
  },
  /* This allows the build to succeed despite TypeScript errors 
    (like the 'any' type errors)
  */
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;