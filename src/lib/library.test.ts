import { describe, expect, it } from "vitest";
import {
  historyRows,
  parseLibrary,
  pushHistory,
  recentProjects,
  renameHistory,
  renameProject,
  matrixStylesheet,
  saveMatrixToFavorites,
  saveMatrixToNewProject,
  nextTemplateName,
  saveTemplateToFavorites,
  saveTemplateToProject,
  saveToFavorites,
  saveToNewProject,
  saveToProject,
  type PaletteLibrary,
} from "./library";

const harbor = ["#001223", "#0f6e6a", "#8a5a12", "#6d1c16", "#243140"];
const ink = ["#0c3d66", "#145c4a", "#8a5a12", "#6d1c16", "#243140"];

function library(history: string[][] = []): PaletteLibrary {
  return {
    history: history.map((colors, index) => ({ id: `h${index}`, colors })),
    favorites: [],
    projects: [],
    matrices: [],
    templates: [],
  };
}

const tide = [
  { fgHex: "#001223", bgHex: "#ffffff", purpose: "Color 1 on white" },
  { fgHex: "#0f6e6a", bgHex: "#001223", purpose: "Color 2 on Color 1" },
];

describe("palette library", () => {
  it("keeps a drag result once and ignores the same combo again", () => {
    const first = pushHistory(library(), harbor);
    const second = pushHistory(first, harbor.map((hex) => hex.toUpperCase()));
    expect(second.history).toHaveLength(1);
    expect(second.history[0].colors).toEqual(harbor);
  });

  it("puts the current combo first, then the four before it", () => {
    const stored = [ink, ["#111111", "#222222", "#333333"], ["#abcdef", "#123456", "#654321", "#0f0f0f", "#aaaaaa"]];
    const rows = historyRows(harbor, library(stored).history);
    expect(rows.map((row) => row.colors[0])).toEqual(["#001223", "#0c3d66", "#111111", "#abcdef"]);
    expect(rows[0].id).toBe("current");
  });

  it("keeps a palette name on the history row and on a saved copy", () => {
    const named = pushHistory(library(), harbor, "Harbor");
    expect(named.history[0].name).toBe("Harbor");
    const rows = historyRows(harbor, named.history, "");
    expect(rows[0].name).toBe("Harbor");
    const renamed = renameHistory(named, harbor, "  Tide  ");
    expect(renamed.history[0].name).toBe("Tide");
    expect(historyRows(harbor, renamed.history, "Tide")[0].name).toBe("Tide");
    expect(renameHistory(renamed, harbor, "   ").history[0].name).toBeUndefined();

    const favorites = saveToFavorites(library(), harbor, "Harbor");
    expect(favorites.ok).toBe(true);
    if (!favorites.ok) return;
    expect(favorites.library.favorites[0].name).toBe("Harbor");
    const created = saveToNewProject(library(), ink, "Brand", "Ledger");
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    expect(created.library.projects[0].entries[0].name).toBe("Ledger");
    const parsed = parseLibrary({
      history: [{ id: "a", colors: harbor, name: "Harbor" }],
      favorites: [{ id: "b", colors: ink }],
      projects: [],
    });
    expect(parsed?.history[0].name).toBe("Harbor");
    expect(parsed?.favorites[0].name).toBeUndefined();
  });

  it("saves favorites and projects without duplicating a combo", () => {
    const favorites = saveToFavorites(library(), harbor);
    expect(favorites.ok).toBe(true);
    if (!favorites.ok) return;
    expect(saveToFavorites(favorites.library, harbor).ok).toBe(false);

    const created = saveToNewProject(favorites.library, ink, "  Brand  ");
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    expect(created.library.projects[0].name).toBe("Brand");
    expect(created.place).toEqual({
      name: "Brand",
      href: `/projects/${created.library.projects[0].id}`,
      kind: "palette",
    });
    expect(saveToNewProject(created.library, harbor, "brand").ok).toBe(false);
    const renamed = renameProject(created.library, created.library.projects[0].id, "  Tide  ");
    expect(renamed.ok).toBe(true);
    if (!renamed.ok) return;
    expect(renamed.library.projects[0].name).toBe("Tide");
    expect(renameProject(renamed.library, renamed.library.projects[0].id, "tide").ok).toBe(true);
    const second = saveToNewProject(renamed.library, harbor, "Harbor");
    expect(second.ok).toBe(true);
    if (!second.ok) return;
    expect(renameProject(second.library, second.library.projects[1].id, "Tide").ok).toBe(false);
    expect(recentProjects(second.library.projects).map((project) => project.name)).toEqual(["Harbor", "Tide"]);

    const again = saveToProject(created.library, ink, created.library.projects[0].id);
    expect(again.ok).toBe(false);
  });

  it("rejects a stored library with a bad color", () => {
    expect(parseLibrary({ history: [{ id: "a", colors: ["red"] }], favorites: [], projects: [] })).toBeNull();
    const parsed = parseLibrary({
      history: [{ id: "a", colors: harbor }],
      favorites: [],
      projects: [{ id: "p", name: "Brand", entries: [] }],
    });
    expect(parsed?.projects[0].name).toBe("Brand");
    expect(parsed?.matrices).toEqual([]);
    expect(parsed?.templates).toEqual([]);
    expect(parsed?.projects[0].matrices).toEqual([]);
    expect(parsed?.projects[0].templates).toEqual([]);
  });

  it("numbers a repeated template and leaves the first copy unnumbered", () => {
    const label = "Northroom Reservation System";
    expect(nextTemplateName([], "northroom", "Harbor", label)).toBe("Northroom Reservation System Harbor");
    const first = saveTemplateToFavorites(library(), {
      name: "Northroom Reservation System Harbor",
      template: "northroom",
      page: "light",
      colors: harbor,
      paletteName: "Harbor",
    });
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    expect(nextTemplateName(first.library.templates, "northroom", "Harbor", label)).toBe(
      "Northroom Reservation System Harbor 1",
    );
    const second = saveTemplateToProject(
      first.library,
      {
        name: "Northroom Reservation System Harbor 1",
        template: "northroom",
        page: "dark",
        colors: harbor,
        paletteName: "Harbor",
      },
      "missing",
    );
    expect(second.ok).toBe(false);
    const created = saveToNewProject(first.library, ink, "Brand");
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    const saved = saveTemplateToProject(
      created.library,
      {
        name: "Ashline Metrics Dashboard Harbor",
        template: "ashline",
        page: "dark",
        colors: harbor,
        paletteName: "Harbor",
      },
      created.library.projects[0].id,
    );
    expect(saved.ok).toBe(true);
    if (!saved.ok) return;
    expect(saved.library.projects[0].templates[0].name).toBe("Ashline Metrics Dashboard Harbor");
    expect(saved.place.kind).toBe("template");
    expect(saveTemplateToFavorites(library(), { ...first.library.templates[0], name: "   ", page: "light" }).ok).toBe(false);
  });

  it("saves a brand matrix with the selected color combos", () => {
    const favorites = saveMatrixToFavorites(library(), harbor, tide);
    expect(favorites.ok).toBe(true);
    if (!favorites.ok) return;
    expect(favorites.library.matrices[0].combos).toEqual(tide);
    expect(saveMatrixToFavorites(favorites.library, harbor, tide).ok).toBe(false);

    const created = saveMatrixToNewProject(library(), harbor, tide, "Harbor matrix");
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    expect(created.library.projects[0].matrices[0].combos).toHaveLength(2);
    expect(created.library.projects[0].entries).toEqual([]);
    expect(saveMatrixToFavorites(library(), harbor, []).ok).toBe(false);
    expect(created.place.href.startsWith("/projects/")).toBe(true);
    expect(created.place.kind).toBe("matrix");
  });

  it("names stylesheet classes from the selected matrix blocks", () => {
    const saved = saveMatrixToFavorites(library(), harbor, tide);
    expect(saved.ok).toBe(true);
    if (!saved.ok) return;
    const css = matrixStylesheet(saved.library.matrices[0]);
    expect(css).toContain(".color-1-on-white");
    expect(css).toContain("color: #001223;");
    expect(css).toContain("background-color: #ffffff;");
    expect(css).toContain(".color-2-on-color-1");
    expect(css).toContain("color: #0f6e6a;");
    expect(css).toContain("background-color: #001223;");

    const repeated = matrixStylesheet({
      id: "m",
      colors: harbor,
      combos: [tide[0], { ...tide[0], fgHex: "#0f6e6a" }],
    });
    expect(repeated).toContain(".color-1-on-white {");
    expect(repeated).toContain(".color-1-on-white-2 {");
  });
});
