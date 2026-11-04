import { hexToRgb, readHsl, readOklch, srgbComponents } from "./color";
import type { ExportFile, Snapshot, TokenMap } from "./types";

export const TOKEN_LABELS: Record<string, string> = {
  background: "Page background",
  surface: "Surface",
  raised: "Raised surface",
  foreground: "Body text",
  muted: "Secondary text",
  placeholder: "Placeholder text",
  border: "Border",
  primary: "Primary",
  primaryForeground: "Primary label",
  primaryHover: "Primary hover",
  primaryHoverForeground: "Primary hover label",
  secondary: "Secondary",
  secondaryForeground: "Secondary label",
  accent: "Accent",
  accentForeground: "Accent label",
  link: "Link",
  focus: "Focus ring",
  success: "Success",
  successForeground: "Success label",
  warning: "Warning",
  warningForeground: "Warning label",
  danger: "Error",
  dangerForeground: "Error label",
  disabled: "Disabled",
  disabledForeground: "Disabled label",
};

function slug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "palette";
}

function cssName(key: string): string {
  return key.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
}

function block(selector: string, tokens: TokenMap): string {
  const lines = Object.entries(tokens)
    .filter((entry): entry is [string, string] => entry[1].startsWith("#"))
    .map(([key, hex]) => `  --color-${cssName(key)}: ${hex};`);
  return `${selector} {\n${lines.join("\n")}\n}`;
}

function colorRecord(hex: string) {
  const rgb = hexToRgb(hex) ?? { r: 0, g: 0, b: 0 };
  const oklch = readOklch(hex);
  return {
    hex,
    rgb,
    hsl: readHsl(hex),
    oklch: {
      l: Math.round(oklch.l * 1000) / 1000,
      c: Math.round(oklch.c * 1000) / 1000,
      h: Math.round(oklch.h * 10) / 10,
    },
  };
}

function dtcgGroup(tokens: TokenMap) {
  const group: Record<string, unknown> = {};
  for (const [key, hex] of Object.entries(tokens)) {
    if (!hex.startsWith("#")) continue;
    group[key] = {
      $type: "color",
      $description: TOKEN_LABELS[key] ?? key,
      $value: {
        colorSpace: "srgb",
        components: srgbComponents(hex),
        hex,
      },
    };
  }
  return group;
}

function utf16be(value: string): number[] {
  const bytes: number[] = [];
  const text = `${value}\0`;
  for (let index = 0; index < text.length; index += 1) {
    const code = text.charCodeAt(index);
    bytes.push((code >> 8) & 0xff, code & 0xff);
  }
  return bytes;
}

export function aseBytes(name: string, colors: { name: string; hex: string }[]): Uint8Array {
  const chunks: number[][] = [];
  for (const color of colors) {
    const nameBytes = utf16be(color.name);
    const rgb = hexToRgb(color.hex) ?? { r: 0, g: 0, b: 0 };
    const payload = new ArrayBuffer(2 + nameBytes.length + 4 + 12 + 2);
    const view = new DataView(payload);
    view.setUint16(0, nameBytes.length / 2);
    const payloadBytes = new Uint8Array(payload);
    payloadBytes.set(nameBytes, 2);
    let offset = 2 + nameBytes.length;
    payloadBytes.set([0x52, 0x47, 0x42, 0x20], offset);
    offset += 4;
    view.setFloat32(offset, rgb.r / 255);
    view.setFloat32(offset + 4, rgb.g / 255);
    view.setFloat32(offset + 8, rgb.b / 255);
    view.setUint16(offset + 12, 0);
    const block = new Uint8Array(2 + 4 + payloadBytes.length);
    const blockView = new DataView(block.buffer);
    blockView.setUint16(0, 0x0001);
    blockView.setUint32(2, payloadBytes.length);
    block.set(payloadBytes, 6);
    chunks.push(Array.from(block));
  }
  const body = chunks.flat();
  const file = new Uint8Array(12 + body.length);
  file.set([0x41, 0x53, 0x45, 0x46], 0);
  const header = new DataView(file.buffer);
  header.setUint16(4, 1);
  header.setUint16(6, 0);
  header.setUint32(8, chunks.length);
  file.set(body, 12);
  return file;
}

