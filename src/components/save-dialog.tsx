"use client";

import { useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from "react";
import type { PaletteLibrary } from "@/lib/library";

export type SaveDestination = "favorites" | "new" | "existing";

export function SaveDialog({
  open,
  title,
  note,
  demoSrc,
  demoAlt,
  library,
  localOnly,
  paletteName,
  onDismiss,
  onSubmit,
  children,
}: {
  open: boolean;
  title: string;
  note?: string;
  demoSrc?: string;
  demoAlt?: string;
  library: PaletteLibrary;
  localOnly: boolean;
  paletteName?: string;
  onDismiss: () => void;
  onSubmit: (choice: {
    destination: SaveDestination;
    projectName: string;
    projectId: string;
    paletteName: string;
  }) => string | null;
  children?: ReactNode;
}) {
  const [destination, setDestination] = useState<SaveDestination>("favorites");
  const [projectName, setProjectName] = useState("");
  const [projectId, setProjectId] = useState("");
  const [assetName, setAssetName] = useState("");
  const [message, setMessage] = useState("");
  const dialogRef = useRef<HTMLDialogElement>(null);
  const projectsRef = useRef(library.projects);
  const titleId = useId();
  const nameId = useId();
  const paletteNameId = useId();
  const projectSelectId = useId();
  const incomingName = useRef(paletteName);
  incomingName.current = paletteName;
  const radioName = useId();
  projectsRef.current = library.projects;

  useEffect(() => {
    if (!open) return;
    setDestination("favorites");
    setProjectName("");
    setProjectId(projectsRef.current[0]?.id ?? "");
    setAssetName(incomingName.current ?? "");
    setMessage("");
  }, [open]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
  }, [open]);

  function requestClose() {
    const dialog = dialogRef.current;
    if (dialog?.open) dialog.close();
    else onDismiss();
  }

  function save(event: FormEvent) {
    event.preventDefault();
    const error = onSubmit({ destination, projectName, projectId, paletteName: assetName });
    if (error) {
      setMessage(error);
      return;
    }
    requestClose();
  }

  return (
    <dialog
      ref={dialogRef}
      className={demoSrc ? "modal modal-wide" : "modal"}
      aria-labelledby={titleId}
      onClose={onDismiss}
    >
      <form onSubmit={save}>
        <h2 id={titleId}>{title}</h2>
        {note ? <p className="modal-note">{note}</p> : null}
        {demoSrc ? (
          <img className="modal-demo" src={demoSrc} alt={demoAlt ?? ""} width={1180} height={820} />
        ) : null}
        {children}
        {paletteName !== undefined ? (
          <div className="field">
            <label htmlFor={paletteNameId}>Palette name</label>
            <input
              id={paletteNameId}
              value={assetName}
              maxLength={80}
              placeholder="Unnamed"
              onChange={(event) => setAssetName(event.target.value)}
            />
          </div>
        ) : null}
        <fieldset>
          <legend>Where should this palette go?</legend>
          <label className="check">
            <input
              type="radio"
              name={radioName}
              value="favorites"
              checked={destination === "favorites"}
              onChange={() => setDestination("favorites")}
            />
            <span>Save to Favorites</span>
          </label>
          <label className="check">
            <input
              type="radio"
              name={radioName}
              value="new"
              checked={destination === "new"}
              onChange={() => setDestination("new")}
            />
            <span>Create a new project</span>
          </label>
          {destination === "new" ? (
            <div className="field">
              <label htmlFor={nameId}>Project name</label>
              <input
                id={nameId}
                value={projectName}
                maxLength={80}
                onChange={(event) => setProjectName(event.target.value)}
              />
            </div>
          ) : null}
          <label className="check">
            <input
              type="radio"
              name={radioName}
              value="existing"
              checked={destination === "existing"}
              disabled={library.projects.length === 0}
              onChange={() => setDestination("existing")}
            />
            <span>Save to an existing project</span>
          </label>
          {destination === "existing" ? (
            <div className="field">
              <label htmlFor={projectSelectId}>Project</label>
              <select
                id={projectSelectId}
                value={projectId}
                onChange={(event) => setProjectId(event.target.value)}
              >
                {library.projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
          {library.projects.length === 0 ? (
            <p className="fine-print">Create a project before the existing-project choice is available.</p>
          ) : null}
        </fieldset>
        {localOnly ? (
          <p className="modal-warning" role="status">
            Projects and palette history stay in this browser until you sign in. They may not remain if you
            clear this site&apos;s data or open the app on another device.
          </p>
        ) : null}
        <p aria-live="polite">{message}</p>
        <div className="tool-row">
          <button type="submit" className="button">
            Save
          </button>
          <button type="button" className="button button-ghost" onClick={requestClose}>
            Cancel
          </button>
        </div>
      </form>
    </dialog>
  );
}
