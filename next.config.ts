import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  async headers() {
    return [{ source: "/push-sw.js", headers: [
      { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
      { key: "Content-Type", value: "application/javascript; charset=utf-8" },
      { key: "Content-Security-Policy", value: "default-src 'self'; script-src 'self'" },
    ] }];
  },
};

export default nextConfig;
