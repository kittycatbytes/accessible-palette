"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { PalettePreset } from "@/lib/presets";

export function Flyout({
  label,
  presets,
  onSelect,
}: {
  label: string;
  presets: PalettePreset[];
  onSelect: (preset: PalettePreset) => void;
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    const menu = wrapRef.current?.querySelector<HTMLElement>('[role="menu"]');
    const items = () =>
      Array.from(wrapRef.current?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]') ?? []);
    items()[0]?.focus();
    function onPointer(event: MouseEvent) {
      if (!wrapRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        wrapRef.current?.querySelector("button")?.focus();
      }
      const list = items();
      const index = list.findIndex((item) => item === document.activeElement);
      if (event.key === "ArrowDown") {
        event.preventDefault();
        list[(index + 1) % list.length]?.focus();
      }
      if (event.key === "ArrowUp") {
        event.preventDefault();
        list[(index - 1 + list.length) % list.length]?.focus();
      }
      if (event.key === "Home") {
        event.preventDefault();
        list[0]?.focus();
      }
      if (event.key === "End") {
        event.preventDefault();
        list[list.length - 1]?.focus();
      }
    }
    document.addEventListener("mousedown", onPointer);
    menu?.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      menu?.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="flyout" ref={wrapRef}>
      <button
        type="button"
        className="button button-ghost"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-controls={menuId}
        onClick={() => setOpen((value) => !value)}
      >
        {label}
      </button>
      {open ? (
        <div role="menu" id={menuId} aria-label={label} className="flyout-panel">
          {presets.map((preset) => (
            <button
              key={preset.id}
              type="button"
              role="menuitem"
              className="preset"
              onClick={() => {
                onSelect(preset);
                setOpen(false);
              }}
            >
              <span className="preset-name">{preset.name}</span>
              <span className="preset-copy">{preset.description}</span>
              <span className="swatch-row" aria-hidden="true">
                {preset.colors.map((hex) => (
                  <span key={hex} className="mini-swatch" style={{ background: hex }} />
                ))}
              </span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
