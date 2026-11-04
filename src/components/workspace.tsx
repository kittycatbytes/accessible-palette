"use client";

import { signIn, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { oklchToHex, readOklch } from "@/lib/color";
import {
  EMPTY_LIBRARY,
  LIBRARY_STORAGE_KEY,
  parseLibrary,
  pushHistory,
  renameHistory,
  sameCombo,
  type PaletteLibrary,
  type SavedPlace,
} from "@/lib/library";
import { colorsFromHarmony, paletteFromHarmony } from "@/lib/harmony";
import { optimizeBrand } from "@/lib/optimize";
import {
  CLASSIC_PRESETS,
  CONTRAST_PRESETS,
  CONTEMPORARY_PRESETS,
  LIGHT_PRESETS,
  MONOCHROMATIC_PRESETS,
  PASTEL_PRESETS,
  POPULAR_PRESETS,
  VIBRANT_PRESETS,
  presetBias,
  type PalettePreset,
} from "@/lib/presets";
import { buildSnapshot, listPairs } from "@/lib/snapshot";
import type { BrandColor, ContrastPair, Harmony, PickerMode } from "@/lib/types";
import { ColorPicker } from "./color-picker";
import { CvdPanel } from "./cvd-panel";
import { ExportPanel } from "./export-panel";
import { CategoryRail } from "./flyout";
import { ComboHistory } from "./combo-history";
import { Matrix } from "./matrix";
import { PaletteStage } from "./palette-stage";
import { Preview } from "./preview";

type SessionInfo = {
  authConfigured: boolean;
  database: string;
  user: { id: string; name: string; email: string } | null;
};

function renumber(colors: BrandColor[]): BrandColor[] {
  return colors.map((color, index) => ({
    ...color,
    id: `c${index + 1}`,
    name: `Color ${index + 1}`,
  }));
}

function fromHexes(hexes: string[]): BrandColor[] {
  return renumber(hexes.map((hex) => ({ id: "", name: "", hex })));
}

const themeListeners = new Set<() => void>();

function subscribeTheme(listener: () => void) {
  themeListeners.add(listener);
  return () => themeListeners.delete(listener);
}

function readTheme(): "light" | "dark" {
  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}

function writeTheme(next: "light" | "dark") {
  if (next === "dark") document.documentElement.setAttribute("data-theme", "dark");
  else document.documentElement.removeAttribute("data-theme");
  localStorage.setItem("accessible-palette-theme", next);
  themeListeners.forEach((listener) => listener());
}

export function Workspace() {
  const [colors, setColors] = useState<BrandColor[]>(() => fromHexes(POPULAR_PRESETS[0].colors));
  const [selected, setSelected] = useState(0);
  const [autoOptimize, setAutoOptimize] = useState(true);
  const [pickerMode, setPickerMode] = useState<PickerMode>("cube");
  const [harmony, setHarmony] = useState<Harmony>("analogous");
  const [liveWheel, setLiveWheel] = useState(false);
  const [spin, setSpin] = useState(0);
  const [notes, setNotes] = useState<string[]>([]);
  const [status, setStatus] = useState("Harbor is loaded. Choose a dot, then set its color.");
  const [serverPairs, setServerPairs] = useState<ContrastPair[] | null>(null);
  const [serverState, setServerState] = useState<"local" | "checking" | "verified">("local");
  const [active, setActive] = useState<{
    view: ContrastPair["view"];
    fgKey: string;
    bgKey: string;
  } | null>(null);
  const theme = useSyncExternalStore(subscribeTheme, readTheme, () => "light" as const);
  const router = useRouter();
  const [session, setSession] = useState<SessionInfo | null>(null);
  const [sessionReady, setSessionReady] = useState(false);
  const [library, setLibrary] = useState<PaletteLibrary>(EMPTY_LIBRARY);
  const [libraryReady, setLibraryReady] = useState(false);
  const [toast, setToast] = useState<{ id: number; place: SavedPlace } | null>(null);
  const [paletteName, setPaletteName] = useState("Harbor");
  const colorsRef = useRef(colors);
  const spareRef = useRef<BrandColor[]>([]);
  const gesture = useRef(false);
  const touched = useRef(false);
  const [past, setPast] = useState<BrandColor[][]>([]);
  const [future, setFuture] = useState<BrandColor[][]>([]);
  colorsRef.current = colors;

  const snapshot = useMemo(
    () =>
      buildSnapshot({
        brandColors: colors,
        autoOptimize,
        pickerMode,
        harmony,
        optimizeNotes: notes,
      }),
    [colors, autoOptimize, pickerMode, harmony, notes],
  );
  const localPairs = useMemo(() => listPairs(snapshot), [snapshot]);
  const pairs = serverPairs ?? localPairs;
  const chosenPair = active
    ? pairs.find((pair) => pair.view === active.view && pair.fgKey === active.fgKey && pair.bgKey === active.bgKey)
    : undefined;
  const activePair =
    chosenPair ??
    pairs.find((pair) => pair.view === "brand" && pair.required && !pair.exempt && pair.aaNormal && pair.nonText) ??
    pairs.find((pair) => pair.required) ??
    pairs[0];

  useEffect(() => {
    let cancelled = false;
    fetch("/api/session")
      .then((response) => response.json())
      .then((data: SessionInfo) => {
        if (cancelled) return;
        setSession(data);
      })
      .catch(() => {
        if (!cancelled) setSession(null);
      })
      .finally(() => {
        if (!cancelled) setSessionReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!sessionReady) return;
    let cancelled = false;
    setLibraryReady(false);
    async function load() {
      let next = EMPTY_LIBRARY;
      if (session?.user) {
        try {
          const response = await fetch("/api/library");
          if (response.ok) {
            const data = (await response.json()) as { library?: unknown };
            next = parseLibrary(data.library) ?? EMPTY_LIBRARY;
          }
        } catch {
          next = EMPTY_LIBRARY;
        }
      } else {
        try {
          next = parseLibrary(JSON.parse(localStorage.getItem(LIBRARY_STORAGE_KEY) || "null")) ?? EMPTY_LIBRARY;
        } catch {
          next = EMPTY_LIBRARY;
        }
      }
      if (cancelled) return;
      if (!touched.current && next.history[0]) {
        const numbered = renumber(fromHexes(next.history[0].colors));
        colorsRef.current = numbered;
        setColors(numbered);
        setPaletteName(next.history[0].name ?? "");
      }
      const seeded =
        !touched.current && next.history.length === 0
          ? pushHistory(next, colorsRef.current.map((color) => color.hex), "Harbor")
          : next;
      setLibrary((current) => {
        if (!touched.current) return seeded;
        return {
          history: current.history.length ? current.history : seeded.history,
          favorites: current.favorites.length ? current.favorites : seeded.favorites,
          projects: current.projects.length ? current.projects : seeded.projects,
          matrices: current.matrices.length ? current.matrices : seeded.matrices,
        };
      });
      setLibraryReady(true);
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [sessionReady, session?.user?.id]);

  useEffect(() => {
    if (!libraryReady || !sessionReady) return;
    try {
      sessionStorage.setItem(LIBRARY_STORAGE_KEY, JSON.stringify(library));
    } catch {
      // Storage can be blocked. The signed-in copy still goes to the account.
    }
    if (session?.user) {
      const handle = window.setTimeout(() => {
        void fetch("/api/library", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(library),
        });
      }, 400);
      return () => window.clearTimeout(handle);
    }
    localStorage.setItem(LIBRARY_STORAGE_KEY, JSON.stringify(library));
  }, [library, libraryReady, sessionReady, session?.user]);

  useEffect(() => {
    if (!toast) return;
    const handle = window.setTimeout(() => setToast(null), 8000);
    return () => window.clearTimeout(handle);
  }, [toast]);

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setServerState("checking");
      try {
        const response = await fetch("/api/contrast", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
          body: JSON.stringify({
            brandColors: colors,
            autoOptimize,
            pickerMode,
            harmony,
          }),
        });
        if (!response.ok) {
          setServerPairs(null);
          setServerState("local");
          return;
        }
        const data = (await response.json()) as { pairs: ContrastPair[] };
        setServerPairs(data.pairs);
        setServerState("verified");
      } catch (error) {
        if ((error as Error).name !== "AbortError") setServerState("local");
      }
    }, 450);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [colors, autoOptimize, pickerMode, harmony]);

  function acceptLibrary(next: PaletteLibrary) {
    touched.current = true;
    try {
      sessionStorage.setItem(LIBRARY_STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Storage can be blocked. The signed-in copy still goes to the account.
    }
    setLibrary(next);
  }

  function remember() {
    const snapshot = colorsRef.current.map((color) => ({ ...color }));
    setPast((previous) => [...previous, snapshot].slice(-30));
    setFuture([]);
  }

  function recordHistory(next: BrandColor[], name = paletteName) {
    setLibrary((current) => pushHistory(current, next.map((color) => color.hex), name));
  }

  function finishGesture() {
    if (!gesture.current) return;
    gesture.current = false;
    recordHistory(colorsRef.current);
  }

  function commit(
    next: BrandColor[],
    source: "edit" | "preset" | "auto" | "restore" | "count",
    name = paletteName,
  ) {
    touched.current = true;
    if (!gesture.current) {
      remember();
      recordHistory(next, name);
    }
    const numbered = renumber(next);
    colorsRef.current = numbered;
    setColors(numbered);
    if (source === "preset" || source === "auto") setSpin((value) => value + 360);
  }

  function updateHex(hex: string) {
    const current = colorsRef.current;
    const anchor = Math.min(selected, current.length - 1);
    const seeded = current.map((color, index) =>
      index === anchor ? { ...color, hex } : color,
    );
    const arranged = liveWheel
      ? fromHexes(paletteFromHarmony(seeded.map((color) => color.hex), anchor, harmony))
      : seeded;
    const result = autoOptimize ? optimizeBrand(arranged, anchor) : { colors: arranged, notes: [] };
    setNotes(result.notes);
    commit(result.colors, "edit");
  }

  function changeCount(count: number) {
    const current = colorsRef.current;
    if (count === current.length) return;
    let next: BrandColor[];
    if (count < current.length) {
      spareRef.current = [...current.slice(count), ...spareRef.current].slice(0, 8);
      next = current.slice(0, count);
    } else {
      const restored = spareRef.current.slice(0, count - current.length);
      spareRef.current = spareRef.current.slice(restored.length);
      next = [...current, ...restored];
      while (next.length < count) {
        const hue = (readOklch(next[0]?.hex ?? "#0c3d66").h + next.length * 36) % 360;
        next.push({ id: "", name: "", hex: oklchToHex(0.34, 0.1, hue) });
      }
    }
    const result = autoOptimize ? optimizeBrand(next, Math.min(selected, count - 1)) : { colors: next, notes: [] };
    setNotes(result.notes);
    setSelected((index) => Math.min(index, count - 1));
    commit(result.colors, "count");
  }

  function applyPreset(preset: PalettePreset) {
    spareRef.current = [];
    setSelected(0);
    setPaletteName(preset.name);
    const next = fromHexes(preset.colors);
    const result = autoOptimize
      ? optimizeBrand(next, null, presetBias(preset.group))
      : { colors: next, notes: [] };
    setNotes(result.notes);
    commit(result.colors, "preset", preset.name);
    setStatus(`${preset.name} is on the circle.`);
  }

  function applyHarmony(nextHarmony: Harmony) {
    const current = colorsRef.current;
    const anchor = Math.min(selected, current.length - 1);
    const seed = current[anchor]?.hex;
    if (!seed) return;
    const next = fromHexes(paletteFromHarmony(current.map((color) => color.hex), anchor, nextHarmony));
    const result = autoOptimize ? optimizeBrand(next, anchor) : { colors: next, notes: [] };
    setNotes(result.notes);
    commit(result.colors, "auto");
    setStatus(
      `Built a ${nextHarmony.replace("-", " ")} palette around ${current[anchor].name}. That color stayed put.`,
    );
  }

  function generate() {
    const seed = oklchToHex(0.4, 0.12, Math.random() * 360);
    const next = fromHexes(colorsFromHarmony(seed, harmony, colorsRef.current.length));
    const result = optimizeBrand(next, null);
    setSelected(0);
    setNotes(result.notes);
    commit(result.colors, "auto");
    setStatus(`Built a ${harmony.replace("-", " ")} palette and adjusted lightness for AA on white.`);
  }

  function undo() {
    const last = past[past.length - 1];
    if (!last) return;
    const current = colorsRef.current.map((color) => ({ ...color }));
    setFuture((upcoming) => [current, ...upcoming].slice(0, 30));
    setPast((previous) => previous.slice(0, -1));
    colorsRef.current = last;
    setColors(last);
    touched.current = true;
    recordHistory(last);
  }

  function redo() {
    const next = future[0];
    if (!next) return;
    const current = colorsRef.current.map((color) => ({ ...color }));
    setPast((previous) => [...previous, current].slice(-30));
    setFuture((upcoming) => upcoming.slice(1));
    colorsRef.current = next;
    setColors(next);
    touched.current = true;
    recordHistory(next);
  }

  function toggleTheme() {
    writeTheme(theme === "dark" ? "light" : "dark");
  }

  const databaseLabel =
    serverState === "verified"
      ? "Ratios verified in Postgres."
      : serverState === "checking"
        ? "Checking ratios in Postgres."
        : "Ratios are calculated in the browser. Connect Neon to verify them in Postgres.";

  return (
    <>
      <header className="app-header">
        <a className="brand-mark" href="#workspace">
          <span className="brand-kicker">WCAG 2.2</span>
          <span>Accessible Palette</span>
        </a>
        <div className="header-actions">
          <button type="button" className="button button-ghost" aria-pressed={theme === "dark"} onClick={toggleTheme}>
            {theme === "dark" ? "Switch to light" : "Switch to dark"}
          </button>
          {session?.user ? (
            <>
              <span>{session.user.name || session.user.email}</span>
              <button type="button" className="button button-ghost" onClick={() => signOut({ callbackUrl: "/" })}>
                Sign out
              </button>
            </>
          ) : (
            <button
              type="button"
              className="button"
              onClick={() => {
                if (session?.authConfigured) void signIn("google", { callbackUrl: "/" });
                else router.push("/setup");
              }}
            >
              Sign in
            </button>
          )}
        </div>
      </header>
      <main id="workspace" className="shell">
        <p className="sr-only" aria-live="polite">
          {status}
        </p>
        <section className="section" aria-labelledby="build-heading">
          <div className="section-head">
            <h1 id="build-heading">Build a palette</h1>
            <p>
              Set how many colors you need, select a dot, then choose its color. Auto-optimize keeps
              the selected color and darkens the others until white text can sit on them.
            </p>
          </div>
          <div className="workspace-grid">
            <div className="panel">
              <ComboHistory
                colors={colors.map((color) => color.hex)}
                library={library}
                localOnly={sessionReady && !session?.user}
                paletteName={paletteName}
                onRename={(hexes, name) => {
                  if (sameCombo(hexes, colorsRef.current.map((color) => color.hex))) setPaletteName(name);
                  setLibrary((current) => renameHistory(current, hexes, name));
                }}
                onApply={(hexes, name) => {
                  setPaletteName(name);
                  commit(fromHexes(hexes), "restore", name);
                  setStatus("Restored a palette from history.");
                }}
                onLibrary={acceptLibrary}
                onSaved={(place) => setToast({ id: Date.now(), place })}
              />
              <PaletteStage
                colors={colors}
                selected={selected}
                spin={spin}
                smoothColors={liveWheel}
                canUndo={past.length > 0}
                canRedo={future.length > 0}
                onUndo={undo}
                onRedo={redo}
                onShuffle={generate}
                onSelect={setSelected}
              />
              <div className="field">
                <label htmlFor="color-count">Colors in the palette</label>
                <div className="count-slider">
                  <input
                    id="color-count"
                    className="slider"
                    type="range"
                    min={3}
                    max={5}
                    step={1}
                    value={colors.length}
                    aria-valuetext={`${colors.length} colors`}
                    onPointerDown={() => {
                      touched.current = true;
                      if (gesture.current) return;
                      gesture.current = true;
                      remember();
                    }}
                    onPointerUp={finishGesture}
                    onChange={(event) => changeCount(Number(event.target.value))}
                  />
                  <span
                    className="count-tip"
                    aria-hidden="true"
                    style={{ left: `calc(${(colors.length - 3) / 2} * (100% - var(--count-thumb)) + var(--count-thumb) / 2)` }}
                  >
                    {colors.length}
                  </span>
                </div>
              </div>
              <label className="check">
                <input
                  type="checkbox"
                  checked={autoOptimize}
                  onChange={(event) => {
                    const enabled = event.target.checked;
                    setAutoOptimize(enabled);
                    if (!enabled) return;
                    const result = optimizeBrand(colorsRef.current, selected);
                    setNotes(result.notes);
                    commit(result.colors, "edit");
                  }}
                />
                <span>Auto-optimize WCAG</span>
              </label>
              <div className="field">
                <label htmlFor="harmony">Harmony for auto palette</label>
                <select
                  id="harmony"
                  value={harmony}
                  onChange={(event) => {
                    const nextHarmony = event.target.value as Harmony;
                    setHarmony(nextHarmony);
                    applyHarmony(nextHarmony);
                  }}
                >
                  <option value="complementary">Complementary</option>
                  <option value="analogous">Analogous</option>
                  <option value="triadic">Triadic</option>
                  <option value="split-complementary">Split complementary</option>
                  <option value="tetradic">Tetradic</option>
                  <option value="monochromatic">Monochromatic</option>
                </select>
              </div>
              <CategoryRail
                groups={[
                  { label: "Most popular", presets: POPULAR_PRESETS },
                  { label: "Contemporary", presets: CONTEMPORARY_PRESETS },
                  { label: "Classic", presets: CLASSIC_PRESETS },
                  { label: "Light", presets: LIGHT_PRESETS },
                  { label: "Vibrant", presets: VIBRANT_PRESETS },
                  { label: "Monochromatic", presets: MONOCHROMATIC_PRESETS },
                  { label: "Pastel", presets: PASTEL_PRESETS },
                  { label: "High contrast", presets: CONTRAST_PRESETS },
                ]}
                onSelect={applyPreset}
              />
              {notes.length ? (
                <ul className="note-list">
                  {notes.map((note) => (
                    <li key={note}>{note}</li>
                  ))}
                </ul>
              ) : (
                <p className="fine-print">
                  With this on, the dot you are editing stays fixed. The other dots move in lightness
                  first. Hue moves only when two colors would otherwise become the same.
                </p>
              )}
            </div>
            <div className="panel panel-start">
              <h2>Color</h2>
              <ColorPicker
                hex={colors[selected]?.hex ?? "#0c3d66"}
                mode={pickerMode}
                onMode={setPickerMode}
                onGestureStart={() => {
                  touched.current = true;
                  if (gesture.current) return;
                  gesture.current = true;
                  remember();
                }}
                onGestureEnd={finishGesture}
                onChange={updateHex}
              />
              <label className="check">
                <input
                  type="checkbox"
                  checked={liveWheel}
                  onChange={(event) => setLiveWheel(event.target.checked)}
                />
                <span>Live update palette wheel</span>
              </label>
            </div>
          </div>
        </section>

        <section className="section" aria-labelledby="check-heading">
          <div className="section-head">
            <h2 id="check-heading">Check a pair</h2>
            <p>
              Choose a cell in the matrix to put that pair in the badges. {databaseLabel}
            </p>
          </div>
          <Matrix
            snapshot={snapshot}
            pairs={pairs}
            activeKey={activePair ? `${activePair.view}:${activePair.fgKey}:${activePair.bgKey}` : ""}
            library={library}
            localOnly={sessionReady && !session?.user}
            onSelect={(pair) => setActive({ view: pair.view, fgKey: pair.fgKey, bgKey: pair.bgKey })}
            onLibrary={acceptLibrary}
            onSaved={(place) => setToast({ id: Date.now(), place })}
          />
        </section>

        <section className="section" aria-labelledby="preview-heading">
          <div className="section-head">
            <h2 id="preview-heading">Preview</h2>
            <p>
              Light and dark pages use steps derived from the dots. A dark brand color can stay dark
              on a light page and use a lighter step on a dark page.
            </p>
          </div>
          <Preview light={snapshot.light.tokens} dark={snapshot.dark.tokens} />
        </section>

        <section className="section" aria-labelledby="cvd-heading">
          <div className="section-head">
            <h2 id="cvd-heading">Color vision</h2>
          </div>
          <CvdPanel colors={colors} />
        </section>

        <section className="section" id="exports" aria-labelledby="export-heading">
          <div className="section-head">
            <h2 id="export-heading">Export</h2>
          </div>
          <ExportPanel snapshot={snapshot} paletteName={paletteName} />
        </section>

        <section className="section">
          <h2>What a passing badge does not prove</h2>
          <ul className="note-list">
            <li>WCAG contrast uses lightness. Two different hues can pass a ratio and still be confused.</li>
            <li>Placeholder text, focus rings, and link underlines are included because color alone is not a status system.</li>
            <li>Disabled controls are exempt. They are labeled that way instead of marked as a pass.</li>
            <li>CMYK values are not a print contract. A press profile can shift them.</li>
            <li>The color-vision rows are a simulation. They do not replace testing with people.</li>
          </ul>
        </section>
      </main>
      {toast ? (
        <div className="save-toast" role="status">
          <p>
            {toast.place.kind === "matrix" ? "Brand contrast matrix" : "Palette"} saved to{" "}
            <a href={toast.place.href}>{toast.place.name}</a>.
          </p>
          <button type="button" className="save-toast-dismiss" onClick={() => setToast(null)}>
            Dismiss
          </button>
        </div>
      ) : null}
    </>
  );
}
