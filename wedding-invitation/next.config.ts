import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // three.js ships ESM that benefits from being transpiled/tree-shaken by Next
  transpilePackages: ["three"],
  // this app lives in a sub-folder of a larger repo; keep file tracing scoped to it
  outputFileTracingRoot: process.cwd(),
  headers: async () => [
    {
      source: "/:path*",
      headers: [
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      ],
    },
  ],
};

export default nextConfig;
