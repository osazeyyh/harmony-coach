import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Tone.js is a browser-only ESM package — keep it out of the server bundle entirely
  serverExternalPackages: ["tone"],
};

export default nextConfig;
