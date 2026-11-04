import { oklchToHex } from "./color";
import { optimizeBrand } from "./optimize";
import type { BrandColor } from "./types";

export type PalettePreset = {
  id: string;
  name: string;
  description: string;
  group: "popular" | "contemporary" | "classic" | "light" | "vibrant" | "monochromatic" | "pastel" | "contrast";
  colors: string[];
};

function lightSeeds(hues: number[]): string[] {
  return hues.map((hue) => oklchToHex(0.82, 0.08, hue));
}

function pastelSeeds(hues: number[]): string[] {
  return hues.map((hue) => oklchToHex(0.86, 0.12, hue));
}

function vividSeeds(shift: number): string[] {
  return [12, 200, 130, 280, 45].map((hue, index) =>
    oklchToHex(index % 2 === 0 ? 0.62 : 0.28, index % 2 === 0 ? 0.19 : 0.12, (hue + shift) % 360),
  );
}

function monoSeeds(hue: number): string[] {
  return [0.24, 0.36, 0.46, 0.55].map((lightness) => oklchToHex(lightness, 0.12, hue));
}

function contrastSeeds(shift: number): string[] {
  return [210, 30, 150, 90, 330].map((hue, index) =>
    oklchToHex(index % 2 === 0 ? 0.3 : 0.58, index % 2 === 0 ? 0.1 : 0.17, (hue + shift) % 360),
  );
}

