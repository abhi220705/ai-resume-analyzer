import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    const backendUrl = process.env.BACKEND_URL;

    // Local development keeps using NEXT_PUBLIC_API_URL directly.
    if (!backendUrl) {
      return [];
    }

    return [
      {
        source: "/api/:path*",
        destination: `${backendUrl.replace(/\/$/, "")}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;