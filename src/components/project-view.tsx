"use client";

import { useEffect, useId, useRef, useState } from "react";
import { downloadText } from "@/lib/export";
import {
  EMPTY_LIBRARY,
  LIBRARY_STORAGE_KEY,
  matrixBlocks,
  matrixStylesheet,
  parseLibrary,
  renameProject,
  type ColorCombo,
  type PaletteLibrary,
  type PaletteProject,
  type SavedMatrix,
  type SavedTemplate,
} from "@/lib/library";
import { PencilIcon } from "./icons";
import { persistLibrary, SiteHeader } from "./site-header";

type ReadyProject = {
  title: string;
  fileBase: string;
  entries: ColorCombo[];
  matrices: SavedMatrix[];
  templates: SavedTemplate[];
};

type View =
  | { status: "loading" }
  | { status: "missing" }
  | { status: "empty"; title: string }
  | ({ status: "ready" } & ReadyProject);

function readStore(store: Storage): PaletteLibrary | null {
  try {
    return parseLibrary(JSON.parse(store.getItem(LIBRARY_STORAGE_KEY) || "null"));
  } catch {
    return null;
  }
}

function combineLibraries(cache: PaletteLibrary | null, remote: PaletteLibrary | null): PaletteLibrary {
  if (!cache) return remote ?? EMPTY_LIBRARY;
  if (!remote) return cache;
  const ids = [
    ...remote.projects.map((project) => project.id),
    ...cache.projects.map((project) => project.id).filter((id) => !remote.projects.some((project) => project.id === id)),
  ];
  const favoriteScore = (source: PaletteLibrary) =>
    score(source.favorites.length, source.matrices.length, source.templates.length);
  const favoritesFrom = favoriteScore(cache) >= favoriteScore(remote) ? cache : remote;
  const history = cache.history.length >= remote.history.length ? cache.history : remote.history;
  return {
    history,
    favorites: favoritesFrom.favorites,
    matrices: favoritesFrom.matrices,
    templates: favoritesFrom.templates,
    projects: ids.map((id) => {
      return (
        richer(
          cache.projects.find((project) => project.id === id) ?? null,
          remote.projects.find((project) => project.id === id) ?? null,
        ) ?? cache.projects.find((project) => project.id === id)!
      );
    }),
  };
}

function cachedLibrary(): PaletteLibrary | null {
  return readStore(sessionStorage) ?? readStore(localStorage);
}

function fileSlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "project";
}

function assetHeading(label: string, index: number, total: number): string {
  return total > 1 && index > 0 ? `${label} ${index + 1}` : label;
}

function score(entries: number, matrices: number, templates = 0): number {
  return entries + matrices + templates;
}

function richer(left: PaletteProject | null, right: PaletteProject | null): PaletteProject | null {
  if (!left) return right;
  if (!right) return left;
  return score(left.entries.length, left.matrices.length, left.templates.length) >=
    score(right.entries.length, right.matrices.length, right.templates.length)
    ? left
    : right;
}

function choose(projectId: string, cache: PaletteLibrary | null, remote: PaletteLibrary | null): View {
  if (projectId === "favorites") {
    const cacheScore = cache ? score(cache.favorites.length, cache.matrices.length, cache.templates.length) : -1;
    const remoteScore = remote ? score(remote.favorites.length, remote.matrices.length, remote.templates.length) : -1;
    const source = cacheScore >= remoteScore ? cache : remote;
    if (!source || score(source.favorites.length, source.matrices.length, source.templates.length) === 0) {
      return { status: "empty", title: "Favorites" };
    }
    return {
      status: "ready",
      title: "Favorites",
      fileBase: "favorites",
      entries: source.favorites,
      matrices: source.matrices,
      templates: source.templates,
    };
  }

  const chosen = richer(
    cache?.projects.find((project) => project.id === projectId) ?? null,
    remote?.projects.find((project) => project.id === projectId) ?? null,
  );
  if (!chosen) return { status: "missing" };
  if (score(chosen.entries.length, chosen.matrices.length, chosen.templates.length) === 0) {
    return { status: "empty", title: chosen.name };
  }
  return {
    status: "ready",
    title: chosen.name,
    fileBase: fileSlug(chosen.name),
    entries: chosen.entries,
    matrices: chosen.matrices,
    templates: chosen.templates,
  };
}

