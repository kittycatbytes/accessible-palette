import { describe, expect, it } from "vitest";
import { contrastRatio, formatRatio, hsbFromField, hueFromStrip, normalizeHex, verdict } from "./color";
import { simulateCvd } from "./cvd";
import { aseBytes, buildExports } from "./export";
import { colorsFromHarmony, paletteFromHarmony } from "./harmony";
import { optimizeBrand, passesAsLightButton } from "./optimize";
import { PRESETS } from "./presets";
import { buildSnapshot, listPairs } from "./snapshot";
import type { BrandColor } from "./types";

function brand(hexes: string[]): BrandColor[] {
  return hexes.map((hex, index) => ({
    id: `c${index + 1}`,
    name: `Color ${index + 1}`,
    hex,
  }));
}

describe("contrast", () => {
  it("matches published black and white ratios", () => {
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 5);
    expect(contrastRatio("#ffffff", "#000000")).toBeCloseTo(21, 5);
    expect(contrastRatio("#ffffff", "#ffffff")).toBeCloseTo(1, 5);
  });

  it("does not round a near miss up to a pass", () => {
    const ratio = contrastRatio("#777777", "#ffffff");
    expect(ratio).toBeGreaterThan(4.4);
    expect(ratio).toBeLessThan(4.5);
    expect(verdict("#777777", "#ffffff").aaNormal).toBe(false);
    expect(Number.parseFloat(formatRatio(ratio))).toBeLessThan(4.5);
  });

  it("keeps a just-passing gray on the pass side of the badge", () => {
    const ratio = contrastRatio("#767676", "#ffffff");
    expect(ratio).toBeGreaterThan(4.5);
    expect(verdict("#767676", "#ffffff").aaNormal).toBe(true);
  });

  it("normalizes short hex", () => {
    expect(normalizeHex("#abc")).toBe("#aabbcc");
    expect(normalizeHex("zz")).toBeNull();
  });

  it("maps a hue-field point to the color at that point", () => {
    expect(hsbFromField(1, 0, 0)).toBe("#ff0000");
    expect(hsbFromField(1, 0, 120)).toBe("#00ff00");
    expect(hsbFromField(1, 0, 240)).toBe("#0000ff");
    expect(hsbFromField(0, 0, 200)).toBe("#ffffff");
    expect(hsbFromField(1, 1, 30)).toBe("#000000");
    expect(hsbFromField(0, 0.5, 10)).toBe("#808080");
    expect(hueFromStrip(0)).toBe(0);
    expect(hueFromStrip(1)).toBe(359);
  });
});

describe("palettes", () => {
  it("builds the requested count from each harmony", () => {
    for (const harmony of [
      "complementary",
      "analogous",
      "triadic",
      "monochromatic",
      "split-complementary",
      "tetradic",
    ] as const) {
      expect(colorsFromHarmony("#3366cc", harmony, 4)).toHaveLength(4);
    }
  });

  it("keeps the selected color when a harmony is applied", () => {
    const colors = ["#111111", "#222222", "#eeeeee", "#333333", "#444444"];
    const next = paletteFromHarmony(colors, 2, "triadic");
    const generated = colorsFromHarmony("#eeeeee", "triadic", 5);
    expect(next[2]).toBe("#eeeeee");
    expect(next[3]).toBe(generated[1]);
    expect(next[4]).toBe(generated[2]);
    expect(next[0]).toBe(generated[3]);
    expect(next[1]).toBe(generated[4]);
  });

  it("leaves a locked color in place", () => {
    const colors = brand(["#f6e27a", "#2244aa", "#883311", "#114433"]);
    const result = optimizeBrand(colors, 0);
    expect(result.colors[0].hex).toBe("#f6e27a");
    expect(result.notes.some((note) => note.includes("Color 1"))).toBe(true);
    for (const color of result.colors.slice(1)) {
      expect(passesAsLightButton(color.hex)).toBe(true);
    }
  });

  it("ships presets that work as buttons on white", () => {
    expect(PRESETS.filter((preset) => preset.group === "popular")).toHaveLength(8);
    expect(PRESETS.filter((preset) => preset.group === "contemporary")).toHaveLength(8);
    expect(PRESETS.filter((preset) => preset.group === "classic")).toHaveLength(8);
    for (const preset of PRESETS) {
      expect(preset.colors.length).toBeGreaterThanOrEqual(3);
      expect(preset.colors.length).toBeLessThanOrEqual(5);
      expect(new Set(preset.colors).size).toBe(preset.colors.length);
      for (const hex of preset.colors) expect(passesAsLightButton(hex)).toBe(true);
    }
  });
});

