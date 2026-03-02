
// import type { NextConfig } from "next";

// const nextConfig: NextConfig = {
//   reactStrictMode: false,

//   images: {
//     remotePatterns: [
//       {
//         protocol: "https",
//         hostname: "tatefasarxw-bucket999.s3.amazonaws.com",
//       },
//     ],
//   },
// };

// export default nextConfig;





import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

const nextConfig: NextConfig = {
  reactStrictMode: false,
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