import { optimizeBrand } from "./optimize";
import type { BrandColor } from "./types";

export type PalettePreset = {
  id: string;
  name: string;
  description: string;
  group: "popular" | "contemporary" | "classic";
  colors: string[];
};

type Seed = Omit<PalettePreset, "colors"> & { seeds: string[] };

const SEEDS: Seed[] = [
  {
    id: "harbor",
    name: "Harbor",
    description: "Navy, tide, and rust for product UI.",
    group: "popular",
    seeds: ["#0b3a5b", "#0f6e6a", "#8a4b22", "#1c2430", "#3e5870"],
  },
  {
    id: "ledger",
    name: "Ledger",
    description: "Forest, ink, and brass.",
    group: "popular",
    seeds: ["#145c3a", "#1f3a5f", "#8a5a12", "#243028", "#4e6248"],
  },
  {
    id: "signal",
    name: "Signal",
    description: "Blue, violet, and clay.",
    group: "popular",
    seeds: ["#123a8c", "#5a2d82", "#9a3412", "#1b2433", "#3f5f8a"],
  },
  {
    id: "archive",
    name: "Archive",
    description: "Burgundy, olive, and warm ink.",
    group: "popular",
    seeds: ["#6e2430", "#3f4a22", "#6b4a2a", "#241c1a", "#5c5346"],
  },
  {
    id: "civic",
    name: "Civic",
    description: "Municipal blue, brick, and pine.",
    group: "popular",
    seeds: ["#0e3a68", "#8c2f2f", "#1e3d36", "#243044", "#5a4632"],
  },
  {
    id: "studio",
    name: "Studio",
    description: "Near-black, a blue accent, and umber.",
    group: "popular",
    seeds: ["#161616", "#0e4d6c", "#6b3a1f", "#2c333a", "#4a5560"],
  },
  {
    id: "market",
    name: "Market",
    description: "Pine, terracotta, and ink.",
    group: "popular",
    seeds: ["#1b4d3e", "#8c3e1e", "#243028", "#5a3a22", "#3e5a48"],
  },
  {
    id: "north",
    name: "North",
    description: "Fjord blue, spruce, and copper.",
    group: "popular",
    seeds: ["#16324f", "#0e5c6b", "#8a6230", "#1a2330", "#3d5a73"],
  },
  {
    id: "ion",
    name: "Ion",
    description: "High-chroma blue, orchid, and teal.",
    group: "contemporary",
    seeds: ["#123cff", "#c026d3", "#0f766e", "#1e1b4b", "#7c3aed"],
  },
  {
    id: "dune",
    name: "Dune",
    description: "Clay, lagoon, and amber.",
    group: "contemporary",
    seeds: ["#c2410c", "#0f766e", "#854d0e", "#1c1917", "#b45309"],
  },
  {
    id: "prism",
    name: "Prism",
    description: "Cobalt, crimson, and emerald.",
    group: "contemporary",
    seeds: ["#1d4ed8", "#be185d", "#047857", "#312e81", "#0e7490"],
  },
  {
    id: "orchard",
    name: "Orchard",
    description: "Berry, leaf, and bark.",
    group: "contemporary",
    seeds: ["#9d174d", "#4d7c0f", "#7c2d12", "#3f6212", "#1e3a8a"],
  },
  {
    id: "glass",
    name: "Glass",
    description: "Sky, teal, and indigo on ink.",
    group: "contemporary",
    seeds: ["#0369a1", "#0f766e", "#4338ca", "#155e75", "#1e293b"],
  },
  {
    id: "citrus",
    name: "Citrus ink",
    description: "Olive, burnt orange, and deep teal.",
    group: "contemporary",
    seeds: ["#3f6212", "#9a3412", "#115e59", "#365314", "#7c2d12"],
  },
  {
    id: "orchid",
    name: "Orchid",
    description: "Violet, berry, and teal.",
    group: "contemporary",
    seeds: ["#6d28d9", "#9d174d", "#0f766e", "#4c1d95", "#1e1b4b"],
  },
  {
    id: "copper",
    name: "Copper circuit",
    description: "Copper, blueprint blue, and olive.",
    group: "contemporary",
    seeds: ["#9a3412", "#1d4e89", "#3f6212", "#7c2d12", "#134e4a"],
  },
  {
    id: "bauhaus",
    name: "Bauhaus",
    description: "Red, blue, and yellow with black.",
    group: "classic",
    seeds: ["#9f1d1d", "#1d4e89", "#8a6a12", "#161616", "#3f3a34"],
  },
  {
    id: "delft",
    name: "Delft",
    description: "China blue, ink, and sand.",
    group: "classic",
    seeds: ["#1e4b8a", "#16324f", "#6b5a3e", "#2a3340", "#4e6a8a"],
  },
  {
    id: "deco",
    name: "Deco",
    description: "Black, gilt, and emerald.",
    group: "classic",
    seeds: ["#141414", "#8a6a22", "#0e5c45", "#6e2430", "#2c3338"],
  },
  {
    id: "venetian",
    name: "Venetian",
    description: "Terracotta, ultramarine, and gold.",
    group: "classic",
    seeds: ["#8c3a1e", "#1a3f8a", "#8a6230", "#3e2a22", "#1e4d5c"],
  },
  {
    id: "prussian",
    name: "Prussian",
    description: "Prussian blue, madder, and ochre.",
    group: "classic",
    seeds: ["#0e2f5a", "#8a2430", "#8a5a12", "#1c2833", "#1e4a3a"],
  },
  {
    id: "jasper",
    name: "Jasper",
    description: "Wedgwood blue, lilac, and sage.",
    group: "classic",
    seeds: ["#2a4e73", "#5a3d6b", "#3e5a45", "#243044", "#6a5344"],
  },
  {
    id: "gothic",
    name: "Gothic",
    description: "Burgundy, gilt, and forest.",
    group: "classic",
    seeds: ["#6e1e2c", "#8a6230", "#1e3d2a", "#2a2624", "#3e4654"],
  },
  {
    id: "plein",
    name: "Plein air",
    description: "Cobalt, viridian, and ochre.",
    group: "classic",
    seeds: ["#1a3f8c", "#0e5c4a", "#8a5a16", "#6e2438", "#3a2e24"],
  },
];

function asBrand(hexes: string[]): BrandColor[] {
  return hexes.map((hex, index) => ({
    id: `c${index + 1}`,
    name: `Color ${index + 1}`,
    hex,
  }));
}

export const PRESETS: PalettePreset[] = SEEDS.map((seed) => ({
  id: seed.id,
  name: seed.name,
  description: seed.description,
  group: seed.group,
  colors: optimizeBrand(asBrand(seed.seeds), null).colors.map((color) => color.hex),
}));

export const POPULAR_PRESETS = PRESETS.filter((preset) => preset.group === "popular");
export const CONTEMPORARY_PRESETS = PRESETS.filter(
  (preset) => preset.group === "contemporary",
);
export const CLASSIC_PRESETS = PRESETS.filter((preset) => preset.group === "classic");