export function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function swatchList(snapshot: Snapshot): { name: string; hex: string }[] {
  const list = snapshot.brandColors.map((color) => ({
    name: color.name,
    hex: color.hex,
  }));
  for (const [key, hex] of Object.entries(snapshot.light.tokens)) {
    if (hex.startsWith("#")) list.push({ name: `Light ${TOKEN_LABELS[key] ?? key}`, hex });
  }
  return list;
}

export function buildExports(snapshot: Snapshot, paletteName: string): ExportFile[] {
  const base = slug(paletteName);
  const css = `/* ${paletteName} */\n${block(":root", snapshot.light.tokens)}\n\n${block('[data-palette="dark"]', snapshot.dark.tokens)}\n`;
  const scssLight = Object.entries(snapshot.light.tokens)
    .filter((entry): entry is [string, string] => entry[1].startsWith("#"))
    .map(([key, hex]) => `$light-${cssName(key)}: ${hex};`)
    .join("\n");
  const scssDark = Object.entries(snapshot.dark.tokens)
    .filter((entry): entry is [string, string] => entry[1].startsWith("#"))
    .map(([key, hex]) => `$dark-${cssName(key)}: ${hex};`)
    .join("\n");
  const json = {
    name: paletteName,
    harmony: snapshot.harmony,
    brandColors: snapshot.brandColors.map((color) => ({
      ...color,
      ...colorRecord(color.hex),
    })),
    light: snapshot.light,
    dark: snapshot.dark,
    notes: snapshot.notes,
  };
  const hex = [
    ...snapshot.brandColors.map((color) => `${color.hex} ${color.name}`),
    ...Object.entries(snapshot.light.tokens)
      .filter((entry): entry is [string, string] => entry[1].startsWith("#"))
      .map(([key, value]) => `${value} light ${key}`),
  ].join("\n");
  const tailwind = `/* ${paletteName}\n   Tailwind CSS v4 theme. Put this in a CSS file imported by the app.\n   Dark values apply under [data-palette="dark"]. */\n@theme {\n${Object.entries(
    snapshot.light.tokens,
  )
    .filter((entry): entry is [string, string] => entry[1].startsWith("#"))
    .map(([key, value]) => `  --color-${cssName(key)}: ${value};`)
    .join("\n")}\n}\n\n[data-palette="dark"] {\n${Object.entries(snapshot.dark.tokens)
    .filter((entry): entry is [string, string] => entry[1].startsWith("#"))
    .map(([key, value]) => `  --color-${cssName(key)}: ${value};`)
    .join("\n")}\n}\n`;
  const dtcg = {
    color: {
      $description: `${paletteName}. DTCG color module, September 2026 draft: sRGB components plus a hex fallback.`,
      brand: Object.fromEntries(
        snapshot.brandColors.map((color) => [
          color.id,
          {
            $type: "color",
            $description: color.name,
            $value: {
              colorSpace: "srgb",
              components: srgbComponents(color.hex),
              hex: color.hex,
            },
          },
        ]),
      ),
      light: dtcgGroup(snapshot.light.tokens),
      dark: dtcgGroup(snapshot.dark.tokens),
    },
  };
  const ase = bytesToBase64(aseBytes(paletteName, swatchList(snapshot)));
  return [
    { format: "css", filename: `${base}.css`, mime: "text/css", body: css },
    { format: "scss", filename: `${base}.scss`, mime: "text/x-scss", body: `// ${paletteName}\n${scssLight}\n\n${scssDark}\n` },
    { format: "json", filename: `${base}.json`, mime: "application/json", body: JSON.stringify(json, null, 2) },
    { format: "hex", filename: `${base}.txt`, mime: "text/plain", body: `${hex}\n` },
    { format: "tailwind", filename: `${base}-tailwind.css`, mime: "text/css", body: tailwind },
    { format: "dtcg", filename: `${base}.tokens.json`, mime: "application/json", body: JSON.stringify(dtcg, null, 2) },
    { format: "ase", filename: `${base}.ase`, mime: "application/octet-stream", body: ase },
  ];
}

export function downloadText(filename: string, body: string, mime: string): void {
  const blob = new Blob([body], { type: mime });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function triggerDownload(file: ExportFile): void {
  if (file.format === "ase") {
    const binary = atob(file.body);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
    const blob = new Blob([bytes], { type: file.mime });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = file.filename;
    link.click();
    URL.revokeObjectURL(url);
    return;
  }
  downloadText(file.filename, file.body, file.mime);
}
