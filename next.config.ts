import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["e2b"],
  turbopack: {
    root: ".",
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.googleusercontent.com",
      },
    ],
  },
};

export default nextConfig;
