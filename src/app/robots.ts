import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/setup"],
    },
    sitemap: "https://accessible-palette-amber.vercel.app/sitemap.xml",
  };
}
