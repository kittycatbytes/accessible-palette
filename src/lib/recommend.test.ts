import { describe, expect, it } from "vitest";
import { buildSnapshot, listPairs } from "./snapshot";
import { PRESETS } from "./presets";
import { recommendBrandBlocks } from "./recommend";
import type { BrandColor, ContrastPair } from "./types";

function harborPairs(): ContrastPair[] {
  const preset = PRESETS.find((item) => item.id === "harbor");
  if (!preset) throw new Error("missing harbor");
  const brandColors: BrandColor[] = preset.colors.map((hex, index) => ({
    id: `c${index + 1}`,
    name: `Color ${index + 1}`,
    hex,
  }));
  return listPairs(
    buildSnapshot({
      brandColors,
      autoOptimize: true,
      pickerMode: "cube",
      harmony: "analogous",
    }),
  );
}

describe("recommended brand blocks", () => {
  it("picks a short page-ready set with passing scores", () => {
    const pairs = harborPairs().filter((pair) => pair.view === "brand");
    const keys = recommendBrandBlocks(pairs);
    const chosen = keys.map((key) => {
      const [fgKey, bgKey] = key.split(":");
      const pair = pairs.find((item) => item.fgKey === fgKey && item.bgKey === bgKey);
      if (!pair) throw new Error(key);
      return pair;
    });

    expect(chosen.length).toBeGreaterThanOrEqual(4);
    expect(chosen.length).toBeLessThanOrEqual(8);
    expect(chosen.every((pair) => pair.nonText && pair.fgKey !== pair.bgKey)).toBe(true);
    expect(chosen.some((pair) => pair.fgKey === "white" && pair.bgKey.startsWith("c") && pair.aaNormal)).toBe(true);
    expect(chosen.some((pair) => pair.bgKey === "light-page" && pair.fgKey.startsWith("c") && pair.aaNormal)).toBe(true);
    expect(chosen.some((pair) => pair.bgKey === "dark-page" && pair.aaNormal)).toBe(true);

    const backgrounds = new Set(chosen.map((pair) => pair.bgKey));
    expect(backgrounds.size).toBeLessThanOrEqual(4);
    expect(chosen.map((pair) => `${pair.fgKey} on ${pair.bgKey}`)).toMatchInlineSnapshot(`
      [
        "c1 on light-page",
        "c5 on light-page",
        "white on c3",
        "c3 on light-page",
        "c2 on light-page",
        "white on dark-page",
        "white on c2",
        "c2 on dark-page",
      ]
    `);
  });
});
