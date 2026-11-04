"use client";

import { useEffect, useState } from "react";
import { downloadText } from "@/lib/export";
import {
  LIBRARY_STORAGE_KEY,
  matrixBlocks,
  matrixStylesheet,
  parseLibrary,
  type ColorCombo,
  type PaletteLibrary,
  type PaletteProject,
  type SavedMatrix,
} from "@/lib/library";

type ReadyProject = {
  title: string;
  fileBase: string;
  entries: ColorCombo[];
  matrices: SavedMatrix[];
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

function cachedLibrary(): PaletteLibrary | null {
  return readStore(sessionStorage) ?? readStore(localStorage);
}

function fileSlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "project";
}

function assetHeading(label: string, index: number, total: number): string {
  return total > 1 && index > 0 ? `${label} ${index + 1}` : label;
}

function score(entries: number, matrices: number): number {
  return entries + matrices;
}

function richer(left: PaletteProject | null, right: PaletteProject | null): PaletteProject | null {
  if (!left) return right;
  if (!right) return left;
  return score(left.entries.length, left.matrices.length) >= score(right.entries.length, right.matrices.length)
    ? left
    : right;
}

function choose(projectId: string, cache: PaletteLibrary | null, remote: PaletteLibrary | null): View {
  if (projectId === "favorites") {
    const cacheScore = cache ? score(cache.favorites.length, cache.matrices.length) : -1;
    const remoteScore = remote ? score(remote.favorites.length, remote.matrices.length) : -1;
    const source = cacheScore >= remoteScore ? cache : remote;
    if (!source || score(source.favorites.length, source.matrices.length) === 0) {
      return { status: "empty", title: "Favorites" };
    }
    return {
      status: "ready",
      title: "Favorites",
      fileBase: "favorites",
      entries: source.favorites,
      matrices: source.matrices,
    };
  }

  const chosen = richer(
    cache?.projects.find((project) => project.id === projectId) ?? null,
    remote?.projects.find((project) => project.id === projectId) ?? null,
  );
  if (!chosen) return { status: "missing" };
  if (score(chosen.entries.length, chosen.matrices.length) === 0) {
    return { status: "empty", title: chosen.name };
  }
  return {
    status: "ready",
    title: chosen.name,
    fileBase: fileSlug(chosen.name),
    entries: chosen.entries,
    matrices: chosen.matrices,
  };
}

export function ProjectView({ projectId }: { projectId: string }) {
  const [view, setView] = useState<View>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    const cache = cachedLibrary();
    const cachedView = choose(projectId, cache, null);
    const cacheHasAnswer =
      cachedView.status === "ready" ||
      (projectId === "favorites" ? cache !== null : cache?.projects.some((project) => project.id === projectId) === true);
    setView(cacheHasAnswer ? cachedView : { status: "loading" });
    async function load() {
      let remote: PaletteLibrary | null = null;
      try {
        const response = await fetch("/api/library");
        if (response.ok) {
          const data = (await response.json()) as { library?: unknown };
          remote = parseLibrary(data.library);
        }
      } catch {
        remote = null;
      }
      if (!cancelled) setView(choose(projectId, cache, remote));
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  const title = view.status === "loading" ? "Saved assets" : view.status === "missing" ? "Project" : view.title;

  return (
    <>
      <header className="app-header">
        <a className="brand-mark" href="/">
          <span className="brand-kicker">WCAG 2.2</span>
          <span>Accessible Palette</span>
        </a>
      </header>
      <main className="shell">
        <h1>{title}</h1>
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
                <h2 id={`palette-${entry.id}`}>{assetHeading("Palette", index, view.entries.length)}</h2>
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
          </div>
        ) : null}
      </main>
    </>
  );
}
