import { hexToRgb, rgbToHex } from "./color";

type Matrix = readonly [readonly [number, number, number], readonly [number, number, number], readonly [number, number, number]];

/** Machado, Oliveira, and Fernandes (2009), full severity. A simulation, not a diagnosis. */
const MATRICES: Record<"protan" | "deutan" | "tritan", Matrix> = {
  protan: [
    [0.152286, 1.052583, -0.204868],
    [0.114503, 0.786281, 0.099216],
    [-0.003882, -0.048116, 1.051998],
  ],
  deutan: [
    [0.367322, 0.860646, -0.227968],
    [0.280085, 0.672501, 0.047413],
    [-0.01182, 0.04294, 0.968881],
  ],
  tritan: [
    [1.255528, -0.076749, -0.178779],
    [-0.078411, 0.930809, 0.147602],
    [0.004733, 0.691367, 0.3039],
  ],
};

function toLinear(channel: number): number {
  const srgb = channel / 255;
  return srgb <= 0.04045 ? srgb / 12.92 : ((srgb + 0.055) / 1.055) ** 2.4;
}

function fromLinear(channel: number): number {
  const clamped = Math.min(1, Math.max(0, channel));
  const srgb =
    clamped <= 0.0031308 ? 12.92 * clamped : 1.055 * clamped ** (1 / 2.4) - 0.055;
  return Math.round(Math.min(1, Math.max(0, srgb)) * 255);
}

export function simulateCvd(hex: string, kind: keyof typeof MATRICES): string {
  const rgb = hexToRgb(hex) ?? { r: 0, g: 0, b: 0 };
  const linear = [toLinear(rgb.r), toLinear(rgb.g), toLinear(rgb.b)];
  const matrix = MATRICES[kind];
  const next = matrix.map((row) =>
    fromLinear(row[0] * linear[0] + row[1] * linear[1] + row[2] * linear[2]),
  );
  return rgbToHex({ r: next[0], g: next[1], b: next[2] });
}
