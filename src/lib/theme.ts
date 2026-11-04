import {
  bestText,
  contrastRatio,
  oklchToHex,
  readOklch,
} from "./color";
import type { BrandColor, Ramp, RequiredPair, TokenMap } from "./types";

export type ThemeMode = {
  tokens: TokenMap;
  ramps: Ramp[];
  notes: string[];
};

const THEME_CHECKS: { fg: string; bg: string; purpose: string }[] = [
  { fg: "foreground", bg: "background", purpose: "Body text on the page" },
  { fg: "muted", bg: "background", purpose: "Secondary text on the page" },
  { fg: "placeholder", bg: "background", purpose: "Placeholder text in a field" },
  { fg: "foreground", bg: "surface", purpose: "Body text on a surface" },
  { fg: "border", bg: "background", purpose: "Border against the page" },
  { fg: "primaryForeground", bg: "primary", purpose: "Label on the primary button" },
  { fg: "primary", bg: "background", purpose: "Primary button against the page" },
  {
    fg: "primaryHoverForeground",
    bg: "primaryHover",
    purpose: "Label on the primary button hover state",
  },
  { fg: "secondaryForeground", bg: "secondary", purpose: "Label on the secondary button" },
  { fg: "secondary", bg: "background", purpose: "Secondary button against the page" },
  { fg: "accentForeground", bg: "accent", purpose: "Label on the accent button" },
  { fg: "link", bg: "background", purpose: "Link text on the page" },
  { fg: "link", bg: "foreground", purpose: "Link against surrounding text" },
  { fg: "focus", bg: "background", purpose: "Focus ring against the page" },
  { fg: "focus", bg: "primary", purpose: "Focus ring against the primary button" },
  { fg: "successForeground", bg: "success", purpose: "Text on a success message" },
  { fg: "success", bg: "background", purpose: "Success message against the page" },
  { fg: "warningForeground", bg: "warning", purpose: "Text on a warning message" },
  { fg: "warning", bg: "background", purpose: "Warning message against the page" },
  { fg: "dangerForeground", bg: "danger", purpose: "Text on an error message" },
  { fg: "danger", bg: "background", purpose: "Error message against the page" },
];

function searchLightness(
  hue: number,
  chroma: number,
  from: number,
  to: number,
  step: number,
  accept: (hex: string) => boolean,
): string {
  let last = oklchToHex(from, chroma, hue);
  const direction = Math.sign(to - from) || 1;
  const increment = Math.abs(step) * direction;
  for (
    let lightness = from;
    direction > 0 ? lightness <= to + 0.0001 : lightness >= to - 0.0001;
    lightness += increment
  ) {
    last = oklchToHex(lightness, chroma, hue);
    if (accept(last)) return last;
  }
  return last;
}

function buttonFill(
  source: string,
  page: string,
  mode: "light" | "dark",
): { hex: string; adjusted: boolean } {
  const text = bestText(source);
  if (contrastRatio(text, source) >= 4.5 && contrastRatio(source, page) >= 3) {
    return { hex: source, adjusted: false };
  }
  const origin = readOklch(source);
  if (mode === "light") {
    for (let lightness = origin.l; lightness >= 0.14; lightness -= 0.02) {
      const hex = oklchToHex(lightness, origin.c, origin.h);
      const label = bestText(hex);
      if (contrastRatio(label, hex) >= 4.5 && contrastRatio(hex, page) >= 3) {
        return { hex, adjusted: hex !== source };
      }
    }
  } else {
    for (let lightness = Math.max(origin.l, 0.45); lightness <= 0.9; lightness += 0.02) {
      const hex = oklchToHex(lightness, Math.min(origin.c, 0.14), origin.h);
      const label = bestText(hex);
      if (contrastRatio(label, hex) >= 4.5 && contrastRatio(hex, page) >= 3) {
        return { hex, adjusted: true };
      }
    }
  }
  return { hex: source, adjusted: false };
}

function hoverFill(fill: string, page: string, mode: "light" | "dark"): string {
  const origin = readOklch(fill);
  const direction = mode === "light" ? -1 : 1;
  for (let step = 1; step <= 12; step += 1) {
    const lightness = Math.min(0.92, Math.max(0.12, origin.l + direction * 0.025 * step));
    const hex = oklchToHex(lightness, origin.c, origin.h);
    const label = bestText(hex);
    if (
      hex !== fill &&
      contrastRatio(label, hex) >= 4.5 &&
      contrastRatio(hex, page) >= 3
    ) {
      return hex;
    }
  }
  return fill;
}

