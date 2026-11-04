import {
  contrastRatio,
  oklchToHex,
  readOklch,
} from "./color";
import type { BrandColor } from "./types";

export type OptimizeResult = {
  colors: BrandColor[];
  notes: string[];
};

/** A fill that can carry white text and still clears the page at AA. */
export function passesAsLightButton(hex: string): boolean {
  return contrastRatio(hex, "#ffffff") >= 4.5;
}

function darkenUntilButton(hex: string, step = 0.03): { hex: string; steps: number } {
  let current = hex;
  let steps = 0;
  while (!passesAsLightButton(current) && steps < 80) {
    const oklch = readOklch(current);
    if (oklch.l <= 0.15) break;
    const next = oklchToHex(Math.max(0.14, oklch.l - step), oklch.c, oklch.h);
    if (next === current) break;
    current = next;
    steps += 1;
  }
  return { hex: current, steps };
}

/** Lightest step of this hue and chroma that still passes as white text on a button. */
function lightestPassingButton(hex: string): string {
  const passing = darkenUntilButton(hex, 0.01).hex;
  let current = passing;
  for (let step = 0; step < 50; step += 1) {
    const oklch = readOklch(current);
    const next = oklchToHex(Math.min(0.92, oklch.l + 0.01), oklch.c, oklch.h);
    if (next === current || !passesAsLightButton(next)) break;
    current = next;
  }
  return current;
}

export function optimizeBrand(
  colors: BrandColor[],
  lockedIndex: number | null,
  bias: "standard" | "light" | "steps" = "standard",
): OptimizeResult {
  const next = colors.map((color) => ({ ...color }));
  const notes: string[] = [];
  const locked = new Set<number>();
  if (lockedIndex !== null) locked.add(lockedIndex);

  next.forEach((color, index) => {
    if (locked.has(index)) {
      if (!passesAsLightButton(color.hex)) {
        notes.push(
          `${color.name} stays as picked. It does not meet AA as white text on a button against white.`,
        );
      }
      return;
    }
    const adjusted = bias === "light" ? { hex: lightestPassingButton(color.hex), steps: 0 } : darkenUntilButton(color.hex);
    if (adjusted.hex !== color.hex) {
      color.hex = adjusted.hex;
      if (passesAsLightButton(color.hex) && bias !== "light") {
        notes.push(
          `${color.name} was darkened so white text and the button edge meet WCAG AA on white.`,
        );
      }
    }
    if (!passesAsLightButton(color.hex)) {
      notes.push(`${color.name} still does not meet AA as a button on white.`);
    }
  });

  if (bias === "standard") {
    for (let pass = 0; pass < 24; pass += 1) {
      let moved = false;
      for (let index = 0; index < next.length - 1; index += 1) {
        const left = next[index];
        const right = next[index + 1];
        if (contrastRatio(left.hex, right.hex) >= 3) continue;
        const leftL = readOklch(left.hex).l;
        const rightL = readOklch(right.hex).l;
        const darker = leftL <= rightL ? index : index + 1;
        const candidate = locked.has(darker) ? (darker === index ? index + 1 : index) : darker;
        if (locked.has(candidate)) continue;
        const oklch = readOklch(next[candidate].hex);
        if (oklch.l <= 0.15) continue;
        const updated = oklchToHex(Math.max(0.14, oklch.l - 0.02), oklch.c, oklch.h);
        if (!passesAsLightButton(updated) && passesAsLightButton(next[candidate].hex)) continue;
        if (updated === next[candidate].hex) continue;
        next[candidate].hex = updated;
        moved = true;
      }
      if (!moved) break;
    }
  }

  const closePairs = next.slice(0, -1).filter((color, index) => contrastRatio(color.hex, next[index + 1].hex) < 3);
  if (bias === "light" && closePairs.length > 0) {
    notes.push(
      "These colors stay as light as AA allows for white text on a button. Some neighbors sit under 3:1, so chart previews keep a pattern and a label.",
    );
  }
  if (bias === "steps" && closePairs.length > 0) {
    notes.push(
      "These colors stay in one hue. Some neighbors sit under 3:1, so chart previews keep a pattern and a label.",
    );
  }
  if (bias === "standard") {
    for (let index = 0; index < next.length - 1; index += 1) {
      const ratio = contrastRatio(next[index].hex, next[index + 1].hex);
      if (ratio >= 3) continue;
      notes.push(
        `${next[index].name} and ${next[index + 1].name} stay under 3:1 (${ratio.toFixed(2)}:1). Chart previews use a pattern and a label so color is not the only difference.`,
      );
    }
  }

  for (let index = 0; index < next.length; index += 1) {
    for (let other = index + 1; other < next.length; other += 1) {
      if (next[index].hex !== next[other].hex || locked.has(other)) continue;
      const oklch = readOklch(next[other].hex);
      const shifted = oklchToHex(oklch.l, oklch.c, oklch.h + 28);
      next[other].hex = bias === "light" ? lightestPassingButton(shifted) : darkenUntilButton(shifted).hex;
      notes.push(
        `${next[other].name} moved in hue so it is not a duplicate of ${next[index].name}. WCAG contrast does not see hue, only lightness.`,
      );
    }
  }

  return { colors: next, notes };
}
