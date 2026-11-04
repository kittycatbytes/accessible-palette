"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import type { PalettePreset } from "@/lib/presets";

export function CategoryRail({
  groups,
  onSelect,
}: {
  groups: { label: string; presets: PalettePreset[] }[];
  onSelect: (preset: PalettePreset) => void;
}) {
  const [openLabel, setOpenLabel] = useState<string | null>(null);
  const [chosenId, setChosenId] = useState<Record<string, string>>({});
  const closeMenu = useCallback(() => setOpenLabel(null), []);
  const [edges, setEdges] = useState({ atStart: true, atEnd: true });
  const scrollerRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    function measure() {
      const el = scrollerRef.current;
      if (!el) return;
      const max = el.scrollWidth - el.clientWidth;
      setEdges({ atStart: el.scrollLeft <= 2, atEnd: el.scrollLeft >= max - 2 });
    }
    measure();
    scroller.addEventListener("scroll", measure, { passive: true });
    const observer = new ResizeObserver(measure);
    observer.observe(scroller);
    return () => {
      scroller.removeEventListener("scroll", measure);
      observer.disconnect();
    };
  }, [groups.length]);

  function nudge(direction: -1 | 1) {
    const el = scrollerRef.current;
    if (!el) return;
    const distance = Math.max(160, el.clientWidth * 0.72) * direction;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollBy({ left: distance, behavior: reduce ? "auto" : "smooth" });
  }

  return (
    <div className="category-rail">
      <button
        type="button"
        className="category-nudge"
        aria-label="Show earlier categories"
        disabled={edges.atStart}
        onClick={() => nudge(-1)}
      >
        <Chevron direction="left" />
      </button>
      <div
        ref={scrollerRef}
        className="category-scroll"
        tabIndex={0}
        aria-label="Palette categories"
        onKeyDown={(event) => {
          if (event.key === "ArrowRight") {
            event.preventDefault();
            nudge(1);
          }
          if (event.key === "ArrowLeft") {
            event.preventDefault();
            nudge(-1);
          }
        }}
      >
        {groups.map((group) => (
          <Flyout
            key={group.label}
            label={group.label}
            presets={group.presets}
            open={openLabel === group.label}
            menuId={menuId}
            selectedId={chosenId[group.label]}
            onToggle={() => setOpenLabel((current) => (current === group.label ? null : group.label))}
            onClose={closeMenu}
            onSelect={(preset) => {
              setChosenId((current) => ({ ...current, [group.label]: preset.id }));
              onSelect(preset);
            }}
          />
        ))}
      </div>
      <button
        type="button"
        className="category-nudge"
        aria-label="Show more categories"
        disabled={edges.atEnd}
        onClick={() => nudge(1)}
      >
        <Chevron direction="right" />
      </button>
    </div>
  );
}

function Flyout({
  label,
  presets,
  open,
  menuId,
  selectedId,
  onToggle,
  onClose,
  onSelect,
}: {
  label: string;
  presets: PalettePreset[];
  open: boolean;
  menuId: string;
  selectedId?: string;
  onToggle: () => void;
  onClose: () => void;
  onSelect: (preset: PalettePreset) => void;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const selected = presets.find((preset) => preset.id === selectedId);
  const preview = selected?.colors ?? presets[0]?.colors ?? [];

  useEffect(() => {
    if (!open) return;
    const panel = panelRef.current;
    const button = buttonRef.current;
    if (!panel || !button) return;
    const menu = panel;
    const trigger = button;
    function place() {
      const rect = trigger.getBoundingClientRect();
      const width = Math.min(352, window.innerWidth - 16);
      let left = rect.left;
      if (left + width > window.innerWidth - 8) left = window.innerWidth - 8 - width;
      if (left < 8) left = 8;
      const below = rect.bottom + 8;
      const height = menu.offsetHeight;
      const top = below + height > window.innerHeight - 8 && rect.top - height - 8 > 8 ? rect.top - height - 8 : below;
      menu.style.top = `${top}px`;
      menu.style.left = `${left}px`;
      menu.style.width = `${width}px`;
    }
    place();
    const items = () => Array.from(menu.querySelectorAll<HTMLButtonElement>('[role="menuitem"]'));
    items()[0]?.focus();
    function onPointer(event: MouseEvent) {
      if (!wrapRef.current?.contains(event.target as Node) && !menu.contains(event.target as Node)) onClose();
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
        trigger.focus();
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
    function onScroll() {
      const rect = trigger.getBoundingClientRect();
      const scroller = trigger.closest(".category-scroll");
      const bounds = scroller?.getBoundingClientRect();
      if (bounds && (rect.right < bounds.left + 8 || rect.left > bounds.right - 8)) {
        onClose();
        return;
      }
      place();
    }
    document.addEventListener("mousedown", onPointer);
    menu.addEventListener("keydown", onKey);
    window.addEventListener("resize", place);
    window.addEventListener("scroll", onScroll, true);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      menu.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", onScroll, true);
    };
  }, [open, onClose]);

  return (
    <div className="flyout" ref={wrapRef}>
      <button
        ref={buttonRef}
        type="button"
        className={open ? "category-chip is-open" : "category-chip"}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-controls={open ? menuId : undefined}
        aria-label={selected ? `${label}, ${selected.name} selected` : `${label}, more palettes`}
        onClick={onToggle}
      >
        <span className="category-chip-head">
          <span className="category-chip-name">{label}</span>
          <Chevron direction="down" />
        </span>
        <span className="category-bar" aria-hidden="true">
          {preview.map((hex) => (
            <span key={hex} style={{ background: hex }} />
          ))}
        </span>
      </button>
      {open ? (
        <div ref={panelRef} role="menu" id={menuId} aria-label={label} className="flyout-panel">
          {presets.map((preset) => (
            <button
              key={preset.id}
              type="button"
              role="menuitem"
              className={preset.id === selectedId ? "preset is-selected" : "preset"}
              aria-current={preset.id === selectedId ? "true" : undefined}
              onClick={() => {
                onSelect(preset);
                onClose();
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

function Chevron({ direction }: { direction: "left" | "right" | "down" }) {
  const path =
    direction === "left"
      ? "M14.5 6.5 9 12l5.5 5.5"
      : direction === "down"
        ? "M6.5 9.5 12 15l5.5-5.5"
        : "M9.5 6.5 15 12l-5.5 5.5";
  return (
    <svg className={direction === "down" ? "icon category-caret" : "icon"} viewBox="0 0 24 24" aria-hidden="true">
      <path d={path} fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
