import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