function findFocus(page: string, primary: string, accent: string): string {
  if (contrastRatio(accent, page) >= 3 && contrastRatio(accent, primary) >= 3) {
    return accent;
  }
  const origin = readOklch(accent);
  for (let lightness = 0.2; lightness <= 0.86; lightness += 0.02) {
    const hex = oklchToHex(lightness, Math.max(origin.c, 0.06), origin.h);
    if (contrastRatio(hex, page) >= 3 && contrastRatio(hex, primary) >= 3) return hex;
  }
  const ink = "#072033";
  const paper = "#f8fafc";
  if (contrastRatio(ink, page) >= 3 && contrastRatio(ink, primary) >= 3) return ink;
  return paper;
}

function findLink(page: string, text: string, candidates: string[]): string {
  for (const candidate of candidates) {
    if (contrastRatio(candidate, page) >= 4.5 && contrastRatio(candidate, text) >= 3) {
      return candidate;
    }
  }
  const hue = readOklch(candidates[0] ?? "#2255aa").h;
  for (let lightness = 0.18; lightness <= 0.82; lightness += 0.02) {
    const hex = oklchToHex(lightness, 0.13, hue);
    if (contrastRatio(hex, page) >= 4.5 && contrastRatio(hex, text) >= 3) return hex;
  }
  return candidates[0] ?? text;
}

function statusFill(hue: number, page: string, mode: "light" | "dark"): {
  fill: string;
  text: string;
} {
  const levels =
    mode === "light"
      ? Array.from({ length: 16 }, (_, index) => 0.48 - index * 0.02)
      : Array.from({ length: 16 }, (_, index) => 0.55 + index * 0.02);
  for (const lightness of levels) {
    const hex = oklchToHex(lightness, mode === "light" ? 0.13 : 0.11, hue);
    const text = bestText(hex);
    if (contrastRatio(text, hex) >= 4.5 && contrastRatio(hex, page) >= 3) {
      return { fill: hex, text };
    }
  }
  const fill = oklchToHex(mode === "light" ? 0.32 : 0.78, 0.1, hue);
  return { fill, text: bestText(fill) };
}

export function rampFor(color: BrandColor, neutral = false): Ramp {
  const oklch = readOklch(color.hex);
  const levels = [0.93, 0.8, 0.62, 0.4, 0.26];
  const steps = [100, 300, 500, 700, 900];
  return {
    id: neutral ? "neutral" : color.id,
    name: neutral ? "Neutral" : color.name,
    stops: steps.map((step, index) => ({
      step,
      hex:
        !neutral && index === 2
          ? color.hex
          : oklchToHex(levels[index], neutral ? 0.012 : oklch.c, oklch.h),
    })),
  };
}

