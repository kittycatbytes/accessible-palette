"use client";

import { useState } from "react";
import { buildExports, triggerDownload } from "@/lib/export";
import type { Snapshot } from "@/lib/types";

const LABELS: Record<string, string> = {
  css: "CSS variables",
  scss: "SCSS variables",
  json: "JSON",
  hex: "Hex list",
  tailwind: "Tailwind v4 theme",
  dtcg: "W3C design tokens",
  ase: "Adobe swatch (.ase)",
};

export function ExportPanel({ snapshot, paletteName }: { snapshot: Snapshot; paletteName: string }) {
  const [message, setMessage] = useState("");
  const files = buildExports(snapshot, paletteName || "palette");
  return (
    <div className="stack">
      <p>
        Copy a snippet here, or save a named version to keep these files on your account. The design
        token file uses the DTCG color type with sRGB components and a hex fallback.
      </p>
      <ul className="export-grid">
        {files.map((file) => (
          <li key={file.format}>
            <span>{LABELS[file.format]}</span>
            <span className="tool-row">
              {file.format === "ase" ? null : (
                <button
                  type="button"
                  className="button button-ghost"
                  onClick={async () => {
                    await navigator.clipboard.writeText(file.body);
                    setMessage(`Copied ${LABELS[file.format]}.`);
                  }}
                >
                  Copy
                </button>
              )}
              <button type="button" className="button" onClick={() => triggerDownload(file)}>
                Download
              </button>
            </span>
          </li>
        ))}
      </ul>
      <p aria-live="polite">{message}</p>
    </div>
  );
}
