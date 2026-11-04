import { oklchToHex, readOklch } from "./color";
import { MAX_COLORS, MIN_COLORS, type Harmony } from "./types";

const OFFSETS: Record<Harmony, number[]> = {
  complementary: [0, 180],
  analogous: [0, 30, -30, 18, -18],
  triadic: [0, 120, 240],
  monochromatic: [0, 0, 0, 0, 0],
  "split-complementary": [0, 150, 210],
  tetradic: [0, 90, 180, 270],
};

const MONO_LIGHTNESS = [0.38, 0.28, 0.48, 0.22, 0.56];

export function colorsFromHarmony(
  seedHex: string,
  harmony: Harmony,
  count: number,
): string[] {
  const size = Math.min(MAX_COLORS, Math.max(MIN_COLORS, count));
  const seed = readOklch(seedHex);
  const offsets = OFFSETS[harmony];
  const colors: string[] = [];
  for (let index = 0; index < size; index += 1) {
    const offset = offsets[index % offsets.length];
    const cycle = Math.floor(index / offsets.length);
    const lightness =
      harmony === "monochromatic"
        ? MONO_LIGHTNESS[index]
        : Math.max(0.22, Math.min(0.62, seed.l - cycle * 0.12));
    colors.push(oklchToHex(lightness, Math.max(seed.c, 0.08), seed.h + offset));
  }
  return colors;
}

/** Rebuild a palette around one dot. That dot keeps its exact color. */
export function paletteFromHarmony(
  colors: string[],
  anchorIndex: number,
  harmony: Harmony,
): string[] {
  if (colors.length === 0) return [];
  const anchor = Math.min(colors.length - 1, Math.max(0, anchorIndex));
  const seed = colors[anchor];
  const generated = colorsFromHarmony(seed, harmony, colors.length);
  return colors.map((hex, index) => {
    const generatedIndex = (index - anchor + colors.length) % colors.length;
    return generatedIndex === 0 ? hex : generated[generatedIndex];
  });
}
