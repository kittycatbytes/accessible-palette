"use client";

import { useEffect, useId, useRef, useState } from "react";
import {
  historyRows,
  saveToFavorites,
  saveToNewProject,
  saveToProject,
  type PaletteLibrary,
  type SavedPlace,
} from "@/lib/library";
import { SaveDialog } from "./save-dialog";

export function ComboHistory({
  colors,
  paletteName,
  library,
  localOnly,
  onApply,
  onRename,
  onLibrary,
  onSaved,
}: {
  colors: string[];
  paletteName: string;
  library: PaletteLibrary;
  localOnly: boolean;
  onApply: (colors: string[], name: string) => void;
  onRename: (colors: string[], name: string) => void;
  onLibrary: (library: PaletteLibrary) => void;
  onSaved: (place: SavedPlace) => void;
}) {
  const [open, setOpen] = useState(false);
  const [saveOpen, setSaveOpen] = useState(false);
  const [draft, setDraft] = useState<string[]>([]);
  const [draftName, setDraftName] = useState("");
  const openerRef = useRef<HTMLButtonElement | null>(null);
  const listId = useId();
  const rows = historyRows(colors, library.history, paletteName);

  function openModal(combo: string[], name: string, button: HTMLButtonElement) {
    openerRef.current = button;
    setDraft(combo);
    setDraftName(name);
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
                onClick={() => onApply(row.colors, row.name ?? "")}
                aria-label={
                  index === 0
                    ? `Current palette${row.name ? `, ${row.name}` : ""}, ${row.colors.join(", ")}`
                    : `Use palette${row.name ? ` ${row.name}` : ""}, ${row.colors.join(", ")}`
                }
              >
                <ComboDots colors={row.colors} />
              </button>
              <PaletteName name={row.name} onCommit={(name) => onRename(row.colors, name)} />
              <button
                type="button"
                className="button button-ghost combo-save"
                onClick={(event) => openModal(row.colors, row.name ?? "", event.currentTarget)}
              >
                <span aria-hidden="true">+</span>
                Save
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      <SaveDialog
        open={saveOpen}
        title="Save to Favorites"
        paletteName={draftName}
        library={library}
        localOnly={localOnly}
        onDismiss={closeModal}
        onSubmit={({ destination, projectName, projectId, paletteName: nextName }) => {
          const result =
            destination === "favorites"
              ? saveToFavorites(library, draft, nextName)
              : destination === "new"
                ? saveToNewProject(library, draft, projectName, nextName)
                : saveToProject(library, draft, projectId, nextName);
          if (!result.ok) return result.message;
          onLibrary(result.library);
          onRename(draft, nextName);
          onSaved(result.place);
          return null;
        }}
      >
        <ComboDots colors={draft} />
      </SaveDialog>
    </div>
  );
}

function PaletteName({ name, onCommit }: { name?: string; onCommit: (name: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(name ?? "");
  const cancelRef = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const label = name?.trim() ? name : "Unnamed";

  useEffect(() => {
    if (!editing) setDraft(name ?? "");
  }, [editing, name]);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  if (editing) {
    return (
      <input
        ref={inputRef}
        className="combo-name-input"
        aria-label="Palette name"
        value={draft}
        maxLength={80}
        placeholder="Unnamed"
        onChange={(event) => setDraft(event.target.value)}
        onBlur={() => {
          const cancel = cancelRef.current;
          cancelRef.current = false;
          setEditing(false);
          if (!cancel) onCommit(draft);
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter") event.currentTarget.blur();
          if (event.key === "Escape") {
            cancelRef.current = true;
            setDraft(name ?? "");
            event.currentTarget.blur();
          }
        }}
      />
    );
  }

  return (
    <button type="button" className={name?.trim() ? "combo-name" : "combo-name is-empty"} onClick={() => setEditing(true)}>
      {label}
      <span className="sr-only">. Rename palette.</span>
    </button>
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
