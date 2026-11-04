export type ColorCombo = {
  id: string;
  colors: string[];
  name?: string;
};

export type MatrixCombo = {
  fgHex: string;
  bgHex: string;
  purpose: string;
};

export type SavedMatrix = {
  id: string;
  colors: string[];
  combos: MatrixCombo[];
};

export type TemplateId = "northroom" | "marlow" | "ashline";

export type SavedTemplate = {
  id: string;
  name: string;
  template: TemplateId;
  page: "light" | "dark";
  colors: string[];
  paletteName?: string;
};

export type PaletteProject = {
  id: string;
  name: string;
  entries: ColorCombo[];
  matrices: SavedMatrix[];
  templates: SavedTemplate[];
};

export type PaletteLibrary = {
  history: ColorCombo[];
  favorites: ColorCombo[];
  projects: PaletteProject[];
  matrices: SavedMatrix[];
  templates: SavedTemplate[];
};

export const LIBRARY_STORAGE_KEY = "accessible-palette-library";

export const EMPTY_LIBRARY: PaletteLibrary = {
  history: [],
  favorites: [],
  projects: [],
  matrices: [],
  templates: [],
};

const HEX = /^#[0-9a-f]{6}$/;

export function comboKey(colors: string[]): string {
  return colors.map((hex) => hex.toLowerCase()).join("|");
}

export function sameCombo(left: string[], right: string[]): boolean {
  return comboKey(left) === comboKey(right);
}

function normalizeColors(colors: string[]): string[] | null {
  if (colors.length < 3 || colors.length > 5) return null;
  const normalized = colors.map((hex) => hex.toLowerCase());
  if (normalized.some((hex) => !HEX.test(hex))) return null;
  return normalized;
}

function normalizeMatrixCombo(value: MatrixCombo): MatrixCombo | null {
  const fgHex = value.fgHex.toLowerCase();
  const bgHex = value.bgHex.toLowerCase();
  const purpose = value.purpose.trim();
  if (!HEX.test(fgHex) || !HEX.test(bgHex)) return null;
  if (purpose.length === 0 || purpose.length > 240) return null;
  return { fgHex, bgHex, purpose };
}

function readMatrix(value: unknown): SavedMatrix | null {
  if (!value || typeof value !== "object") return null;
  const record = value as { id?: unknown; colors?: unknown; combos?: unknown };
  if (typeof record.id !== "string" || record.id.length === 0 || record.id.length > 80) return null;
  if (!Array.isArray(record.colors) || record.colors.some((hex) => typeof hex !== "string")) return null;
  const colors = normalizeColors(record.colors as string[]);
  if (!colors || !Array.isArray(record.combos) || record.combos.length === 0 || record.combos.length > 64) {
    return null;
  }
  const combos: MatrixCombo[] = [];
  for (const item of record.combos) {
    if (!item || typeof item !== "object") return null;
    const combo = item as { fgHex?: unknown; bgHex?: unknown; purpose?: unknown };
    if (typeof combo.fgHex !== "string" || typeof combo.bgHex !== "string" || typeof combo.purpose !== "string") {
      return null;
    }
    const normalized = normalizeMatrixCombo({ fgHex: combo.fgHex, bgHex: combo.bgHex, purpose: combo.purpose });
    if (!normalized) return null;
    combos.push(normalized);
  }
  return { id: record.id, colors, combos };
}

function readMatrices(value: unknown): SavedMatrix[] | null {
  const source = value === undefined ? [] : value;
  if (!Array.isArray(source)) return null;
  const matrices = source.slice(0, 40).map(readMatrix);
  if (matrices.some((item) => !item)) return null;
  return matrices as SavedMatrix[];
}

const TEMPLATE_IDS = new Set<TemplateId>(["northroom", "marlow", "ashline"]);

