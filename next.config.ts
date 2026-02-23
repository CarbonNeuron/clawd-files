import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: ["better-sqlite3", "busboy"],
  experimental: {
    proxyClientMaxBodySize: 500 * 1024 * 1024, // 500 MB
  },
};

export default nextConfig;
