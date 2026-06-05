import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Skip TypeScript type-checking during `next build` — tsc is already run
  // locally and in CI before deploy, so this avoids a slow redundant check
  // on the VPS (which has limited CPU and was timing out the SSH action).
  typescript: {
    ignoreBuildErrors: true,
  },
  // Empty turbopack config silences the "webpack config present but no turbopack config" error
  // in Next.js 16 (which defaults to Turbopack). The webpack block below only activates
  // when WATCHPACK_POLLING=true (Docker on Windows dev), never in production.
  turbopack: {},
  webpack: (config) => {
    if (process.env.WATCHPACK_POLLING === "true") {
      config.watchOptions = {
        poll: 800,
        aggregateTimeout: 300,
        ignored: /node_modules/,
      };
    }
    return config;
  },
};

export default nextConfig;