export function ProjectView({ projectId }: { projectId: string }) {
  const [view, setView] = useState<View>({ status: "loading" });
  const [library, setLibrary] = useState<PaletteLibrary>(EMPTY_LIBRARY);
  const [editing, setEditing] = useState(false);
  const [exportNotice, setExportNotice] = useState(false);
  const exportRef = useRef<HTMLDialogElement>(null);
  const [draft, setDraft] = useState("");
  const [renameError, setRenameError] = useState("");
  const nameRef = useRef<HTMLInputElement>(null);
  const skipBlur = useRef(false);
  const edited = useRef(false);
  const libraryRef = useRef(library);
  const signedInRef = useRef(false);
  libraryRef.current = library;

  useEffect(() => {
    const dialog = exportRef.current;
    if (!dialog) return;
    if (exportNotice && !dialog.open) dialog.showModal();
    if (!exportNotice && dialog.open) dialog.close();
  }, [exportNotice]);

  useEffect(() => {
    let cancelled = false;
    const cache = cachedLibrary();
    const cachedView = choose(projectId, cache, null);
    const cacheHasAnswer =
      cachedView.status === "ready" ||
      (projectId === "favorites" ? cache !== null : cache?.projects.some((project) => project.id === projectId) === true);
    if (cache) setLibrary(cache);
    setView(cacheHasAnswer ? cachedView : { status: "loading" });
    async function load() {
      let remote: PaletteLibrary | null = null;
      let user = false;
      try {
        const session = await fetch("/api/session").then((response) => response.json());
        user = Boolean(session?.user);
      } catch {
        user = false;
      }
      if (user) {
        try {
          const response = await fetch("/api/library");
          if (response.ok) {
            const data = (await response.json()) as { library?: unknown };
            remote = parseLibrary(data.library);
          }
        } catch {
          remote = null;
        }
      }
      if (cancelled) return;
      signedInRef.current = user;
      if (edited.current) {
        if (user) persistLibrary(libraryRef.current, true);
        return;
      }
      const combined = combineLibraries(cache, remote);
      setLibrary(combined);
      setView(choose(projectId, combined, null));
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  useEffect(() => {
    if (editing) nameRef.current?.focus();
  }, [editing]);

  const title = view.status === "loading" ? "Saved assets" : view.status === "missing" ? "Project" : view.title;
  const canRename = projectId !== "favorites" && (view.status === "ready" || view.status === "empty");

  function commitLibrary(next: PaletteLibrary) {
    edited.current = true;
    libraryRef.current = next;
    setLibrary(next);
    setView(choose(projectId, next, null));
    persistLibrary(next, signedInRef.current);
  }

  function saveName() {
    const result = renameProject(library, projectId, draft);
    if (!result.ok) {
      setRenameError(result.message);
      return;
    }
    setRenameError("");
    setEditing(false);
    commitLibrary(result.library);
  }

  return (
    <>
      <SiteHeader projects={library.projects} />
      <main className="shell page-shell">
        <div className="project-heading">
          <div className="project-title">
            {editing ? (
              <input
                ref={nameRef}
                className="project-name-input"
                aria-label="Project name"
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    saveName();
                  }
                  if (event.key === "Escape") {
                    skipBlur.current = true;
                    setEditing(false);
                    setRenameError("");
                  }
                }}
                onBlur={() => {
                  if (skipBlur.current) {
                    skipBlur.current = false;
                    return;
                  }
                  saveName();
                }}
              />
            ) : (
              <h1>{title}</h1>
            )}
            {canRename && !editing ? (
              <button
                type="button"
                className="icon-button"
                aria-label="Rename project"
                onClick={() => {
                  setDraft(title);
                  setRenameError("");
                  setEditing(true);
                }}
              >
                <PencilIcon />
              </button>
            ) : null}
          </div>
          {projectId !== "favorites" ? <ProjectSwitcher projects={library.projects} currentId={projectId} /> : null}
        </div>
        {renameError ? (
          <p className="fine-print" role="status">
            {renameError}
          </p>
        ) : null}
        {view.status === "loading" ? <p>Loading saved assets.</p> : null}
        {view.status === "missing" ? (
          <p>
            That project is not in this browser. <a href="/">Back to the palette</a>.
          </p>
        ) : null}
        {view.status === "empty" ? (
          <p>
            {view.title === "Favorites"
              ? "Nothing is saved in Favorites yet."
              : "Nothing is saved in this project yet."}
          </p>
        ) : null}
        {view.status === "ready" ? (
          <div className="asset-list">
            {view.entries.map((entry, index) => (
              <section key={entry.id} className="asset-section" aria-labelledby={`palette-${entry.id}`}>
                <h2 id={`palette-${entry.id}`}>
                  {entry.name || assetHeading("Palette", index, view.entries.length)}
                </h2>
                <span className="combo-dots" aria-hidden="true">
                  {entry.colors.map((hex, colorIndex) => (
                    <span key={`${hex}-${colorIndex}`} className="combo-dot" style={{ backgroundColor: hex }} />
                  ))}
                </span>
                <p className="mono">{entry.colors.join(" ")}</p>
              </section>
            ))}
            {view.matrices.map((matrix, index) => {
              const blocks = matrixBlocks(matrix);
              const filename = index === 0 ? `${view.fileBase}-matrix.css` : `${view.fileBase}-matrix-${index + 1}.css`;
              return (
                <section key={matrix.id} className="asset-section" aria-labelledby={`matrix-${matrix.id}`}>
                  <div className="asset-head">
                    <h2 id={`matrix-${matrix.id}`}>
                      {assetHeading("Brand contrast matrix", index, view.matrices.length)}
                    </h2>
                    <button
                      type="button"
                      className="button"
                      onClick={() => downloadText(filename, matrixStylesheet(matrix), "text/css")}
                    >
                      Export
                    </button>
                  </div>
                  <ul className="matrix-blocks">
                    {blocks.map((block) => (
                      <li key={`${block.className}-${block.combo.fgHex}-${block.combo.bgHex}`} className="matrix-block">
                        <span
                          className="matrix-chip"
                          style={{ color: block.combo.fgHex, backgroundColor: block.combo.bgHex }}
                          aria-hidden="true"
                        >
                          Aa
                        </span>
                        <code className="mono">.{block.className}</code>
                        <span>{block.combo.purpose}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              );
            })}
            {view.templates.length ? (
              <section className="asset-section" aria-labelledby="project-templates">
                <h2 id="project-templates">Templates</h2>
                <ul className="template-list">
                  {view.templates.map((template) => (
                    <li key={template.id} className="template-row">
                      <span>{template.name}</span>
                      <button type="button" className="button" onClick={() => setExportNotice(true)}>
                        Export HTML/CSS
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
          </div>
        ) : null}
        <dialog
          ref={exportRef}
          className="modal"
          aria-labelledby="template-export-title"
          onClose={() => setExportNotice(false)}
        >
          <h2 id="template-export-title">Export HTML/CSS</h2>
          <p>This feature is not implemented yet</p>
          <button type="button" className="button" onClick={() => setExportNotice(false)}>
            Close
          </button>
        </dialog>
      </main>
    </>
  );
}

function ProjectSwitcher({ projects, currentId }: { projects: PaletteProject[]; currentId: string }) {
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointer(event: PointerEvent) {
      if (!wrapRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const ordered = [...projects].reverse();

  return (
    <div className="project-switch" ref={wrapRef}>
      <button
        type="button"
        className="button button-ghost"
        aria-haspopup="true"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((value) => !value)}
      >
        Projects
        <Caret />
      </button>
      {open ? (
        <div className="project-switch-panel" id={menuId} role="menu" aria-label="Projects">
          {ordered.length === 0 ? <p className="fine-print">No other projects yet.</p> : null}
          {ordered.map((project) => (
            <a
              key={project.id}
              role="menuitem"
              href={`/projects/${project.id}`}
              aria-current={project.id === currentId ? "page" : undefined}
              onClick={() => setOpen(false)}
            >
              {project.name}
            </a>
          ))}
          <a role="menuitem" href="/projects" onClick={() => setOpen(false)}>
            See all projects
          </a>
        </div>
      ) : null}
    </div>
  );
}

function Caret() {
  return (
    <svg className="icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M6.5 9.5 12 15l5.5-5.5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
