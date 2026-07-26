import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Include Prisma artifacts in the deployment
  outputFileTracingIncludes: {
    "/api/*": ["prisma/**/*", "node_modules/.prisma/**/*"],
  },
};

export default nextConfig;
