import type { NextConfig } from "next";

const backendUrl = process.env.BACKEND_URL;

const nextConfig: NextConfig = {
  async rewrites() {
    if (!backendUrl) return []; // local dev talks to localhost:4000 directly
    return [
      { source: "/api/:path*", destination: `${backendUrl}/api/:path*` },
      { source: "/admin/queues", destination: `${backendUrl}/admin/queues` },
      { source: "/admin/queues/:path*", destination: `${backendUrl}/admin/queues/:path*` },
    ];
  },
};

export default nextConfig;