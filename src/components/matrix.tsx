"use client";

import { useRef, useState, type CSSProperties } from "react";
import { formatRatio, pairWord } from "@/lib/color";
import { TOKEN_LABELS } from "@/lib/export";
import {
  saveMatrixToFavorites,
  saveMatrixToNewProject,
  saveMatrixToProject,
  type PaletteLibrary,
} from "@/lib/library";
import { CURATED_TOKEN_KEYS } from "@/lib/theme";
import type { ContrastPair, Snapshot } from "@/lib/types";
import { SaveDialog } from "./save-dialog";

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
}: {
  snapshot: Snapshot;
  pairs: ContrastPair[];
  activeKey: string;
  library: PaletteLibrary;
  localOnly: boolean;
  onSelect: (pair: ContrastPair) => void;
  onLibrary: (library: PaletteLibrary) => void;
}) {
  const [view, setView] = useState<ContrastPair["view"]>("brand");
  const [full, setFull] = useState(false);
  const [failuresOnly, setFailuresOnly] = useState(false);
  const [pinned, setPinned] = useState<string[]>([]);
  const [saveOpen, setSaveOpen] = useState(false);
  const saveButtonRef = useRef<HTMLButtonElement>(null);
  const viewPairs = pairs.filter((pair) => pair.view === view);
  const required = viewPairs.filter((pair) => pair.required);
  const keys =
    view === "brand"
      ? [
          ...snapshot.brandColors.map((color) => color.id),
          ...snapshot.references.map((color) => color.id),
        ]
      : full
        ? Object.keys(view === "theme-light" ? snapshot.light.tokens : snapshot.dark.tokens)
        : [...CURATED_TOKEN_KEYS];
  const grid = viewPairs.filter((pair) => keys.includes(pair.fgKey) && keys.includes(pair.bgKey));
  const paletteColors = snapshot.brandColors.map((color) => color.hex);
  const selectedCombos = pinned.flatMap((key) => {
    const pair = pairs.find((item) => item.view === "brand" && `${item.fgKey}:${item.bgKey}` === key);
    return pair ? [{ fgHex: pair.fgHex, bgHex: pair.bgHex, purpose: pair.purpose }] : [];
  });

  return (
    <div className="stack">
      <div className="tool-row" role="group" aria-label="Matrix view">
        {(
          [
            ["brand", "Brand colors"],
            ["theme-light", "Light theme"],
            ["theme-dark", "Dark theme"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            className={view === value ? "button" : "button button-ghost"}
            aria-pressed={view === value}
            onClick={() => setView(value)}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="tool-row">
        <label className="check">
          <input
            type="checkbox"
            checked={failuresOnly}
            onChange={(event) => setFailuresOnly(event.target.checked)}
          />
          <span>Emphasize failures</span>
        </label>
        {view !== "brand" ? (
          <label className="check">
            <input type="checkbox" checked={full} onChange={(event) => setFull(event.target.checked)} />
            <span>Show every token</span>
          </label>
        ) : null}
      </div>
      <div className="matrix-scroll" tabIndex={0} aria-label="Required contrast checks">
        <table className="matrix">
          <caption>Required checks for {view.replace("-", " ")}</caption>
          <thead>
            <tr>
              <th scope="col">Check</th>
              <th scope="col">Ratio</th>
              <th scope="col">AA normal</th>
              <th scope="col">AA large</th>
              <th scope="col">AAA normal</th>
              <th scope="col">AAA large</th>
              <th scope="col">UI and graphics</th>
            </tr>
          </thead>
          <tbody>
            {required
              .filter((pair) => !failuresOnly || pair.exempt || !pair.aaNormal || !pair.nonText)
              .map((pair) => (
                <tr key={`${pair.fgKey}-${pair.bgKey}`}>
                  <th scope="row">
                    <button type="button" className="linkish" onClick={() => onSelect(pair)}>
                      {pair.purpose}
                    </button>
                  </th>
                  <td className="mono">{formatRatio(pair.ratio)}:1</td>
                  <Result pass={pair.aaNormal} exempt={pair.exempt} />
                  <Result pass={pair.aaLarge} exempt={pair.exempt} />
                  <Result pass={pair.aaaNormal} exempt={pair.exempt} />
                  <Result pass={pair.aaaLarge} exempt={pair.exempt} />
                  <Result pass={pair.nonText} exempt={pair.exempt} />
                </tr>
              ))}
          </tbody>
        </table>
      </div>
      {view === "brand" ? (
        <div className="matrix-toolbar">
          <div>
            <p aria-hidden="true">Brand contrast matrix. Rows are the foreground. Columns are the background.</p>
            <p className="fine-print">
              Hover a cell to see that foreground on that background. Click keeps the combo, and click again
              returns the plain cell.
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
        <table className={view === "brand" ? "matrix matrix-grid matrix-brand" : "matrix matrix-grid"}>
          <caption className={view === "brand" ? "sr-only" : undefined}>
            {view === "brand" ? "Brand" : view === "theme-light" ? "Light theme" : "Dark theme"}{" "}
            contrast matrix. Rows are the foreground. Columns are the background.
          </caption>
          <thead>
            <tr>
              <th scope="col">Foreground</th>
              {keys.map((key) => (
                <th key={key} scope="col">
                  {labelFor(snapshot, key)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {keys.map((fgKey) => (
              <tr key={fgKey}>
                <th scope="row">{labelFor(snapshot, fgKey)}</th>
                {keys.map((bgKey) => {
                  const pair = grid.find((item) => item.fgKey === fgKey && item.bgKey === bgKey);
                  if (!pair) return <td key={bgKey}>—</td>;
                  const quiet = failuresOnly && pair.nonText && pair.aaNormal && !pair.exempt;
                  const cellKey = `${pair.fgKey}:${pair.bgKey}`;
                  const selected = activeKey === `${pair.view}:${pair.fgKey}:${pair.bgKey}`;
                  const kept = view === "brand" && pinned.includes(cellKey);
                  return (
                    <td key={bgKey}>
                      <button
                        type="button"
                        className={["cell", selected ? "cell-active" : "", kept ? "cell-combo" : ""]
                          .filter(Boolean)
                          .join(" ")}
                        style={
                          view === "brand"
                            ? ({ "--cell-fg": pair.fgHex, "--cell-bg": pair.bgHex } as CSSProperties)
                            : undefined
                        }
                        aria-pressed={view === "brand" ? kept : selected}
                        aria-label={`${pair.purpose}. ${formatRatio(pair.ratio)} to 1. ${pair.exempt ? "Exempt" : pairWord(pair)}. AA normal ${pair.aaNormal ? "pass" : "fail"}. AA large ${pair.aaLarge ? "pass" : "fail"}. AAA normal ${pair.aaaNormal ? "pass" : "fail"}. AAA large ${pair.aaaLarge ? "pass" : "fail"}. UI ${pair.nonText ? "pass" : "fail"}.${selected ? " Shown in the contrast badges." : ""}${view === "brand" ? (kept ? " Color combo is kept on this cell." : " Color combo is plain.") : ""}`}
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
                        {quiet ? (
                          <span className="cell-quiet">Pass</span>
                        ) : (
                          <>
                            <span className="mono">{formatRatio(pair.ratio)}</span>
                            <span>{pair.exempt ? "Exempt" : pairWord(pair)}</span>
                          </>
                        )}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {view === "brand" ? (
        <SaveDialog
          open={saveOpen}
          title="Save Brand Contrast Matrix to Project"
          note="The Brand Contrast Matrix will be saved with the user-selected combos."
          demoSrc="/brand-matrix-save.gif"
          demoAlt="Walkthrough of the brand contrast matrix. Eight cells are clicked and each one stays filled with that intersection's foreground color on its background color. Then + Save opens Save Brand Contrast Matrix to Project."
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

function Result({ pass, exempt }: { pass: boolean; exempt: boolean }) {
  return <td>{exempt ? "Exempt" : pass ? "Pass" : "Fail"}</td>;
}
