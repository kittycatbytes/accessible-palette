"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { formatRatio, pairWord } from "@/lib/color";
import { TOKEN_LABELS } from "@/lib/export";
import {
  saveMatrixToFavorites,
  saveMatrixToNewProject,
  saveMatrixToProject,
  type PaletteLibrary,
  type SavedPlace,
} from "@/lib/library";
import { recommendBrandBlocks } from "@/lib/recommend";
import type { ContrastPair, Snapshot } from "@/lib/types";
import { Badges } from "./badges";
import { SaveDialog } from "./save-dialog";

function pairPasses(pair: ContrastPair) {
  return !pair.exempt && pair.aaNormal && pair.nonText;
}

function openAxes(keys: string[], grid: ContrastPair[], hide: boolean) {
  if (!hide) return { rows: new Set(keys), cols: new Set(keys) };
  const byKey = new Map(grid.map((pair) => [`${pair.fgKey}:${pair.bgKey}`, pair]));
  const pass = (fg: string, bg: string) => {
    const pair = byKey.get(`${fg}:${bg}`);
    return Boolean(pair && pairPasses(pair));
  };
  let rows = keys.filter((fg) => keys.some((bg) => pass(fg, bg)));
  let cols = keys.filter((bg) => rows.some((fg) => pass(fg, bg)));
  for (let step = 0; step < keys.length; step += 1) {
    const nextCols = cols.filter((bg) => rows.some((fg) => pass(fg, bg)));
    const nextRows = rows.filter((fg) => nextCols.some((bg) => pass(fg, bg)));
    if (nextCols.length === cols.length && nextRows.length === rows.length) break;
    cols = nextCols;
    rows = nextRows;
  }
  return { rows: new Set(rows), cols: new Set(cols) };
}

function labelFor(snapshot: Snapshot, key: string): string {
  return (
    snapshot.brandColors.find((color) => color.id === key)?.name ??
    snapshot.references.find((color) => color.id === key)?.name ??
    TOKEN_LABELS[key] ??
    key
  );
}