function readTemplate(value: unknown): SavedTemplate | null {
  if (!value || typeof value !== "object") return null;
  const record = value as {
    id?: unknown;
    name?: unknown;
    template?: unknown;
    page?: unknown;
    colors?: unknown;
    paletteName?: unknown;
  };
  if (typeof record.id !== "string" || record.id.length === 0 || record.id.length > 80) return null;
  if (typeof record.name !== "string") return null;
  const name = record.name.trim();
  if (name.length === 0 || name.length > 80) return null;
  if (typeof record.template !== "string" || !TEMPLATE_IDS.has(record.template as TemplateId)) return null;
  if (record.page !== "light" && record.page !== "dark") return null;
  if (!Array.isArray(record.colors) || record.colors.some((hex) => typeof hex !== "string")) return null;
  const colors = normalizeColors(record.colors as string[]);
  if (!colors) return null;
  return {
    id: record.id,
    name,
    template: record.template as TemplateId,
    page: record.page,
    colors,
    paletteName: readName(record.paletteName),
  };
}

function readTemplates(value: unknown): SavedTemplate[] | null {
  const source = value === undefined ? [] : value;
  if (!Array.isArray(source)) return null;
  const templates = source.slice(0, 40).map(readTemplate);
  if (templates.some((item) => !item)) return null;
  return templates as SavedTemplate[];
}

function cleanName(name: string | undefined): string | undefined {
  const trimmed = name?.trim().slice(0, 80) ?? "";
  return trimmed || undefined;
}

function readName(value: unknown): string | undefined {
  return typeof value === "string" ? cleanName(value) : undefined;
}

function readCombo(value: unknown): ColorCombo | null {
  if (!value || typeof value !== "object") return null;
  const record = value as { id?: unknown; colors?: unknown; name?: unknown };
  if (typeof record.id !== "string" || record.id.length === 0 || record.id.length > 80) return null;
  if (!Array.isArray(record.colors) || record.colors.some((hex) => typeof hex !== "string")) return null;
  const colors = normalizeColors(record.colors as string[]);
  if (!colors) return null;
  return { id: record.id, colors, name: readName(record.name) };
}

export function parseLibrary(value: unknown): PaletteLibrary | null {
  if (!value || typeof value !== "object") return null;
  const record = value as {
    history?: unknown;
    favorites?: unknown;
    projects?: unknown;
    matrices?: unknown;
    templates?: unknown;
  };
  if (!Array.isArray(record.history) || !Array.isArray(record.favorites) || !Array.isArray(record.projects)) {
    return null;
  }
  const history = record.history.slice(0, 12).map(readCombo);
  const favorites = record.favorites.slice(0, 100).map(readCombo);
  const matrices = readMatrices(record.matrices);
  const templates = readTemplates(record.templates);
  if (history.some((item) => !item) || favorites.some((item) => !item) || !matrices || !templates) return null;
  const projects: PaletteProject[] = [];
  for (const item of record.projects.slice(0, 40)) {
    if (!item || typeof item !== "object") return null;
    const project = item as { id?: unknown; name?: unknown; entries?: unknown; matrices?: unknown; templates?: unknown };
    if (typeof project.id !== "string" || project.id.length === 0 || project.id.length > 80) return null;
    if (typeof project.name !== "string") return null;
    const name = project.name.trim();
    if (name.length === 0 || name.length > 80) return null;
    if (!Array.isArray(project.entries)) return null;
    const entries = project.entries.slice(0, 100).map(readCombo);
    const projectMatrices = readMatrices(project.matrices);
    const projectTemplates = readTemplates(project.templates);
    if (entries.some((entry) => !entry) || !projectMatrices || !projectTemplates) return null;
    projects.push({
      id: project.id,
      name,
      entries: entries as ColorCombo[],
      matrices: projectMatrices,
      templates: projectTemplates,
    });
  }
  return {
    history: history as ColorCombo[],
    favorites: favorites as ColorCombo[],
    projects,
    matrices,
    templates,
  };
}

export function pushHistory(library: PaletteLibrary, colors: string[], name?: string): PaletteLibrary {
  const normalized = normalizeColors(colors);
  if (!normalized) return library;
  const stored = cleanName(name);
  if (library.history[0] && sameCombo(library.history[0].colors, normalized)) {
    if (stored === library.history[0].name) return library;
    const [first, ...rest] = library.history;
    return { ...library, history: [{ ...first, name: stored }, ...rest] };
  }
  return {
    ...library,
    history: [{ id: crypto.randomUUID(), colors: normalized, name: stored }, ...library.history].slice(0, 12),
  };
}