export function presetBias(group: PalettePreset["group"]): "standard" | "light" | "steps" {
  if (group === "light" || group === "pastel") return "light";
  if (group === "monochromatic") return "steps";
  return "standard";
}

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
  {
    id: "linen",
    name: "Linen",
    description: "Clay, olive, sage, and periwinkle, kept as light as AA allows.",
    group: "light",
    seeds: lightSeeds([40, 95, 155, 215, 285]),
  },
  {
    id: "porcelain",
    name: "Porcelain",
    description: "Rose, teal, blue, and straw, kept as light as AA allows.",
    group: "light",
    seeds: lightSeeds([25, 200, 255, 325, 75]),
  },
  {
    id: "petal",
    name: "Petal",
    description: "Coral, rose, leaf, and apricot, kept as light as AA allows.",
    group: "light",
    seeds: lightSeeds([12, 345, 145, 265, 55]),
  },
  {
    id: "coast",
    name: "Coast",
    description: "Lagoon, wheat, blue, and shell, kept as light as AA allows.",
    group: "light",
    seeds: lightSeeds([190, 155, 70, 235, 28]),
  },
  {
    id: "meadow",
    name: "Meadow",
    description: "Grass, wheat, and cornflower, kept as light as AA allows.",
    group: "light",
    seeds: lightSeeds([125, 95, 58, 225, 168]),
  },
  {
    id: "dawn",
    name: "Dawn",
    description: "Apricot, pink, teal, and violet, kept as light as AA allows.",
    group: "light",
    seeds: lightSeeds([42, 18, 335, 195, 275]),
  },
  {
    id: "sheer",
    name: "Sheer",
    description: "Sky, aqua, orchid, and sand, kept as light as AA allows.",
    group: "light",
    seeds: lightSeeds([230, 175, 205, 305, 85]),
  },
  {
    id: "cirrus",
    name: "Cirrus",
    description: "Slate, sage, clay, and lilac, kept as light as AA allows.",
    group: "light",
    seeds: lightSeeds([248, 160, 38, 312, 188]),
  },
  {
    id: "flare",
    name: "Flare",
    description: "Saturated red, teal, and gold with dark intervals.",
    group: "vibrant",
    seeds: vividSeeds(0),
  },
  {
    id: "carnival",
    name: "Carnival",
    description: "Hot hues spaced so each neighbor clears UI contrast.",
    group: "vibrant",
    seeds: vividSeeds(18),
  },
  {
    id: "marquee",
    name: "Marquee",
    description: "Poster red, violet, and leaf with deep rests.",
    group: "vibrant",
    seeds: vividSeeds(36),
  },
  {
    id: "arcade",
    name: "Arcade",
    description: "Bright steps against near-black of the next hue.",
    group: "vibrant",
    seeds: vividSeeds(54),
  },
  {
    id: "fiesta",
    name: "Fiesta",
    description: "Orange, magenta, and lime held apart in lightness.",
    group: "vibrant",
    seeds: vividSeeds(72),
  },
  {
    id: "spotlight",
    name: "Spotlight",
    description: "Stage color with a dark color between each bright one.",
    group: "vibrant",
    seeds: vividSeeds(96),
  },
  {
    id: "neon-ink",
    name: "Neon ink",
    description: "High-chroma hues that still take white text.",
    group: "vibrant",
    seeds: vividSeeds(120),
  },
  {
    id: "electric",
    name: "Electric",
    description: "Blue, chartreuse, and rose with dark separators.",
    group: "vibrant",
    seeds: vividSeeds(150),
  },
  {
    id: "indigo-wash",
    name: "Indigo wash",
    description: "Four indigo steps, each able to hold white text.",
    group: "monochromatic",
    seeds: monoSeeds(258),
  },
  {
    id: "marine",
    name: "Marine",
    description: "One blue, from deep water to a lighter step.",
    group: "monochromatic",
    seeds: monoSeeds(230),
  },
  {
    id: "moss",
    name: "Moss",
    description: "One green, stepped only in lightness.",
    group: "monochromatic",
    seeds: monoSeeds(145),
  },
  {
    id: "brick",
    name: "Brick",
    description: "One red-brown, dark through mid.",
    group: "monochromatic",
    seeds: monoSeeds(28),
  },
  {
    id: "wine",
    name: "Wine",
    description: "One crimson, kept in a single hue.",
    group: "monochromatic",
    seeds: monoSeeds(15),
  },
  {
    id: "violet-steps",
    name: "Violet steps",
    description: "One violet, four depths.",
    group: "monochromatic",
    seeds: monoSeeds(300),
  },
  {
    id: "olive-steps",
    name: "Olive steps",
    description: "One olive, dark to the lightest step that still takes white.",
    group: "monochromatic",
    seeds: monoSeeds(105),
  },
  {
    id: "lagoon-steps",
    name: "Lagoon steps",
    description: "One teal, stepped in lightness only.",
    group: "monochromatic",
    seeds: monoSeeds(190),
  },
  {
    id: "sorbet",
    name: "Sorbet",
    description: "Peach, mint, and lilac, as light as white text allows.",
    group: "pastel",
    seeds: pastelSeeds([25, 155, 200, 300, 70]),
  },
  {
    id: "macaron",
    name: "Macaron",
    description: "Rose, pistachio, and lemon, kept light enough to pass AA.",
    group: "pastel",
    seeds: pastelSeeds([350, 140, 85, 250, 20]),
  },
  {
    id: "powder",
    name: "Powder",
    description: "Sky, blush, and sage at the lightest passing step.",
    group: "pastel",
    seeds: pastelSeeds([230, 10, 130, 280, 50]),
  },
  {
    id: "confetti",
    name: "Confetti",
    description: "Soft primary hues, lightened until white text still passes.",
    group: "pastel",
    seeds: pastelSeeds([210, 110, 330, 160, 40]),
  },
  {
    id: "pearl",
    name: "Pearl",
    description: "Cool pastels held at the AA edge for white text.",
    group: "pastel",
    seeds: pastelSeeds([200, 260, 170, 310, 60]),
  },
  {
    id: "nectar",
    name: "Nectar",
    description: "Apricot, berry, and leaf, no darker than AA needs.",
    group: "pastel",
    seeds: pastelSeeds([45, 345, 125, 220, 290]),
  },
  {
    id: "lilac-mist",
    name: "Lilac mist",
    description: "Violet, rose, and aqua pastels.",
    group: "pastel",
    seeds: pastelSeeds([285, 340, 185, 95, 240]),
  },
  {
    id: "buttercream",
    name: "Buttercream",
    description: "Warm pastels: cream, coral, and pale green.",
    group: "pastel",
    seeds: pastelSeeds([75, 30, 150, 5, 200]),
  },
  {
    id: "beacon",
    name: "Beacon",
    description: "Light and dark alternate so every neighbor clears 3:1.",
    group: "contrast",
    seeds: contrastSeeds(0),
  },
  {
    id: "stamp",
    name: "Stamp",
    description: "A light color, then a dark one, through five hues.",
    group: "contrast",
    seeds: contrastSeeds(24),
  },
  {
    id: "poster",
    name: "Poster",
    description: "High lightness jumps between neighboring colors.",
    group: "contrast",
    seeds: contrastSeeds(48),
  },
  {
    id: "signal-flag",
    name: "Signal flag",
    description: "Dark, light, dark, so adjacent colors separate.",
    group: "contrast",
    seeds: contrastSeeds(72),
  },
  {
    id: "block",
    name: "Block",
    description: "Broad light and dark blocks across the wheel.",
    group: "contrast",
    seeds: contrastSeeds(100),
  },
  {
    id: "billboard",
    name: "Billboard",
    description: "Each color is far in lightness from the next.",
    group: "contrast",
    seeds: contrastSeeds(130),
  },
  {
    id: "hazard",
    name: "Hazard",
    description: "Warning-bright colors set against deep ones.",
    group: "contrast",
    seeds: contrastSeeds(160),
  },
  {
    id: "keyline",
    name: "Keyline",
    description: "Alternating depth so the pairs read at a glance.",
    group: "contrast",
    seeds: contrastSeeds(200),
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
  colors: optimizeBrand(asBrand(seed.seeds), null, presetBias(seed.group)).colors.map((color) => color.hex),
}));

export const POPULAR_PRESETS = PRESETS.filter((preset) => preset.group === "popular");
export const CONTEMPORARY_PRESETS = PRESETS.filter(
  (preset) => preset.group === "contemporary",
);
export const CLASSIC_PRESETS = PRESETS.filter((preset) => preset.group === "classic");
export const LIGHT_PRESETS = PRESETS.filter((preset) => preset.group === "light");
export const VIBRANT_PRESETS = PRESETS.filter((preset) => preset.group === "vibrant");
export const MONOCHROMATIC_PRESETS = PRESETS.filter((preset) => preset.group === "monochromatic");
export const PASTEL_PRESETS = PRESETS.filter((preset) => preset.group === "pastel");
export const CONTRAST_PRESETS = PRESETS.filter((preset) => preset.group === "contrast");
