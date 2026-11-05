import { clampChroma, converter, formatHex } from "culori";

const toOklch = converter("oklch");
const toRgb = converter("rgb");
const toHsl = converter("hsl");
const toHsv = converter("hsv");
const toLab = converter("lab");

export type Rgb = { r: number; g: number; b: number };

const THRESHOLDS = [3, 4.5, 7];

export function normalizeHex(input: string): string | null {
  const raw = input.trim().replace(/^#/, "");
  if (/^[0-9a-fA-F]{3}$/.test(raw)) {
    return `#${raw
      .split("")
      .map((character) => character + character)
      .join("")
      .toLowerCase()}`;
  }
  if (/^[0-9a-fA-F]{6}$/.test(raw)) return `#${raw.toLowerCase()}`;
  return null;
}

export function hexToRgb(hex: string): Rgb | null {
  const normal = normalizeHex(hex);
  if (!normal) return null;
  return {
    r: Number.parseInt(normal.slice(1, 3), 16),
    g: Number.parseInt(normal.slice(3, 5), 16),
    b: Number.parseInt(normal.slice(5, 7), 16),
  };
}

export function rgbToHex(rgb: Rgb): string {
  const channel = (value: number) =>
    Math.round(Math.min(255, Math.max(0, value)))
      .toString(16)
      .padStart(2, "0");
  return `#${channel(rgb.r)}${channel(rgb.g)}${channel(rgb.b)}`;
}

function linearChannel(value: number): number {
  const srgb = value / 255;
  return srgb <= 0.04045 ? srgb / 12.92 : ((srgb + 0.055) / 1.055) ** 2.4;
}

export function relativeLuminance(hex: string): number {
  const rgb = hexToRgb(hex);
  if (!rgb) return 0;
  return (
    0.2126 * linearChannel(rgb.r) +
    0.7152 * linearChannel(rgb.g) +
    0.0722 * linearChannel(rgb.b)
  );
}

/** WCAG 2.x contrast ratio. Pass/fail must use this value, not a rounded display. */
export function contrastRatio(foreground: string, background: string): number {
  const first = relativeLuminance(foreground);
  const second = relativeLuminance(background);
  const lighter = Math.max(first, second);
  const darker = Math.min(first, second);
  return (lighter + 0.05) / (darker + 0.05);
}

export type Verdict = {
  ratio: number;
  aaNormal: boolean;
  aaLarge: boolean;
  aaaNormal: boolean;
  aaaLarge: boolean;
  nonText: boolean;
};

export function verdict(foreground: string, background: string): Verdict {
  const ratio = contrastRatio(foreground, background);
  return {
    ratio,
    aaNormal: ratio >= 4.5,
    aaLarge: ratio >= 3,
    aaaNormal: ratio >= 7,
    aaaLarge: ratio >= 4.5,
    nonText: ratio >= 3,
  };
}

export function formatRatio(ratio: number): string {
  if (!Number.isFinite(ratio)) return "—";
  const rounded = Math.round(ratio * 100) / 100;
  const crossesThreshold = THRESHOLDS.some(
    (threshold) => (ratio >= threshold) !== (rounded >= threshold),
  );
  return ratio.toFixed(crossesThreshold ? 3 : 2);
}

export function pairWord(result: Verdict): string {
  if (!result.nonText) return "Fail";
  if (result.aaaNormal) return "AAA";
  if (result.aaNormal) return "AA";
  return "Large/UI";
}

export function bestText(fill: string): "#000000" | "#ffffff" {
  return contrastRatio("#000000", fill) >= contrastRatio("#ffffff", fill)
    ? "#000000"
    : "#ffffff";
}

export function oklchToHex(l: number, c: number, h: number): string {
  const clamped = clampChroma(
    {
      mode: "oklch",
      l: clamp(l, 0, 1),
      c: Math.max(0, c),
      h: Number.isFinite(h) ? ((h % 360) + 360) % 360 : 0,
    },
    "oklch",
  );
  return formatHex(clamped)?.toLowerCase() ?? "#000000";
}

export function readOklch(hex: string): { l: number; c: number; h: number } {
  const color = toOklch(normalizeHex(hex) ?? "#000000");
  return {
    l: color?.l ?? 0,
    c: color?.c ?? 0,
    h: color?.h ?? 0,
  };
}

export function readHsl(hex: string): { h: number; s: number; l: number } {
  const color = toHsl(normalizeHex(hex) ?? "#000000");
  return {
    h: Math.round(color?.h ?? 0),
    s: Math.round((color?.s ?? 0) * 100),
    l: Math.round((color?.l ?? 0) * 100),
  };
}

export function readHsb(hex: string): { h: number; s: number; b: number } {
  const color = toHsv(normalizeHex(hex) ?? "#000000");
  return {
    h: Math.round(color?.h ?? 0),
    s: Math.round((color?.s ?? 0) * 100),
    b: Math.round((color?.v ?? 0) * 100),
  };
}

/** Saturation runs left to right. Brightness runs bottom to top. The hex is the color at that point. */
export function hsbFromField(x: number, y: number, hue: number): string {
  const saturation = Math.round(clamp(x, 0, 1) * 100);
  const brightness = Math.round((1 - clamp(y, 0, 1)) * 100);
  return hsbToHex(hue, saturation, brightness);
}

/** Hue 0 is the top of the strip and 359 is the bottom. */
export function hueFromStrip(y: number): number {
  return Math.round(clamp(y, 0, 1) * 359);
}

export function hslToHex(h: number, s: number, l: number): string {
  const color = toRgb({
    mode: "hsl",
    h: clamp(h, 0, 360) % 360,
    s: clamp(s, 0, 100) / 100,
    l: clamp(l, 0, 100) / 100,
  });
  if (!color) return "#000000";
  return rgbToHex({
    r: (color.r ?? 0) * 255,
    g: (color.g ?? 0) * 255,
    b: (color.b ?? 0) * 255,
  });
}

export function hsbToHex(h: number, s: number, b: number): string {
  const color = toRgb({
    mode: "hsv",
    h: clamp(h, 0, 360),
    s: clamp(s, 0, 100) / 100,
    v: clamp(b, 0, 100) / 100,
  });
  if (!color) return "#000000";
  return rgbToHex({
    r: (color.r ?? 0) * 255,
    g: (color.g ?? 0) * 255,
    b: (color.b ?? 0) * 255,
  });
}

export function readLab(hex: string): { l: number; a: number; b: number } {
  const color = toLab(normalizeHex(hex) ?? "#000000");
  return {
    l: Math.round(color?.l ?? 0),
    a: Math.round(color?.a ?? 0),
    b: Math.round(color?.b ?? 0),
  };
}

export function labToHex(l: number, a: number, b: number): string {
  const clamped = clampChroma(
    { mode: "lab", l: clamp(l, 0, 100), a, b },
    "lch",
  );
  return formatHex(clamped)?.toLowerCase() ?? "#000000";
}

export function readCmyk(hex: string): { c: number; m: number; y: number; k: number } {
  const rgb = hexToRgb(hex) ?? { r: 0, g: 0, b: 0 };
  const r = rgb.r / 255;
  const g = rgb.g / 255;
  const b = rgb.b / 255;
  const k = 1 - Math.max(r, g, b);
  if (k >= 0.999) return { c: 0, m: 0, y: 0, k: 100 };
  return {
    c: Math.round(((1 - r - k) / (1 - k)) * 100),
    m: Math.round(((1 - g - k) / (1 - k)) * 100),
    y: Math.round(((1 - b - k) / (1 - k)) * 100),
    k: Math.round(k * 100),
  };
}

export function cmykToHex(c: number, m: number, y: number, k: number): string {
  const black = clamp(k, 0, 100) / 100;
  const scale = 1 - black;
  return rgbToHex({
    r: 255 * (1 - clamp(c, 0, 100) / 100) * scale,
    g: 255 * (1 - clamp(m, 0, 100) / 100) * scale,
    b: 255 * (1 - clamp(y, 0, 100) / 100) * scale,
  });
}

export function hueName(hex: string): string {
  const { c, h } = readOklch(hex);
  if (c < 0.02) return "gray";
  const hue = (h + 360) % 360;
  if (hue < 15 || hue >= 345) return "red";
  if (hue < 40) return "orange";
  if (hue < 65) return "yellow";
  if (hue < 160) return "green";
  if (hue < 200) return "cyan";
  if (hue < 255) return "blue";
  if (hue < 290) return "purple";
  if (hue < 345) return "magenta";
  return "red";
}

export function colorLabel(hex: string): string {
  const { l } = readOklch(hex);
  const tone = l < 0.25 ? "dark" : l < 0.45 ? "deep" : l < 0.7 ? "mid" : "light";
  return `${tone} ${hueName(hex)}`;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function srgbComponents(hex: string): [number, number, number] {
  const rgb = hexToRgb(hex) ?? { r: 0, g: 0, b: 0 };
  const round = (channel: number) => Math.round((channel / 255) * 1e6) / 1e6;
  return [round(rgb.r), round(rgb.g), round(rgb.b)];
}
