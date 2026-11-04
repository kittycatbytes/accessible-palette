import { describe, expect, it } from "vitest";
import { parseShareSearch, serializeShareSearch } from "./page-view";

describe("shareable page view", () => {
  it("round-trips a palette, a dark theme, and a section", () => {
    const search = serializeShareSearch({
      colors: ["#001223", "#0f6e6a", "#8a5a12"],
      name: "Harbor",
      theme: "dark",
      template: "ashline",
      page: "dark",
      dot: 2,
      pair: { fg: "white", bg: "c1" },
    });
    expect(parseShareSearch(search, "#preview-heading")).toEqual({
      colors: ["#001223", "#0f6e6a", "#8a5a12"],
      name: "Harbor",
      theme: "dark",
      template: "ashline",
      page: "dark",
      dot: 2,
      pair: { fg: "white", bg: "c1" },
      section: "preview-heading",
    });
  });

  it("drops a broken color list and the default preview", () => {
    expect(parseShareSearch("?c=red.blue&v=northroom&t=light").colors).toBeUndefined();
    expect(serializeShareSearch({ colors: ["#001223", "#0f6e6a", "#8a5a12"], template: "northroom", theme: "light" })).toBe(
      "?c=001223.0f6e6a.8a5a12&t=light",
    );
  });
});
