"use client";

import { useState } from "react";
import type { Snapshot } from "@/lib/types";

export type SavedVersion = {
  id: string;
  name: string;
  createdAt: string;
  config: Snapshot;
  exports: { id: string; format: string; filename: string }[];
};

export type SavedPalette = {
  id: string;
  name: string;
  updatedAt: string;
  versions: SavedVersion[];
};

export function HistoryPanel({
  signedIn,
  palettes,
  paletteId,
  paletteName,
  versionName,
  onPaletteName,
  onVersionName,
  onSave,
  onRestore,
  onNew,
  busy,
}: {
  signedIn: boolean;
  palettes: SavedPalette[];
  paletteId?: string;
  paletteName: string;
  versionName: string;
  onPaletteName: (value: string) => void;
  onVersionName: (value: string) => void;
  onSave: () => void;
  onRestore: (palette: SavedPalette, version: SavedVersion) => void;
  onNew: () => void;
  busy: boolean;
}) {
  const [first, setFirst] = useState("");
  const [second, setSecond] = useState("");
  const [changes, setChanges] = useState<
    { purpose: string; view: string; ratio_a: number; ratio_b: number; aa_a: boolean; aa_b: boolean }[]
  >([]);
  const [compareMessage, setCompareMessage] = useState("");
  const versions = palettes.flatMap((palette) =>
    palette.versions.map((version) => ({ ...version, paletteName: palette.name, palette })),
  );

  async function compare() {
    setCompareMessage("");
    const response = await fetch(`/api/versions/compare?a=${first}&b=${second}`);
    const data = await response.json();
    if (!response.ok) {
      setChanges([]);
      setCompareMessage(data.message ?? "Choose two saved versions.");
      return;
    }
    setChanges(data.changes);
    setCompareMessage(
      data.changes.length
        ? `${data.changes.length} required checks differ.`
        : "No required check changed by more than 0.05.",
    );
  }

  return (
    <div className="stack">
      <div className="form-grid">
        <div className="field">
          <label htmlFor="palette-name">Palette name</label>
          <input
            id="palette-name"
            value={paletteName}
            maxLength={80}
            onChange={(event) => onPaletteName(event.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="version-name">Version name</label>
          <input
            id="version-name"
            value={versionName}
            maxLength={80}
            onChange={(event) => onVersionName(event.target.value)}
          />
        </div>
      </div>
      <div className="tool-row">
        <button type="button" className="button" onClick={onSave} disabled={busy || !signedIn}>
          {signedIn ? "Save version" : "Sign in to save"}
        </button>
        <button type="button" className="button button-ghost" onClick={onNew}>
          New palette
        </button>
      </div>
      {!signedIn ? (
        <p>The palette on this page stays in the browser until you sign in and save a version.</p>
      ) : null}
      {palettes.length ? (
        <ul className="version-list">
          {palettes.map((palette) => (
            <li key={palette.id}>
              <h3>
                {palette.name}
                {palette.id === paletteId ? " · current" : ""}
              </h3>
              <ul>
                {palette.versions.map((version) => (
                  <li key={version.id} className="version-row">
                    <span>
                      <strong>{version.name}</strong>
                      <span className="fine-print"> {formatWhen(version.createdAt)}</span>
                    </span>
                    <span className="tool-row">
                      <button
                        type="button"
                        className="button button-ghost"
                        onClick={() => onRestore(palette, version)}
                      >
                        Restore
                      </button>
                      {version.exports.map((file) => (
                        <a key={file.id} className="button button-ghost" href={`/api/exports/${file.id}`}>
                          {file.format}
                        </a>
                      ))}
                    </span>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      ) : signedIn ? (
        <p>No saved versions yet.</p>
      ) : null}
      {versions.length > 1 ? (
        <div className="stack">
          <h3>Compare versions</h3>
          <div className="form-grid">
            <div className="field">
              <label htmlFor="compare-a">First version</label>
              <select id="compare-a" value={first} onChange={(event) => setFirst(event.target.value)}>
                <option value="">Choose</option>
                {versions.map((version) => (
                  <option key={version.id} value={version.id}>
                    {version.paletteName} · {version.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="compare-b">Second version</label>
              <select id="compare-b" value={second} onChange={(event) => setSecond(event.target.value)}>
                <option value="">Choose</option>
                {versions.map((version) => (
                  <option key={version.id} value={version.id}>
                    {version.paletteName} · {version.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <button type="button" className="button" onClick={compare} disabled={!first || !second || first === second}>
            Compare
          </button>
          <p aria-live="polite">{compareMessage}</p>
          {changes.length ? (
            <div className="matrix-scroll" tabIndex={0}>
              <table className="matrix">
                <caption>Required checks that differ</caption>
                <thead>
                  <tr>
                    <th scope="col">Check</th>
                    <th scope="col">First ratio</th>
                    <th scope="col">First AA text</th>
                    <th scope="col">Second ratio</th>
                    <th scope="col">Second AA text</th>
                  </tr>
                </thead>
                <tbody>
                  {changes.map((change) => (
                    <tr key={`${change.view}-${change.purpose}`}>
                      <th scope="row">
                        {change.view}: {change.purpose}
                      </th>
                      <td>{Number(change.ratio_a).toFixed(2)}:1</td>
                      <td>{change.aa_a ? "Pass" : "Fail"}</td>
                      <td>{Number(change.ratio_b).toFixed(2)}:1</td>
                      <td>{change.aa_b ? "Pass" : "Fail"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function formatWhen(value: string): string {
  return `${new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value))} ET`;
}
