import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Affiliate Hub", short_name: "Affiliate Hub", lang: "pt-BR",
    description: "Compare preços e acompanhe seus alertas.",
    start_url: "/conta", scope: "/", display: "standalone",
    background_color: "#ffffff", theme_color: "#ffffff",
    icons: [{ src: "/push-icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }],
  };
}
