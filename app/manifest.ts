import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Capibusca", short_name: "Capibusca", lang: "pt-BR",
    description: "Compare preços e acompanhe seus alertas.",
    start_url: "/conta", scope: "/", display: "standalone",
    background_color: "#fafbf9", theme_color: "#16a66a",
    icons: [{ src: "/capi/face-wink.png", sizes: "192x192", type: "image/png", purpose: "any" }, { src: "/push-icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }],
  };
}
