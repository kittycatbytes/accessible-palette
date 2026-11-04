import type { MetadataRoute } from "next";

const site = "https://accessible-palette-amber.vercel.app";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date("2026-11-04");
  return [
    { url: site, lastModified, changeFrequency: "weekly", priority: 1 },
    { url: `${site}/about`, lastModified, changeFrequency: "monthly", priority: 0.7 },
    { url: `${site}/projects`, lastModified, changeFrequency: "weekly", priority: 0.4 },
  ];
}
