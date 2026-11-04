"use client";

import { useId, useRef, useState } from "react";
import {
  historyRows,
  saveToFavorites,
  saveToNewProject,
  saveToProject,
  type PaletteLibrary,
} from "@/lib/library";
import { SaveDialog } from "./save-dialog";

export function ComboHistory({
  colors,
  library,
  localOnly,
  onApply,
  onLibrary,
}: {
  colors: string[];
  library: PaletteLibrary;
  localOnly: boolean;
  onApply: (colors: string[]) => void;
  onLibrary: (library: PaletteLibrary) => void;
}) {
  const [open, setOpen] = useState(false);
  const [saveOpen, setSaveOpen] = useState(false);
  const [draft, setDraft] = useState<string[]>([]);
  const openerRef = useRef<HTMLButtonElement | null>(null);
  const listId = useId();
  const rows = historyRows(colors, library.history);

  function openModal(combo: string[], button: HTMLButtonElement) {
    openerRef.current = button;
    setDraft(combo);
    setSaveOpen(true);
  }

  function closeModal() {
    setSaveOpen(false);
    openerRef.current?.focus();
  }

  return (
    <div className="combo-history">
      <div className="combo-history-bar">
        <button
          type="button"
          className="combo-history-toggle"
          aria-expanded={open}
          aria-controls={listId}
          onClick={() => setOpen((value) => !value)}
        >
          <svg className={open ? "chevron chevron-up" : "chevron"} viewBox="0 0 24 24" aria-hidden="true">
            <path
              d="M6 9.5 12 15.5 18 9.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span>History</span>
        </button>
        <ComboDots colors={colors} />
      </div>
      {open ? (
        <ul id={listId} className="combo-history-list">
          {rows.map((row, index) => (
            <li key={row.id} className="combo-history-row">
              <button
                type="button"
                className="combo-history-apply"
                onClick={() => onApply(row.colors)}
                aria-label={
                  index === 0
                    ? `Current palette, ${row.colors.join(", ")}`
                    : `Use palette ${row.colors.join(", ")}`
                }
              >
                <ComboDots colors={row.colors} />
              </button>
              <button
                type="button"
                className="button button-ghost combo-save"
                onClick={(event) => openModal(row.colors, event.currentTarget)}
              >
                <span aria-hidden="true">+</span>
                Save to Favorites
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      <SaveDialog
        open={saveOpen}
        title="Save to Favorites"
        library={library}
        localOnly={localOnly}
        onDismiss={closeModal}
        onSubmit={({ destination, projectName, projectId }) => {
          const result =
            destination === "favorites"
              ? saveToFavorites(library, draft)
              : destination === "new"
                ? saveToNewProject(library, draft, projectName)
                : saveToProject(library, draft, projectId);
          if (!result.ok) return result.message;
          onLibrary(result.library);
          return null;
        }}
      >
        <ComboDots colors={draft} />
      </SaveDialog>
    </div>
  );
}

function ComboDots({ colors }: { colors: string[] }) {
  return (
    <span className="combo-dots" aria-hidden="true">
      {colors.map((hex, index) => (
        <span key={`${hex}-${index}`} className="combo-dot" style={{ backgroundColor: hex }} />
      ))}
    </span>
  );
}
