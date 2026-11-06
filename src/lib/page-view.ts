import { normalizeHex } from "./color";

export const PAGE_SECTIONS = [
  "build-heading",
  "check-heading",
  "preview-heading",
  "cvd-heading",
  "export-heading",
] as const;

export type PageSection = (typeof PAGE_SECTIONS)[number];
export type PreviewTemplate = "northroom" | "marlow" | "ashline";

export type PageView = {
  colors?: string[];
  name?: string;
  theme?: "light" | "dark";
  template?: PreviewTemplate;
  page?: "light" | "dark";
  dot?: number;
  pair?: { fg: string; bg: string };
  section?: PageSection;
};

const TEMPLATES = new Set<PreviewTemplate>(["northroom", "marlow", "ashline"]);
const SECTIONS = new Set<string>(PAGE_SECTIONS);

export function parseShareSearch(search: string, hash = ""): PageView {
  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  const view: PageView = {};
  const colors = params
    .get("c")
    ?.split(".")
    .map((part) => normalizeHex(part))
    .filter((hex): hex is string => Boolean(hex));
  if (colors && colors.length >= 3 && colors.length <= 5) view.colors = colors;
  const name = params.get("n")?.trim().slice(0, 80);
  if (name) view.name = name;
  const theme = params.get("t");
  if (theme === "dark" || theme === "light") view.theme = theme;
  const template = params.get("v");
  if (template && TEMPLATES.has(template as PreviewTemplate)) view.template = template as PreviewTemplate;
  const page = params.get("m");
  if (page === "dark" || page === "light") view.page = page;
  const dot = Number(params.get("d"));
  if (Number.isInteger(dot) && dot >= 0 && dot <= 4) view.dot = dot;
  const pair = params.get("k");
  if (pair && /^[a-z0-9]+\.[a-z0-9]+$/i.test(pair)) {
    const [fg, bg] = pair.split(".");
    view.pair = { fg, bg };
  }
  const section = hash.replace(/^#/, "");
  if (SECTIONS.has(section)) view.section = section as PageSection;
  return view;
}

export function serializeShareSearch(view: PageView): string {
  const params = new URLSearchParams();
  if (view.colors && view.colors.length >= 3) {
    params.set("c", view.colors.map((hex) => hex.replace(/^#/, "")).join("."));
  }
  if (view.name) params.set("n", view.name);
  if (view.theme) params.set("t", view.theme);
  if (view.template && view.template !== "northroom") params.set("v", view.template);
  if (view.page === "dark") params.set("m", "dark");
  if (view.dot) params.set("d", String(view.dot));
  if (view.pair) params.set("k", `${view.pair.fg}.${view.pair.bg}`);
  const query = params.toString();
  return query ? `?${query}` : "";
}

let pending: PageView = {};
let frame = 0;
let trailing = 0;
let seeded = false;
let lastWrite = 0;
// Safari and Chrome on a phone refuse history.replaceState after about 100 calls
// in a short window, then replace the page with one that asks for a reload.
const MIN_WRITE_GAP_MS = 500;

function writeShare() {
  if (typeof window === "undefined" || window.location.pathname !== "/") return;
  if (!seeded) {
    pending = { ...parseShareSearch(window.location.search, window.location.hash), ...pending };
    seeded = true;
  }
  const query = serializeShareSearch(pending);
  const hash = pending.section ? `#${pending.section}` : window.location.hash;
  const next = `/${query}${hash}`;
  const current = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  try {
    if (current !== next) history.replaceState(null, "", next);
  } catch {
    // The browser rejected another address update. The latest view stays in `pending`.
  }
  lastWrite = Date.now();
}

function scheduleWrite() {
  if (frame || trailing) return;
  const wait = MIN_WRITE_GAP_MS - (Date.now() - lastWrite);
  if (wait <= 0) {
    frame = window.requestAnimationFrame(() => {
      frame = 0;
      writeShare();
    });
    return;
  }
  trailing = window.setTimeout(() => {
    trailing = 0;
    writeShare();
  }, wait);
}

/** Merge the visible palette into the address bar. One static page serves every combination. */
export function rememberPageView(partial: PageView) {
  if (typeof window === "undefined" || window.location.pathname !== "/") return;
  pending = { ...pending, ...partial };
  scheduleWrite();
}

export function flushPageView() {
  if (typeof window === "undefined") return;
  if (frame) window.cancelAnimationFrame(frame);
  if (trailing) window.clearTimeout(trailing);
  frame = 0;
  trailing = 0;
  writeShare();
}

export function readPageView(): PageView {
  if (typeof window === "undefined") return {};
  return parseShareSearch(window.location.search, window.location.hash);
}