function buildMode(colors: BrandColor[], mode: "light" | "dark"): ThemeMode {
  const hue = readOklch(colors[0]?.hex ?? "#0d3b66").h;
  const notes: string[] = [];
  const background =
    mode === "light" ? oklchToHex(0.97, 0.008, hue) : oklchToHex(0.18, 0.015, hue);
  const surface =
    mode === "light" ? oklchToHex(0.985, 0.005, hue) : oklchToHex(0.22, 0.016, hue);
  const raised = mode === "light" ? "#ffffff" : oklchToHex(0.27, 0.018, hue);
  const foreground =
    mode === "light"
      ? searchLightness(hue, 0.02, 0.12, 0.42, 0.02, (hex) => contrastRatio(hex, background) >= 7)
      : searchLightness(hue, 0.015, 0.97, 0.72, 0.02, (hex) => contrastRatio(hex, background) >= 7);

  let muted = foreground;
  if (mode === "light") {
    const start = readOklch(foreground).l;
    for (let lightness = start; lightness <= 0.7; lightness += 0.01) {
      const hex = oklchToHex(lightness, 0.015, hue);
      if (contrastRatio(hex, background) < 4.5) break;
      muted = hex;
    }
  } else {
    const start = readOklch(foreground).l;
    for (let lightness = start; lightness >= 0.45; lightness -= 0.01) {
      const hex = oklchToHex(lightness, 0.012, hue);
      if (contrastRatio(hex, background) < 4.5) break;
      muted = hex;
    }
  }

  const border =
    mode === "light"
      ? searchLightness(hue, 0.012, 0.9, 0.25, 0.01, (hex) => contrastRatio(hex, background) >= 3)
      : searchLightness(hue, 0.012, 0.3, 0.8, 0.01, (hex) => contrastRatio(hex, background) >= 3);

  const roles = ["primary", "secondary", "accent", "chart4", "chart5"] as const;
  const fills = colors.map((color, index) => {
    const result = buttonFill(color.hex, background, mode);
    if (result.adjusted) {
      notes.push(
        `${mode === "light" ? "Light" : "Dark"} theme ${roles[index] ?? "extra"} uses a ${mode === "light" ? "darker" : "lighter"} step of ${color.name} so the control meets contrast.`,
      );
    }
    return result.hex;
  });
  while (fills.length < 3) fills.push(fills[0] ?? "#0d3b66");

  const primary = fills[0];
  const secondary = fills[1];
  const accent = fills[2];
  const primaryForeground = bestText(primary);
  const primaryHover = hoverFill(primary, background, mode);
  const secondaryForeground = bestText(secondary);
  const accentForeground = bestText(accent);
  const focus = findFocus(background, primary, accent);
  const link = findLink(background, foreground, [accent, primary, secondary]);
  const success = statusFill(150, background, mode);
  const warning = statusFill(75, background, mode);
  const danger = statusFill(28, background, mode);
  const disabled = mode === "light" ? oklchToHex(0.8, 0.01, hue) : oklchToHex(0.34, 0.012, hue);
  const disabledForeground =
    mode === "light" ? oklchToHex(0.58, 0.01, hue) : oklchToHex(0.72, 0.01, hue);

  const tokens: TokenMap = {
    background,
    surface,
    raised,
    foreground,
    muted,
    placeholder: muted,
    border,
    primary,
    primaryForeground,
    primaryHover,
    primaryHoverForeground: bestText(primaryHover),
    secondary,
    secondaryForeground,
    accent,
    accentForeground,
    link,
    focus,
    success: success.fill,
    successForeground: success.text,
    warning: warning.fill,
    warningForeground: warning.text,
    danger: danger.fill,
    dangerForeground: danger.text,
    disabled,
    disabledForeground,
  };

  fills.forEach((hex, index) => {
    tokens[`chart${index + 1}`] = hex;
  });

  const ramps = [
    ...colors.map((color) => rampFor(color)),
    rampFor(colors[0] ?? { id: "neutral", name: "Neutral", hex: background }, true),
  ];

  notes.push(
    "Placeholder text uses the secondary text color. WCAG holds placeholder text to the same contrast as other text.",
  );
  notes.push(
    "Disabled controls are shown and marked exempt. WCAG does not require a contrast ratio for disabled text.",
  );

  return { tokens, ramps, notes };
}

export function requiredPairsFor(
  view: "theme-light" | "theme-dark",
  colors: BrandColor[],
): RequiredPair[] {
  const pairs: RequiredPair[] = THEME_CHECKS.map((check) => ({
    view,
    fgKey: check.fg,
    bgKey: check.bg,
    purpose: check.purpose,
    exempt: false,
  }));
  for (let index = 0; index < colors.length - 1; index += 1) {
    pairs.push({
      view,
      fgKey: `chart${index + 1}`,
      bgKey: `chart${index + 2}`,
      purpose: `Chart ${colors[index].name} beside ${colors[index + 1].name}. A pattern and label are included because contrast between hues can stay under 3:1.`,
      exempt: false,
    });
  }
  pairs.push({
    view,
    fgKey: "disabledForeground",
    bgKey: "disabled",
    purpose: "Disabled control. Exempt from the contrast requirement.",
    exempt: true,
  });
  return pairs;
}

export function brandRequirements(colors: BrandColor[]): RequiredPair[] {
  const pairs: RequiredPair[] = [];
  for (const color of colors) {
    pairs.push({
      view: "brand",
      fgKey: "white",
      bgKey: color.id,
      purpose: `White label on ${color.name}`,
      exempt: false,
    });
    pairs.push({
      view: "brand",
      fgKey: color.id,
      bgKey: "white",
      purpose: `${color.name} as text or as a control on white`,
      exempt: false,
    });
  }
  for (let index = 0; index < colors.length - 1; index += 1) {
    pairs.push({
      view: "brand",
      fgKey: colors[index].id,
      bgKey: colors[index + 1].id,
      purpose: `${colors[index].name} beside ${colors[index + 1].name}`,
      exempt: false,
    });
  }
  return pairs;
}

export function deriveThemes(colors: BrandColor[]): {
  light: ThemeMode;
  dark: ThemeMode;
  notes: string[];
} {
  const light = buildMode(colors, "light");
  const dark = buildMode(colors, "dark");
  return {
    light,
    dark,
    notes: [...light.notes, ...dark.notes],
  };
}

export const CURATED_TOKEN_KEYS = [
  "background",
  "surface",
  "foreground",
  "muted",
  "primary",
  "secondary",
  "accent",
  "link",
  "border",
  "focus",
  "success",
  "warning",
  "danger",
] as const;
