import type { MetadataRoute } from "next";
import { wedding } from "@/data/wedding";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${wedding.couple.display} — Wedding Invitation`,
    short_name: wedding.couple.display,
    description: wedding.seo.description,
    start_url: "/",
    display: "standalone",
    background_color: "#120507",
    theme_color: "#120507",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }],
  };
}