describe("theme", () => {
  it("meets the required text and UI pairs in light and dark", () => {
    const optimized = optimizeBrand(
      brand(["#123a8c", "#0f6e56", "#8a3d12", "#241b4a"]),
      null,
    );
    const snapshot = buildSnapshot({
      brandColors: optimized.colors,
      autoOptimize: true,
      pickerMode: "wheel",
      harmony: "triadic",
      optimizeNotes: optimized.notes,
    });
    const pairs = listPairs(snapshot).filter((pair) => pair.required && !pair.exempt);
    const textAndUi = pairs.filter(
      (pair) => !pair.purpose.startsWith("Chart") && !pair.purpose.includes("beside"),
    );
    for (const pair of textAndUi) {
      const textPair =
        /^(Body text|Secondary text|Placeholder|Label |Link text|Text on|White label)/.test(
          pair.purpose,
        ) || pair.purpose.includes("as text");
      if (textPair) {
        expect(pair.aaNormal, `${pair.view} ${pair.purpose} ${pair.ratio}`).toBe(true);
      } else {
        expect(pair.nonText, `${pair.view} ${pair.purpose} ${pair.ratio}`).toBe(true);
      }
    }
  });
});

describe("exports", () => {
  const snapshot = buildSnapshot({
    brandColors: brand(["#0b3a5b", "#0f6e6a", "#8a4b22"]),
    autoOptimize: false,
    pickerMode: "hex",
    harmony: "analogous",
  });

  it("writes Tailwind, DTCG, and an ASE swatch file", () => {
    const files = buildExports(snapshot, "Harbor");
    const tailwind = files.find((file) => file.format === "tailwind");
    const dtcg = files.find((file) => file.format === "dtcg");
    const ase = files.find((file) => file.format === "ase");
    expect(tailwind?.body).toContain("@theme");
    expect(tailwind?.body).toContain("--color-primary:");
    const parsed = JSON.parse(dtcg?.body ?? "{}") as {
      color: { brand: { c1: { $type: string; $value: { hex: string; colorSpace: string } } } };
    };
    expect(parsed.color.brand.c1.$type).toBe("color");
    expect(parsed.color.brand.c1.$value.colorSpace).toBe("srgb");
    expect(parsed.color.brand.c1.$value.hex).toBe("#0b3a5b");
    const bytes = aseBytes("Harbor", snapshot.brandColors);
    expect(String.fromCharCode(...bytes.slice(0, 4))).toBe("ASEF");
    expect(ase?.body.length).toBeGreaterThan(20);
  });
});

describe("app chrome", () => {
  it("meets text and border contrast in light and dark", () => {
    const textPairs = [
      ["#14202b", "#f3f5f8"],
      ["#3a4756", "#f3f5f8"],
      ["#3a4756", "#ffffff"],
      ["#ffffff", "#0c3d66"],
      ["#08301c", "#d7f0e2"],
      ["#6d1c16", "#f8d5d0"],
      ["#f4f7fb", "#12171d"],
      ["#d5deea", "#12171d"],
      ["#d5deea", "#1b232d"],
      ["#082033", "#b7d4ee"],
      ["#d8f6e6", "#123528"],
      ["#ffe4df", "#4d211d"],
    ];
    for (const [foreground, background] of textPairs) {
      expect(contrastRatio(foreground, background), `${foreground} on ${background}`).toBeGreaterThanOrEqual(4.5);
    }
    for (const [foreground, background] of [
      ["#526274", "#f3f5f8"],
      ["#526274", "#ffffff"],
      ["#93a4b8", "#12171d"],
      ["#93a4b8", "#1b232d"],
      ["#ffffff", "#141a22"],
    ]) {
      expect(contrastRatio(foreground, background), `${foreground} on ${background}`).toBeGreaterThanOrEqual(3);
    }
  });
});

describe("color vision", () => {
  it("changes a saturated red under protan simulation", () => {
    expect(simulateCvd("#ff0000", "protan")).not.toBe("#ff0000");
  });
});
