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
//   allowedDevOrigins: [
//     "http://backend:3000",
//     // "http://192.168.1.152:3000",
//   ],
// };

// export default nextConfig;




import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: false,

  basePath: "/front",

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