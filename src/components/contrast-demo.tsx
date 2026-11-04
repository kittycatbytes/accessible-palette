"use client";

import { useMemo, useState } from "react";
import { contrastRatio, formatRatio, hexToRgb, normalizeHex, relativeLuminance, verdict } from "@/lib/color";

const WEIGHTS = [
  { key: "r" as const, label: "Red", weight: 0.2126 },
  { key: "g" as const, label: "Green", weight: 0.7152 },
  { key: "b" as const, label: "Blue", weight: 0.0722 },
];

function linearize(channel: number): number {
  const srgb = channel / 255;
  return srgb <= 0.04045 ? srgb / 12.92 : ((srgb + 0.055) / 1.055) ** 2.4;
}

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (hex: string) => void;
}) {
  const [draft, setDraft] = useState(value);
  return (
    <div className="ratio-field">
      <span id={`${label}-label`}>{label}</span>
      <input
        type="color"
        value={value}
        aria-labelledby={`${label}-label`}
        onChange={(event) => {
          setDraft(event.target.value);
          onChange(event.target.value);
        }}
      />
      <input
        type="text"
        className="mono"
        value={draft}
        spellCheck={false}
        aria-label={`${label} hex`}
        onChange={(event) => {
          setDraft(event.target.value);
          const raw = event.target.value.trim().replace(/^#/, "");
          const next = normalizeHex(event.target.value);
          if (next && raw.length === 6) onChange(next);
        }}
        onBlur={() => {
          const next = normalizeHex(draft);
          if (next) {
            onChange(next);
            setDraft(next);
          } else setDraft(value);
        }}
      />
    </div>
  );
}

function LuminanceCard({ title, hex }: { title: string; hex: string }) {
  const rgb = hexToRgb(hex) ?? { r: 0, g: 0, b: 0 };
  const luminance = relativeLuminance(hex);
  return (
    <article className="luminance-card">
      <h3>{title}</h3>
      <p className="mono">{hex}</p>
      <ul className="channel-weights">
        {WEIGHTS.map((channel) => {
          const raw = rgb[channel.key];
          const linear = linearize(raw);
          return (
            <li key={channel.label}>
              <div className="channel-label">
                <span>{channel.label}</span>
                <span className="mono">
                  {raw} → {linear.toFixed(4)}
                </span>
              </div>
              <div className="channel-track" aria-hidden="true">
                <span style={{ width: `${channel.weight * 100}%` }} />
              </div>
              <p className="channel-note">
                Weight {channel.weight} × linearized {linear.toFixed(4)} = {(channel.weight * linear).toFixed(4)}
              </p>
            </li>
          );
        })}
      </ul>
      <p>
        Relative luminance <strong className="mono">{luminance.toFixed(4)}</strong>
      </p>
    </article>
  );
}

export function ContrastDemo() {
  const [foreground, setForeground] = useState("#0f6e6a");
  const [background, setBackground] = useState("#ffffff");
  const ratio = contrastRatio(foreground, background);
  const result = verdict(foreground, background);
  const light = Math.max(relativeLuminance(foreground), relativeLuminance(background));
  const dark = Math.min(relativeLuminance(foreground), relativeLuminance(background));
  const grades = useMemo(
    () => [
      { name: "AA, large text", need: "3:1", pass: result.aaLarge, rule: "1.4.3" },
      { name: "AA, normal text", need: "4.5:1", pass: result.aaNormal, rule: "1.4.3" },
      { name: "AAA, large text", need: "4.5:1", pass: result.aaaLarge, rule: "1.4.6" },
      { name: "AAA, normal text", need: "7:1", pass: result.aaaNormal, rule: "1.4.6" },
      { name: "UI and graphics", need: "3:1", pass: result.nonText, rule: "1.4.11" },
    ],
    [result],
  );

  return (
    <div className="ratio-demo">
      <div className="ratio-sample" style={{ color: foreground, background }}>
        <p>The quick brown fox jumps over the lazy dog.</p>
        <p className="ratio-sample-large">Large text sample</p>
      </div>
      <div className="ratio-controls">
        <ColorField label="Foreground" value={foreground} onChange={setForeground} />
        <ColorField label="Background" value={background} onChange={setBackground} />
      </div>
      <p className="ratio-readout" aria-live="polite">
        Contrast ratio <strong className="mono">{formatRatio(ratio)}:1</strong>
      </p>
      <ul className="grade-list">
        {grades.map((grade) => (
          <li key={grade.name} className={grade.pass ? "grade-pass" : "grade-fail"}>
            <span>
              {grade.name} <span className="mono">{grade.need}</span>
            </span>
            <span>
              {grade.pass ? "Pass" : "Fail"} <span className="mono">{grade.rule}</span>
            </span>
          </li>
        ))}
      </ul>
      <div className="luminance-grid">
        <LuminanceCard title="Foreground" hex={foreground} />
        <LuminanceCard title="Background" hex={background} />
      </div>
      <div className="ratio-formula">
        <p>The ratio uses the lighter luminance on top and the darker one below. The 0.05 keeps the math defined when a color is black.</p>
        <p className="formula-line mono">
          ({light.toFixed(4)} + 0.05) / ({dark.toFixed(4)} + 0.05) = {formatRatio(ratio)}
        </p>
      </div>
    </div>
  );
}
