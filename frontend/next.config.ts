import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: false,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "tatefasarxw-bucket999.s3.amazonaws.com",
      },
    ],
  },
};

export default nextConfig;