export const MIN_COLORS = 3;
export const MAX_COLORS = 5;

export type Harmony =
  | "complementary"
  | "analogous"
  | "triadic"
  | "monochromatic"
  | "split-complementary"
  | "tetradic";

export type PickerMode = "cube" | "wheel" | "hsb" | "rgb" | "lab" | "cmyk" | "hex";

export type BrandColor = {
  id: string;
  name: string;
  hex: string;
};

export type TokenMap = Record<string, string>;

export type RampStop = {
  step: number;
  hex: string;
};

export type Ramp = {
  id: string;
  name: string;
  stops: RampStop[];
};

export type RequiredPair = {
  view: "brand" | "theme-light" | "theme-dark";
  fgKey: string;
  bgKey: string;
  purpose: string;
  exempt: boolean;
};

export type Snapshot = {
  brandColors: BrandColor[];
  references: { id: string; name: string; hex: string }[];
  light: { tokens: TokenMap; ramps: Ramp[] };
  dark: { tokens: TokenMap; ramps: Ramp[] };
  requiredPairs: RequiredPair[];
  notes: string[];
  autoOptimize: boolean;
  pickerMode: PickerMode;
  harmony: Harmony;
};

export type ContrastPair = {
  view: RequiredPair["view"];
  fgKey: string;
  bgKey: string;
  fgHex: string;
  bgHex: string;
  purpose: string;
  required: boolean;
  exempt: boolean;
  ratio: number;
  aaNormal: boolean;
  aaLarge: boolean;
  aaaNormal: boolean;
  aaaLarge: boolean;
  nonText: boolean;
};

export type ExportFormat =
  | "css"
  | "scss"
  | "json"
  | "hex"
  | "tailwind"
  | "dtcg"
  | "ase";

export type ExportFile = {
  format: ExportFormat;
  filename: string;
  mime: string;
  body: string;
};
