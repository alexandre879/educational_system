import path from "path";
import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

const nextConfig: NextConfig = {
  reactStrictMode: false,
  // Pin the root so a stray lockfile in a parent directory isn't picked up.
  outputFileTracingRoot: path.join(__dirname),
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "tatefasarxw-bucket999.s3.amazonaws.com"
      }
    ],
  },
  allowedDevOrigins: ["http://backend:3000"],
};

export default withNextIntl(nextConfig);
