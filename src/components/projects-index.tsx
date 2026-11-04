"use client";

import { useEffect, useState } from "react";
import { EMPTY_LIBRARY, parseLibrary, type PaletteLibrary } from "@/lib/library";
import { readStoredLibrary, SiteHeader } from "./site-header";

export function ProjectsIndex() {
  const [library, setLibrary] = useState<PaletteLibrary>(EMPTY_LIBRARY);

  useEffect(() => {
    let cancelled = false;
    setLibrary(readStoredLibrary());
    async function load() {
      try {
        const session = await fetch("/api/session").then((response) => response.json());
        if (!session?.user) return;
        const response = await fetch("/api/library");
        if (!response.ok) return;
        const data = (await response.json()) as { library?: unknown };
        const next = parseLibrary(data.library);
        if (!cancelled && next) setLibrary(next);
      } catch {
        // The stored copy stays on screen.
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const projects = [...library.projects].reverse();

  return (
    <>
      <SiteHeader projects={library.projects} />
      <main className="shell page-shell">
        <h1>Projects</h1>
        {projects.length === 0 ? (
          <p>
            No projects yet. <a href="/">Back to the palette</a>.
          </p>
        ) : (
          <ul className="project-index">
            {projects.map((project) => (
              <li key={project.id}>
                <a href={`/projects/${project.id}`}>{project.name}</a>
                <span className="fine-print">
                  {project.entries.length} {project.entries.length === 1 ? "palette" : "palettes"}
                  {" · "}
                  {project.matrices.length} {project.matrices.length === 1 ? "matrix" : "matrices"}
                  {" · "}
                  {project.templates.length} {project.templates.length === 1 ? "template" : "templates"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </main>
    </>
  );
}
