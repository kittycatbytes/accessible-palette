import { verdict } from "./color";
import { brandRequirements, deriveThemes, requiredPairsFor } from "./theme";
import type {
  BrandColor,
  ContrastPair,
  Harmony,
  PickerMode,
  RequiredPair,
  Snapshot,
  TokenMap,
} from "./types";

export function buildSnapshot(input: {
  brandColors: BrandColor[];
  autoOptimize: boolean;
  pickerMode: PickerMode;
  harmony: Harmony;
  optimizeNotes?: string[];
}): Snapshot {
  const themes = deriveThemes(input.brandColors);
  const lightBackground = themes.light.tokens.background ?? "#ffffff";
  const darkBackground = themes.dark.tokens.background ?? "#121212";
  const requiredPairs: RequiredPair[] = [
    ...brandRequirements(input.brandColors),
    ...requiredPairsFor("theme-light", input.brandColors),
    ...requiredPairsFor("theme-dark", input.brandColors),
  ];
  return {
    brandColors: input.brandColors,
    references: [
      { id: "white", name: "White", hex: "#ffffff" },
      { id: "black", name: "Black", hex: "#000000" },
      { id: "light-page", name: "Light page", hex: lightBackground },
      { id: "dark-page", name: "Dark page", hex: darkBackground },
    ],
    light: { tokens: themes.light.tokens, ramps: themes.light.ramps },
    dark: { tokens: themes.dark.tokens, ramps: themes.dark.ramps },
    requiredPairs,
    notes: [...(input.optimizeNotes ?? []), ...themes.notes],
    autoOptimize: input.autoOptimize,
    pickerMode: input.pickerMode,
    harmony: input.harmony,
  };
}

function swatches(snapshot: Snapshot, view: ContrastPair["view"]): { id: string; hex: string }[] {
  if (view === "brand") {
    return [
      ...snapshot.brandColors.map((color) => ({ id: color.id, hex: color.hex })),
      ...snapshot.references.map((color) => ({ id: color.id, hex: color.hex })),
    ];
  }
  const tokens = view === "theme-light" ? snapshot.light.tokens : snapshot.dark.tokens;
  return Object.entries(tokens)
    .filter((entry): entry is [string, string] => typeof entry[1] === "string" && entry[1].startsWith("#"))
    .map(([id, hex]) => ({ id, hex }));
}

function lookupRequired(snapshot: Snapshot, view: ContrastPair["view"], fgKey: string, bgKey: string) {
  return snapshot.requiredPairs.find(
    (pair) => pair.view === view && pair.fgKey === fgKey && pair.bgKey === bgKey,
  );
}

export function listPairs(snapshot: Snapshot): ContrastPair[] {
  const views: ContrastPair["view"][] = ["brand", "theme-light", "theme-dark"];
  const pairs: ContrastPair[] = [];
  for (const view of views) {
    const entries = swatches(snapshot, view);
    for (const foreground of entries) {
      for (const background of entries) {
        const required = lookupRequired(snapshot, view, foreground.id, background.id);
        const result = verdict(foreground.hex, background.hex);
        pairs.push({
          view,
          fgKey: foreground.id,
          bgKey: background.id,
          fgHex: foreground.hex,
          bgHex: background.hex,
          purpose: required?.purpose ?? `${foreground.id} on ${background.id}`,
          required: Boolean(required),
          exempt: required?.exempt ?? false,
          ...result,
        });
      }
    }
  }
  return pairs;
}

export function tokenEntries(tokens: TokenMap): [string, string][] {
  return Object.entries(tokens).filter(
    (entry): entry is [string, string] => typeof entry[1] === "string",
  );
}
