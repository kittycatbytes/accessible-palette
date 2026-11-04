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

function darkenUntilButton(hex: string): { hex: string; steps: number } {
  let current = hex;
  let steps = 0;
  while (!passesAsLightButton(current) && steps < 40) {
    const oklch = readOklch(current);
    if (oklch.l <= 0.15) break;
    const next = oklchToHex(Math.max(0.14, oklch.l - 0.03), oklch.c, oklch.h);
    if (next === current) break;
    current = next;
    steps += 1;
  }
  return { hex: current, steps };
}

export function optimizeBrand(
  colors: BrandColor[],
  lockedIndex: number | null,
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
    const adjusted = darkenUntilButton(color.hex);
    if (adjusted.hex !== color.hex) {
      color.hex = adjusted.hex;
      if (passesAsLightButton(color.hex)) {
        notes.push(
          `${color.name} was darkened so white text and the button edge meet WCAG AA on white.`,
        );
      }
    }
    if (!passesAsLightButton(color.hex)) {
      notes.push(`${color.name} still does not meet AA as a button on white.`);
    }
  });

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

  for (let index = 0; index < next.length - 1; index += 1) {
    const ratio = contrastRatio(next[index].hex, next[index + 1].hex);
    if (ratio >= 3) continue;
    notes.push(
      `${next[index].name} and ${next[index + 1].name} stay under 3:1 (${ratio.toFixed(2)}:1). Chart previews use a pattern and a label so color is not the only difference.`,
    );
  }

  for (let index = 0; index < next.length; index += 1) {
    for (let other = index + 1; other < next.length; other += 1) {
      if (next[index].hex !== next[other].hex || locked.has(other)) continue;
      const oklch = readOklch(next[other].hex);
      next[other].hex = darkenUntilButton(
        oklchToHex(oklch.l, oklch.c, oklch.h + 28),
      ).hex;
      notes.push(
        `${next[other].name} moved in hue so it is not a duplicate of ${next[index].name}. WCAG contrast does not see hue, only lightness.`,
      );
    }
  }

  return { colors: next, notes };
}