export function Matrix({
  snapshot,
  pairs,
  activeKey,
  library,
  localOnly,
  onSelect,
  onLibrary,
  onSaved,
}: {
  snapshot: Snapshot;
  pairs: ContrastPair[];
  activeKey: string;
  library: PaletteLibrary;
  localOnly: boolean;
  onSelect: (pair: ContrastPair) => void;
  onLibrary: (library: PaletteLibrary) => void;
  onSaved: (place: SavedPlace) => void;
}) {
  const view = "brand" as const;
  const [hideFailures, setHideFailures] = useState(true);
  const paletteKey = snapshot.brandColors.map((color) => color.hex).join("|");
  const recommended = useMemo(
    () => recommendBrandBlocks(pairs.filter((pair) => pair.view === "brand")),
    [pairs, paletteKey],
  );
  const [pinned, setPinned] = useState<string[]>(recommended);
  const [pinnedPalette, setPinnedPalette] = useState(paletteKey);
  if (pinnedPalette !== paletteKey) {
    setPinnedPalette(paletteKey);
    setPinned(recommended);
  }
  const [saveOpen, setSaveOpen] = useState(false);
  const saveButtonRef = useRef<HTMLButtonElement>(null);
  const viewPairs = pairs.filter((pair) => pair.view === view);
  const required = viewPairs
    .filter((pair) => pair.required)
    .filter((pair) => !hideFailures || pairPasses(pair));
  useEffect(() => {
    const shown = required.some((pair) => `${pair.view}:${pair.fgKey}:${pair.bgKey}` === activeKey);
    if (shown) return;
    const first = required.find((pair) => pairPasses(pair));
    if (first) onSelect(first);
  }, [activeKey, onSelect, required]);
  const keys = [
    ...snapshot.brandColors.map((color) => color.id),
    ...snapshot.references.map((color) => color.id),
  ];
  const grid = viewPairs.filter((pair) => keys.includes(pair.fgKey) && keys.includes(pair.bgKey));
  const axes = openAxes(keys, grid, hideFailures);
  const activePair =
    pairs.find((pair) => `${pair.view}:${pair.fgKey}:${pair.bgKey}` === activeKey) ?? null;
  const paletteColors = snapshot.brandColors.map((color) => color.hex);
  const selectedCombos = pinned.flatMap((key) => {
    const pair = pairs.find((item) => item.view === "brand" && `${item.fgKey}:${item.bgKey}` === key);
    return pair ? [{ fgHex: pair.fgHex, bgHex: pair.bgHex, purpose: pair.purpose }] : [];
  });

  return (
    <div className="stack">
      <div className="tool-row">
        <label className="check">
          <input
            type="checkbox"
            checked={hideFailures}
            onChange={(event) => setHideFailures(event.target.checked)}
          />
          <span>Hide failures</span>
        </label>
      </div>
      <Reveal signature={`${view}:${hideFailures}:${required.map((pair) => pair.fgKey + pair.bgKey).join("|")}`}>
      <div className="matrix-scroll" tabIndex={0} aria-label="Required contrast checks">
        <p className="matrix-caption">Required checks for brand</p>
        <ul className="required-grid matrix-brand">
          {required.map((pair) => {
            const selected = activeKey === `${pair.view}:${pair.fgKey}:${pair.bgKey}`;
            return (
              <li key={`${pair.fgKey}-${pair.bgKey}`}>
                <button
                  type="button"
                  className={["cell", "required-cell", selected ? "cell-active" : ""].filter(Boolean).join(" ")}
                  style={{ "--cell-fg": pair.fgHex, "--cell-bg": pair.bgHex } as CSSProperties}
                  aria-pressed={selected}
                  aria-label={`${pair.purpose}. ${formatRatio(pair.ratio)} to 1. ${pair.exempt ? "Exempt" : pairWord(pair)}. AA normal ${pair.aaNormal ? "pass" : "fail"}. AA large ${pair.aaLarge ? "pass" : "fail"}. AAA normal ${pair.aaaNormal ? "pass" : "fail"}. AAA large ${pair.aaaLarge ? "pass" : "fail"}. UI ${pair.nonText ? "pass" : "fail"}.${selected ? " Shown in the contrast badges." : ""}`}
                  onClick={() => onSelect(pair)}
                >
                  <span className="required-purpose">{pair.purpose}</span>
                  <span className="required-meta">
                    <span className="mono">{formatRatio(pair.ratio)}</span>
                    <span>{pair.exempt ? "Exempt" : pairWord(pair)}</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
        {required.length === 0 ? (
          <p className="fine-print required-empty">Nothing in this set passes. Uncheck Hide failures to see every check.</p>
        ) : null}
      </div>
      </Reveal>
      {activePair ? <Badges pair={activePair} /> : null}
      {view === "brand" ? (
        <div className="matrix-toolbar">
          <div>
            <p aria-hidden="true">Brand contrast matrix. Rows are the foreground. Columns are the background.</p>
            <p className="fine-print">
              Each cell is filled with that foreground on that background. Hover shows the plain ratio. Marked
              cells are the recommended set for a page. Click a cell to add or remove it.
            </p>
          </div>
          <div className="matrix-toolbar-actions">
            <span className="fine-print">
              {selectedCombos.length} {selectedCombos.length === 1 ? "combo" : "combos"} selected
            </span>
            <button ref={saveButtonRef} type="button" className="button" onClick={() => setSaveOpen(true)}>
              + Save
            </button>
          </div>
        </div>
      ) : null}
      <div className="matrix-scroll" tabIndex={0} aria-label="Full contrast matrix. Scroll sideways for more columns.">
        <div
          role="grid"
          className={view === "brand" ? "brand-matrix matrix-brand" : "brand-matrix"}
          aria-label={`${view === "brand" ? "Brand" : view === "theme-light" ? "Light theme" : "Dark theme"} contrast matrix. Rows are the foreground. Columns are the background.`}
          style={{
            gridTemplateColumns: ["7.6rem", ...keys.map((key) => (axes.cols.has(key) ? "6rem" : "0px"))].join(" "),
            gridTemplateRows: ["2.6rem", ...keys.map((key) => (axes.rows.has(key) ? "4.85rem" : "0px"))].join(" "),
          }}
        >
          <div role="columnheader" className="matrix-corner">
            Foreground
          </div>
          {keys.map((key) => {
            const open = axes.cols.has(key);
            return (
              <div key={`col-${key}`} role="columnheader" className={open ? "matrix-colhead" : "matrix-colhead is-collapsed"} aria-hidden={open ? undefined : true}>
                {labelFor(snapshot, key)}
              </div>
            );
          })}
          {keys.flatMap((fgKey) => {
            const rowOpen = axes.rows.has(fgKey);
            return [
              <div key={`row-${fgKey}`} role="rowheader" className={rowOpen ? "matrix-rowhead" : "matrix-rowhead is-collapsed"} aria-hidden={rowOpen ? undefined : true}>
                {labelFor(snapshot, fgKey)}
              </div>,
              ...keys.map((bgKey) => {
                const pair = grid.find((item) => item.fgKey === fgKey && item.bgKey === bgKey);
                const axisOpen = rowOpen && axes.cols.has(bgKey);
                const failed = Boolean(hideFailures && pair && !pair.exempt && !pairPasses(pair));
                if (!pair || !axisOpen) {
                  return <div key={`${fgKey}-${bgKey}`} role="gridcell" className="matrix-slot is-collapsed" aria-hidden="true" />;
                }
                const cellKey = `${pair.fgKey}:${pair.bgKey}`;
                const selected = activeKey === `${pair.view}:${pair.fgKey}:${pair.bgKey}`;
                const kept = view === "brand" && pinned.includes(cellKey);
                return (
                  <div key={`${fgKey}-${bgKey}`} role="gridcell" className="matrix-slot">
                    <button
                      type="button"
                      className={["cell", failed ? "cell-failed" : "", selected ? "cell-active" : "", kept ? "cell-combo" : ""].filter(Boolean).join(" ")}
                      style={
                        view === "brand"
                          ? ({ "--cell-fg": pair.fgHex, "--cell-bg": pair.bgHex } as CSSProperties)
                          : undefined
                      }
                      aria-pressed={view === "brand" ? kept : selected}
                      aria-label={`${pair.purpose}. ${formatRatio(pair.ratio)} to 1. ${pair.exempt ? "Exempt" : pairWord(pair)}. AA normal ${pair.aaNormal ? "pass" : "fail"}. AA large ${pair.aaLarge ? "pass" : "fail"}. AAA normal ${pair.aaaNormal ? "pass" : "fail"}. AAA large ${pair.aaaLarge ? "pass" : "fail"}. UI ${pair.nonText ? "pass" : "fail"}.${selected ? " Shown in the contrast badges." : ""}${view === "brand" ? (kept ? " Selected for the saved matrix." : " Not selected.") : ""}`}
                      onClick={() => {
                        onSelect(pair);
                        if (view !== "brand") return;
                        setPinned((current) =>
                          current.includes(cellKey)
                            ? current.filter((item) => item !== cellKey)
                            : [...current, cellKey],
                        );
                      }}
                    >
                      {failed ? (
                        <span className="cell-failed-label">Failed</span>
                      ) : (
                        <>
                          <span className="mono">{formatRatio(pair.ratio)}</span>
                          <span>{pair.exempt ? "Exempt" : pairWord(pair)}</span>
                        </>
                      )}
                      {kept ? <span className="cell-mark" aria-hidden="true" /> : null}
                    </button>
                  </div>
                );
              }),
            ];
          })}
        </div>
      </div>
      {view === "brand" ? (
        <SaveDialog
          open={saveOpen}
          title="Save Brand Contrast Matrix to Project"
          note="The Brand Contrast Matrix will be saved with the user-selected combos."
          library={library}
          localOnly={localOnly}
          onDismiss={() => {
            setSaveOpen(false);
            saveButtonRef.current?.focus();
          }}
          onSubmit={({ destination, projectName, projectId }) => {
            const result =
              destination === "favorites"
                ? saveMatrixToFavorites(library, paletteColors, selectedCombos)
                : destination === "new"
                  ? saveMatrixToNewProject(library, paletteColors, selectedCombos, projectName)
                  : saveMatrixToProject(library, paletteColors, selectedCombos, projectId);
            if (!result.ok) return result.message;
            onLibrary(result.library);
            onSaved(result.place);
            return null;
          }}
        >
          {selectedCombos.length > 0 ? (
            <ul className="combo-swatches" aria-label="Selected color combos">
              {selectedCombos.map((combo) => (
                <li key={`${combo.fgHex}-${combo.bgHex}-${combo.purpose}`} style={{ backgroundColor: combo.bgHex, color: combo.fgHex }}>
                  <span aria-hidden="true">Aa</span>
                  <span className="sr-only">{combo.purpose}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="fine-print">No cells are kept in color yet. Select the intersections you want, then save.</p>
          )}
        </SaveDialog>
      ) : null}
    </div>
  );
}

function Reveal({ signature, children }: { signature: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const heightRef = useRef<number | null>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const from = heightRef.current;
    el.style.height = "auto";
    const to = el.scrollHeight;
    heightRef.current = to;
    if (from == null || Math.abs(from - to) < 2) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    el.style.height = `${from}px`;
    el.style.overflow = "hidden";
    const frame = requestAnimationFrame(() => {
      el.style.transition = "height 420ms ease";
      el.style.height = `${to}px`;
    });
    const finish = () => {
      el.style.height = "";
      el.style.transition = "";
      el.style.overflow = "";
      el.removeEventListener("transitionend", clear);
      window.clearTimeout(timer);
      heightRef.current = el.scrollHeight;
    };
    const clear = (event: TransitionEvent) => {
      if (event.propertyName !== "height") return;
      finish();
    };
    const timer = window.setTimeout(finish, 480);
    el.addEventListener("transitionend", clear);
    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(timer);
      el.removeEventListener("transitionend", clear);
    };
  }, [signature]);
  return <div ref={ref}>{children}</div>;
}
