import { describe, expect, it } from "vitest";
import {
  historyRows,
  parseLibrary,
  pushHistory,
  saveMatrixToFavorites,
  saveMatrixToNewProject,
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

  it("saves favorites and projects without duplicating a combo", () => {
    const favorites = saveToFavorites(library(), harbor);
    expect(favorites.ok).toBe(true);
    if (!favorites.ok) return;
    expect(saveToFavorites(favorites.library, harbor).ok).toBe(false);

    const created = saveToNewProject(favorites.library, ink, "  Brand  ");
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    expect(created.library.projects[0].name).toBe("Brand");
    expect(saveToNewProject(created.library, harbor, "brand").ok).toBe(false);

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
    expect(parsed?.projects[0].matrices).toEqual([]);
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
  });
});
