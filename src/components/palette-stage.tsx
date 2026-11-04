"use client";

import type { ReactNode } from "react";
import { bestText, colorLabel } from "@/lib/color";
import type { BrandColor } from "@/lib/types";

export function PaletteStage({
  colors,
  selected,
  spin,
  smoothColors,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onShuffle,
  onSelect,
}: {
  colors: BrandColor[];
  selected: number;
  spin: number;
  smoothColors: boolean;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onShuffle: () => void;
  onSelect: (index: number) => void;
}) {
  const current = colors[selected];
  return (
    <div className="stage-block">
      <div className={smoothColors ? "stage live-colors" : "stage"}>
        <div className="ring" aria-hidden="true" />
        <div className="orbit" style={{ transform: `rotate(${spin}deg)` }}>
          <div role="radiogroup" aria-label="Palette colors" className="orbit-group">
            {colors.map((color, index) => {
              const angle = -90 + (360 / colors.length) * index;
              const ink = bestText(color.hex);
              return (
                <label
                  key={color.id}
                  className="dot"
                  style={{
                    transform: `translate(-50%, -50%) rotate(${angle}deg) translateY(calc(var(--orbit-radius) * -1)) rotate(${-(angle + spin)}deg)`,
                    ["--dot" as string]: color.hex,
                    ["--ink" as string]: ink,
                  }}
                >
                  <input
                    type="radio"
                    name="palette-color"
                    value={color.id}
                    checked={index === selected}
                    onChange={() => onSelect(index)}
                    aria-label={`${color.name}, ${colorLabel(color.hex)}, ${color.hex}`}
                  />
                  <span className="dot-index" aria-hidden="true">
                    {index + 1}
                  </span>
                </label>
              );
            })}
          </div>
        </div>
        <div className="stage-actions">
          <StageIcon label="Undo" disabled={!canUndo} onClick={onUndo}>
            <path d="M9 14 4 9l5-5" />
            <path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H12" />
          </StageIcon>
          <StageIcon label="Redo" disabled={!canRedo} onClick={onRedo}>
            <path d="m15 14 5-5-5-5" />
            <path d="M20 9H9.5a5.5 5.5 0 0 0 0 11H12" />
          </StageIcon>
          <StageIcon label="Shuffle" onClick={onShuffle}>
            <path d="m16 3 4 4-4 4" />
            <path d="m16 13 4 4-4 4" />
            <path d="M4 7h2.8a4 4 0 0 1 3.4 1.9l.4.6" />
            <path d="M20 7h-2.8a4 4 0 0 0-3.4 1.9L8.4 16.1A4 4 0 0 1 5 18H4" />
            <path d="M20 17h-2.8a4 4 0 0 1-3.4-1.9l-.4-.6" />
          </StageIcon>
        </div>
      </div>
      <p className="selected-readout">
        Selected: {current.name}, {colorLabel(current.hex)},{" "}
        <span className="mono">{current.hex}</span>
      </p>
    </div>
  );
}

function StageIcon({
  label,
  disabled = false,
  onClick,
  children,
}: {
  label: string;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      className="stage-icon"
      aria-label={label}
      aria-disabled={disabled}
      onClick={() => {
        if (!disabled) onClick();
      }}
    >
      <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        {children}
      </svg>
      <span className="stage-tip">{label}</span>
    </button>
  );
}
