declare module "culori" {
  export type Color = {
    mode: string;
    l?: number;
    c?: number;
    h?: number;
    a?: number;
    b?: number;
    s?: number;
    v?: number;
    r?: number;
    g?: number;
  };

  export function parse(color: string): Color | undefined;
  export function formatHex(color: Color | string): string | undefined;
  export function converter(
    mode: string,
  ): (color: Color | string) => Color | undefined;
  export function clampChroma(
    color: Color,
    mode?: string,
    rgbGamut?: string,
  ): Color;
}
