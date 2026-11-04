import { simulateCvd } from "@/lib/cvd";
import type { BrandColor } from "@/lib/types";

const KINDS = [
  ["original", "Original"],
  ["protan", "Protan"],
  ["deutan", "Deutan"],
  ["tritan", "Tritan"],
] as const;

export function CvdPanel({ colors }: { colors: BrandColor[] }) {
  return (
    <div className="stack">
      <p>
        These rows simulate protan, deutan, and tritan color vision. They are a guide, not a
        diagnosis. Status in the preview also uses an icon and a word, because a red and a green
        can share a contrast ratio and still be hard to tell apart.
      </p>
      <div className="cvd-grid">
        {KINDS.map(([kind, label]) => (
          <div key={kind}>
            <h3>{label}</h3>
            <div className="swatch-row" aria-label={label}>
              {colors.map((color) => {
                const hex = kind === "original" ? color.hex : simulateCvd(color.hex, kind);
                return (
                  <span key={color.id} className="cvd-swatch" style={{ background: hex }} title={hex}>
                    <span className="sr-only">
                      {color.name} {hex}
                    </span>
                  </span>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
