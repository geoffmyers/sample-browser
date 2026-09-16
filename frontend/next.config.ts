import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  env: {
    // Empty: the browser calls /api on the page's own origin, where a reverse
    // proxy or app/api/[...path]/route.ts forwards it to the backend. Set it at
    // build time only to call an API on another origin.
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL ?? "",
  },
};

export default nextConfig;