export function recentProjects<T>(projects: T[], count = 3): T[] {
  return projects.slice(-count).reverse();
}

export function renameProject(library: PaletteLibrary, projectId: string, name: string): SaveResult {
  const trimmed = name.trim();
  if (!trimmed) return { ok: false, message: "Name the project before saving." };
  if (trimmed.length > 80) return { ok: false, message: "Use a project name of 80 characters or fewer." };
  const current = library.projects.find((project) => project.id === projectId);
  if (!current) return { ok: false, message: "That project is not available." };
  if (
    library.projects.some(
      (project) => project.id !== projectId && project.name.toLowerCase() === trimmed.toLowerCase(),
    )
  ) {
    return { ok: false, message: "A project already uses that name." };
  }
  return {
    ok: true,
    library: {
      ...library,
      projects: library.projects.map((project) => (project.id === projectId ? { ...project, name: trimmed } : project)),
    },
    place: { name: trimmed, href: `/projects/${projectId}`, kind: "palette" },
  };
}

export function renameHistory(library: PaletteLibrary, colors: string[], name: string): PaletteLibrary {
  const normalized = normalizeColors(colors);
  if (!normalized) return library;
  const stored = cleanName(name);
  const match = library.history.some((item) => sameCombo(item.colors, normalized));
  if (!match) return pushHistory(library, normalized, stored);
  return {
    ...library,
    history: library.history.map((item) => (sameCombo(item.colors, normalized) ? { ...item, name: stored } : item)),
  };
}

/** Current combo first, then up to four earlier combos. */
export function historyRows(current: string[], history: ColorCombo[], currentName = ""): ColorCombo[] {
  const normalized = normalizeColors(current) ?? current.map((hex) => hex.toLowerCase());
  const match = history.find((item) => sameCombo(item.colors, normalized));
  const previous = history.filter((item) => !sameCombo(item.colors, normalized)).slice(0, 4);
  return [{ id: "current", colors: normalized, name: cleanName(currentName) ?? match?.name }, ...previous];
}

export type SavedPlace = {
  name: string;
  href: string;
  kind: "palette" | "matrix" | "template";
};

export type SaveResult =
  | { ok: true; library: PaletteLibrary; place: SavedPlace }
  | { ok: false; message: string };

export const FAVORITES_PLACE = { name: "Favorites", href: "/favorites" };

function projectPlace(project: { id: string; name: string }) {
  return { name: project.name, href: `/projects/${project.id}` };
}

function addEntry(entries: ColorCombo[], colors: string[], name?: string): ColorCombo[] | null {
  const normalized = normalizeColors(colors);
  if (!normalized) return null;
  if (entries.some((entry) => sameCombo(entry.colors, normalized))) return null;
  return [{ id: crypto.randomUUID(), colors: normalized, name: cleanName(name) }, ...entries].slice(0, 100);
}

export function saveToFavorites(library: PaletteLibrary, colors: string[], name?: string): SaveResult {
  const entries = addEntry(library.favorites, colors, name);
  if (!entries) return { ok: false, message: "That palette is already in Favorites." };
  return { ok: true, library: { ...library, favorites: entries }, place: { ...FAVORITES_PLACE, kind: "palette" } };
}

export function saveToNewProject(library: PaletteLibrary, colors: string[], name: string, paletteName?: string): SaveResult {
  const trimmed = name.trim();
  if (!trimmed) return { ok: false, message: "Name the project before saving." };
  if (trimmed.length > 80) return { ok: false, message: "Use a project name of 80 characters or fewer." };
  if (library.projects.some((project) => project.name.toLowerCase() === trimmed.toLowerCase())) {
    return { ok: false, message: "A project already uses that name." };
  }
  const normalized = normalizeColors(colors);
  if (!normalized) return { ok: false, message: "That palette could not be saved." };
  const project: PaletteProject = {
    id: crypto.randomUUID(),
    name: trimmed,
    entries: [{ id: crypto.randomUUID(), colors: normalized, name: cleanName(paletteName) }],
    matrices: [],
    templates: [],
  };
  return {
    ok: true,
    library: { ...library, projects: [...library.projects, project] },
    place: { ...projectPlace(project), kind: "palette" },
  };
}

