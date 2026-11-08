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
  // Dev server only: hosts besides localhost that may load /_next/* resources. Phones and other
  // computers open it by the local-network IP, which changes between Wi-Fi networks and hotspots.
  allowedDevOrigins: ["backend", "*.local", "192.168.*.*", "10.*.*.*", "172.*.*.*"],
};

export default withNextIntl(nextConfig);
