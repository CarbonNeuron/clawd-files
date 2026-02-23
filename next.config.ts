import type { NextConfig } from "next";

// Suppress Turbopack Edge Runtime warnings for Node.js built-in modules (fs, path).
// These warnings are false positives: db.ts and storage.ts use Node.js APIs but only
// run server-side. Turbopack statically analyzes instrumentation.ts for the edge
// bundle and flags the imports even though they never execute in edge context.
// This is a known Turbopack issue with no official suppression mechanism.
// See: https://github.com/vercel/next.js/discussions/71983
const _origWrite = process.stderr.write.bind(process.stderr);
process.stderr.write = function (
  this: typeof process.stderr,
  ...args: Parameters<typeof process.stderr.write>
): boolean {
  const chunk = args[0];
  if (typeof chunk === "string" && chunk.includes("not supported in the Edge Runtime")) {
    return true;
  }
  return _origWrite(...args);
} as typeof process.stderr.write;

const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: ["better-sqlite3"],
};

export default nextConfig;
