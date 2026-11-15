import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep `next dev` artifacts separate so a production build cannot invalidate
  // the stylesheet manifest used by an already running development server.
  distDir: process.env.NODE_ENV === "development" ? ".next-dev" : ".next",
  serverExternalPackages: ["better-sqlite3"],
};

export default nextConfig;
