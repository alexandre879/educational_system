import type { MetadataRoute } from "next";

// Lets browsers install the site like an app, with the same icon and colors as the mobile app.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Blueapp",
    short_name: "Blueapp",
    start_url: "/",
    display: "standalone",
    background_color: "#090b10",
    theme_color: "#1677ff",
    icons: [
      { src: "/icon.png", sizes: "512x512", type: "image/png" },
      { src: "/apple-icon.png", sizes: "180x180", type: "image/png" },
    ],
  };
}
