import { ImageResponse } from "next/og";

export const socialSize = { width: 1200, height: 630 };
export const socialAlt = "Accessible Palette Generator, a WCAG 2.2 contrast checker";

const paints = ["#ef6f4d", "#f2c14e", "#2aa9a1", "#7a5cff"];

export function socialCard() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          backgroundColor: "#fff6ea",
          padding: "68px 76px",
        }}
      >
        <div style={{ display: "flex", gap: "22px" }}>
          {paints.map((color) => (
            <div
              key={color}
              style={{
                width: "72px",
                height: "72px",
                borderRadius: "36px",
                backgroundColor: color,
                display: "flex",
              }}
            />
          ))}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
          <div style={{ fontSize: "68px", fontWeight: 700, color: "#14202b", letterSpacing: "-1.5px" }}>
            Accessible Palette Generator
          </div>
          <div style={{ fontSize: "32px", color: "#3a4756", maxWidth: "920px", lineHeight: 1.35 }}>
            Build a palette and check text and interface colors against WCAG 2.2.
          </div>
        </div>
      </div>
    ),
    { ...socialSize },
  );
}
