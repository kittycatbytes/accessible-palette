import { normalizeHex } from "./color";
import { MAX_COLORS, MIN_COLORS, type BrandColor, type Harmony, type PickerMode } from "./types";

const HARMONIES = new Set<Harmony>([
  "complementary",
  "analogous",
  "triadic",
  "monochromatic",
  "split-complementary",
  "tetradic",
]);

const PICKERS = new Set<PickerMode>(["cube", "wheel", "hsb", "rgb", "lab", "cmyk", "hex"]);

export type PaletteInput = {
  paletteId?: string;
  paletteName: string;
  versionName: string;
  brandColors: BrandColor[];
  autoOptimize: boolean;
  pickerMode: PickerMode;
  harmony: Harmony;
};

function text(value: unknown, fallback: string, max = 80): string {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim().slice(0, max);
  return trimmed || fallback;
}

export function parsePaletteInput(body: unknown): PaletteInput | { error: string } {
  if (!body || typeof body !== "object") return { error: "Missing palette." };
  const record = body as Record<string, unknown>;
  if (!Array.isArray(record.brandColors)) return { error: "Add between 3 and 5 colors." };
  if (record.brandColors.length < MIN_COLORS || record.brandColors.length > MAX_COLORS) {
    return { error: "A palette needs 3, 4, or 5 colors." };
  }
  const brandColors: BrandColor[] = [];
  for (const [index, entry] of record.brandColors.entries()) {
    if (!entry || typeof entry !== "object") return { error: "A color is missing." };
    const color = entry as Record<string, unknown>;
    const hex = typeof color.hex === "string" ? normalizeHex(color.hex) : null;
    if (!hex) return { error: "Each color needs a 6-digit hex value." };
    brandColors.push({
      id: `c${index + 1}`,
      name: text(color.name, `Color ${index + 1}`, 40),
      hex,
    });
  }
  const harmony = HARMONIES.has(record.harmony as Harmony)
    ? (record.harmony as Harmony)
    : "analogous";
  const pickerMode = PICKERS.has(record.pickerMode as PickerMode)
    ? (record.pickerMode as PickerMode)
    : "wheel";
  const paletteId =
    typeof record.paletteId === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      record.paletteId,
    )
      ? record.paletteId
      : undefined;
  return {
    paletteId,
    paletteName: text(record.paletteName, "Untitled palette"),
    versionName: text(record.versionName, "Version"),
    brandColors,
    autoOptimize: Boolean(record.autoOptimize),
    pickerMode,
    harmony,
  };
}