function selectionKey(combos: MatrixCombo[]): string {
  return combos
    .map((combo) => `${combo.fgHex}|${combo.bgHex}`)
    .sort()
    .join("~");
}

function addMatrix(
  list: SavedMatrix[],
  colors: string[],
  combos: MatrixCombo[],
): { matrices: SavedMatrix[] } | { duplicate: true } | null {
  const normalizedColors = normalizeColors(colors);
  if (!normalizedColors || combos.length === 0) return null;
  const normalized = combos.map(normalizeMatrixCombo);
  if (normalized.some((combo) => !combo)) return null;
  const clean = normalized as MatrixCombo[];
  const key = selectionKey(clean);
  if (list.some((item) => selectionKey(item.combos) === key)) return { duplicate: true };
  return {
    matrices: [{ id: crypto.randomUUID(), colors: normalizedColors, combos: clean }, ...list].slice(0, 40),
  };
}

export function saveMatrixToFavorites(
  library: PaletteLibrary,
  colors: string[],
  combos: MatrixCombo[],
): SaveResult {
  if (combos.length === 0) return { ok: false, message: "Select matrix cells before saving." };
  const added = addMatrix(library.matrices, colors, combos);
  if (!added) return { ok: false, message: "That contrast matrix could not be saved." };
  if ("duplicate" in added) return { ok: false, message: "Those color combos are already in Favorites." };
  return {
    ok: true,
    library: { ...library, matrices: added.matrices },
    place: { ...FAVORITES_PLACE, kind: "matrix" },
  };
}

export function saveMatrixToNewProject(
  library: PaletteLibrary,
  colors: string[],
  combos: MatrixCombo[],
  name: string,
): SaveResult {
  const trimmed = name.trim();
  if (!trimmed) return { ok: false, message: "Name the project before saving." };
  if (trimmed.length > 80) return { ok: false, message: "Use a project name of 80 characters or fewer." };
  if (library.projects.some((project) => project.name.toLowerCase() === trimmed.toLowerCase())) {
    return { ok: false, message: "A project already uses that name." };
  }
  if (combos.length === 0) return { ok: false, message: "Select matrix cells before saving." };
  const added = addMatrix([], colors, combos);
  if (!added || "duplicate" in added) return { ok: false, message: "That contrast matrix could not be saved." };
  const project: PaletteProject = {
    id: crypto.randomUUID(),
    name: trimmed,
    entries: [],
    matrices: added.matrices,
    templates: [],
  };
  return {
    ok: true,
    library: { ...library, projects: [...library.projects, project] },
    place: { ...projectPlace(project), kind: "matrix" },
  };
}

export function saveMatrixToProject(
  library: PaletteLibrary,
  colors: string[],
  combos: MatrixCombo[],
  projectId: string,
): SaveResult {
  const index = library.projects.findIndex((project) => project.id === projectId);
  if (index < 0) return { ok: false, message: "Choose a project." };
  if (combos.length === 0) return { ok: false, message: "Select matrix cells before saving." };
  const added = addMatrix(library.projects[index].matrices, colors, combos);
  if (!added) return { ok: false, message: "That contrast matrix could not be saved." };
  if ("duplicate" in added) return { ok: false, message: "Those color combos are already in this project." };
  const projects = library.projects.map((project, item) =>
    item === index ? { ...project, matrices: added.matrices } : project,
  );
  return {
    ok: true,
    library: { ...library, projects },
    place: { ...projectPlace(library.projects[index]), kind: "matrix" },
  };
}

export type TemplateDraft = {
  name: string;
  template: TemplateId;
  page: "light" | "dark";
  colors: string[];
  paletteName?: string;
};

export function collectTemplates(library: PaletteLibrary): SavedTemplate[] {
  return [...library.templates, ...library.projects.flatMap((project) => project.templates)];
}

/** First copy has no number. Later copies use how many of that template and palette already exist. */
export function nextTemplateName(
  existing: SavedTemplate[],
  template: TemplateId,
  paletteName: string,
  templateLabel: string,
): string {
  const palette = cleanName(paletteName) ?? "";
  const count = existing.filter((item) => item.template === template && (item.paletteName ?? "") === palette).length;
  const base = palette ? `${templateLabel} ${palette}` : templateLabel;
  const named = count === 0 ? base : `${base} ${count}`;
  return named.slice(0, 80);
}

function buildTemplate(draft: TemplateDraft): SavedTemplate | null {
  const name = draft.name.trim();
  if (!name || name.length > 80) return null;
  const colors = normalizeColors(draft.colors);
  if (!colors) return null;
  return {
    id: crypto.randomUUID(),
    name,
    template: draft.template,
    page: draft.page,
    colors,
    paletteName: cleanName(draft.paletteName),
  };
}

export function saveTemplateToFavorites(library: PaletteLibrary, draft: TemplateDraft): SaveResult {
  const template = buildTemplate(draft);
  if (!template) return { ok: false, message: "Name the template before saving." };
  return {
    ok: true,
    library: { ...library, templates: [template, ...library.templates].slice(0, 40) },
    place: { ...FAVORITES_PLACE, kind: "template" },
  };
}

export function saveTemplateToNewProject(library: PaletteLibrary, draft: TemplateDraft, projectName: string): SaveResult {
  const trimmed = projectName.trim();
  if (!trimmed) return { ok: false, message: "Name the project before saving." };
  if (trimmed.length > 80) return { ok: false, message: "Use a project name of 80 characters or fewer." };
  if (library.projects.some((project) => project.name.toLowerCase() === trimmed.toLowerCase())) {
    return { ok: false, message: "A project already uses that name." };
  }
  const template = buildTemplate(draft);
  if (!template) return { ok: false, message: "Name the template before saving." };
  const project: PaletteProject = {
    id: crypto.randomUUID(),
    name: trimmed,
    entries: [],
    matrices: [],
    templates: [template],
  };
  return {
    ok: true,
    library: { ...library, projects: [...library.projects, project] },
    place: { ...projectPlace(project), kind: "template" },
  };
}

export function saveTemplateToProject(library: PaletteLibrary, draft: TemplateDraft, projectId: string): SaveResult {
  const index = library.projects.findIndex((project) => project.id === projectId);
  if (index < 0) return { ok: false, message: "Choose a project." };
  const template = buildTemplate(draft);
  if (!template) return { ok: false, message: "Name the template before saving." };
  const projects = library.projects.map((project, item) =>
    item === index ? { ...project, templates: [template, ...project.templates].slice(0, 40) } : project,
  );
  return {
    ok: true,
    library: { ...library, projects },
    place: { ...projectPlace(library.projects[index]), kind: "template" },
  };
}

export function saveToProject(library: PaletteLibrary, colors: string[], projectId: string, paletteName?: string): SaveResult {
  const index = library.projects.findIndex((project) => project.id === projectId);
  if (index < 0) return { ok: false, message: "Choose a project." };
  const entries = addEntry(library.projects[index].entries, colors, paletteName);
  if (!entries) return { ok: false, message: "That palette is already in this project." };
  const projects = library.projects.map((project, item) =>
    item === index ? { ...project, entries } : project,
  );
  return {
    ok: true,
    library: { ...library, projects },
    place: { ...projectPlace(library.projects[index]), kind: "palette" },
  };
}

export function classNameForBlock(purpose: string, used: Set<string>): string {
  const slug = purpose
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  const base = !slug || /^[0-9-]/.test(slug) ? `pair-${slug || "block"}` : slug;
  let name = base;
  let suffix = 2;
  while (used.has(name)) {
    name = `${base}-${suffix}`;
    suffix += 1;
  }
  used.add(name);
  return name;
}

export function matrixStylesheet(matrix: SavedMatrix): string {
  const used = new Set<string>();
  const rules = matrix.combos.map((combo) => {
    const name = classNameForBlock(combo.purpose, used);
    return `/* ${combo.purpose} */\n.${name} {\n  color: ${combo.fgHex};\n  background-color: ${combo.bgHex};\n}`;
  });
  return `${rules.join("\n\n")}\n`;
}

export function matrixBlocks(matrix: SavedMatrix): { className: string; combo: MatrixCombo }[] {
  const used = new Set<string>();
  return matrix.combos.map((combo) => ({ className: classNameForBlock(combo.purpose, used), combo }));
}
