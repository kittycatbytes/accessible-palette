"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { formatRatio, oklchToHex, pairWord, readOklch } from "@/lib/color";
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
import { flushPageView, PAGE_SECTIONS, readPageView, rememberPageView } from "@/lib/page-view";
import { buildSnapshot, listPairs } from "@/lib/snapshot";
import type { BrandColor, ContrastPair, Harmony, PickerMode } from "@/lib/types";
import { ColorPicker, HslBars } from "./color-picker";
import { InfoIcon } from "./icons";
import { CvdPanel } from "./cvd-panel";
import { ExportPanel } from "./export-panel";
import { CategoryRail } from "./flyout";
import { ComboHistory } from "./combo-history";
import { Matrix } from "./matrix";
import { PaletteStage } from "./palette-stage";
import { Preview } from "./preview";
import { writeTheme } from "./site-header";

type SessionInfo = {
  authConfigured: boolean;
  database: string;
  user: { id: string; name: string; email: string } | null;
};

const HARMONY_OPTIONS: { value: Harmony; label: string }[] = [
  { value: "complementary", label: "Complementary" },
  { value: "analogous", label: "Analogous" },
  { value: "triadic", label: "Triadic" },
  { value: "split-complementary", label: "Split complementary" },
  { value: "tetradic", label: "Tetradic" },
  { value: "monochromatic", label: "Monochromatic" },
];

function MenuCaret() {
  return (
    <svg className="build-caret" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M6.5 9.5 12 15l5.5-5.5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function FoldSection({
  id,
  title,
  subtitle,
  open,
  onToggle,
  children,
}: {
  id: string;
  title: string;
  subtitle: ReactNode;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <section className="panel fold-panel" aria-labelledby={id}>
      <div className="section-head section-fold">
        <h2 id={id}>
          <button
            type="button"
            className="section-fold-toggle"
            aria-expanded={open}
            aria-controls={`${id}-panel`}
            onClick={onToggle}
          >
            <span className="section-fold-copy">
              <span className="section-fold-title">{title}</span>
              <span className="section-fold-sub">{subtitle}</span>
            </span>
            <svg className={open ? "chevron chevron-up" : "chevron"} viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M6 9.5 12 15.5 18 9.5"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </h2>
      </div>
      {open ? <div id={`${id}-panel`}>{children}</div> : null}
    </section>
  );
}

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

export function Workspace() {
  const [colors, setColors] = useState<BrandColor[]>(() => fromHexes(POPULAR_PRESETS[0].colors));
  const [selected, setSelected] = useState(0);
  const [autoOptimize, setAutoOptimize] = useState(true);
  const [pickerMode, setPickerMode] = useState<PickerMode>("cube");
  const [harmony, setHarmony] = useState<Harmony>("analogous");
  const [liveWheel, setLiveWheel] = useState(false);
  const [colorsOpen, setColorsOpen] = useState(false);
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const [harmonyOpen, setHarmonyOpen] = useState(false);
  const [harmonyAbove, setHarmonyAbove] = useState(false);
  const harmonyMenuRef = useRef<HTMLDivElement>(null);
  const [checkOpen, setCheckOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
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
  const [session, setSession] = useState<SessionInfo | null>(null);
  const [sessionReady, setSessionReady] = useState(false);
  const [library, setLibrary] = useState<PaletteLibrary>(EMPTY_LIBRARY);
  const [libraryReady, setLibraryReady] = useState(false);
  const [toast, setToast] = useState<{ id: number; place: SavedPlace } | null>(null);
  const [paletteName, setPaletteName] = useState("Harbor");
  const colorsRef = useRef(colors);
  const spareRef = useRef<BrandColor[]>([]);
  const gesture = useRef(false);
  const gestureKind = useRef<"color" | "count" | null>(null);
  const gestureHex = useRef<string | null>(null);
  const touched = useRef(false);
  const [past, setPast] = useState<BrandColor[][]>([]);
  const [future, setFuture] = useState<BrandColor[][]>([]);
  colorsRef.current = colors;

  useEffect(() => {
    if (!harmonyOpen) return;
    function onPointer(event: PointerEvent) {
      if (!harmonyMenuRef.current?.contains(event.target as Node)) setHarmonyOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setHarmonyOpen(false);
    }
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [harmonyOpen]);

  useLayoutEffect(() => {
    if (!harmonyOpen || !harmonyMenuRef.current) return;
    const button = harmonyMenuRef.current.getBoundingClientRect();
    const list = harmonyMenuRef.current.querySelector(".build-harmony-list");
    const listHeight = list?.getBoundingClientRect().height ?? 0;
    const spaceBelow = window.innerHeight - button.bottom;
    const spaceAbove = button.top;
    setHarmonyAbove(spaceBelow < listHeight + 8 && spaceAbove > spaceBelow);
  }, [harmonyOpen]);

  useLayoutEffect(() => {
    const view = readPageView();
    if (view.colors) {
      touched.current = true;
      const numbered = renumber(fromHexes(view.colors));
      colorsRef.current = numbered;
      setColors(numbered);
      if (view.name) setPaletteName(view.name);
      if (typeof view.dot === "number") setSelected(Math.min(view.dot, numbered.length - 1));
      setStatus("Opened from a shared link.");
    } else if (view.name) {
      setPaletteName(view.name);
    }
    if (view.pair) setActive({ view: "brand", fgKey: view.pair.fg, bgKey: view.pair.bg });
    if (view.theme) writeTheme(view.theme);
    if (view.section === "check-heading" || window.location.hash === "#required-checks") setCheckOpen(true);
    if (view.section === "preview-heading") setPreviewOpen(true);
  }, []);

  useEffect(() => {
    if (gesture.current) return;
    rememberPageView({
      colors: colors.map((color) => color.hex),
      name: paletteName,
      dot: selected,
      pair: active ? { fg: active.fgKey, bg: active.bgKey } : undefined,
    });
  }, [colors, paletteName, selected, active]);

  useEffect(() => {
    const nodes = PAGE_SECTIONS.map((id) => document.getElementById(id)).filter((node): node is HTMLElement => Boolean(node));
    if (!nodes.length) return;
    let armed = !readPageView().section;
    function arm() {
      armed = true;
    }
    window.addEventListener("scroll", arm, { once: true, passive: true });
    const observer = new IntersectionObserver(
      (entries) => {
        if (!armed) return;
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible?.target.id) rememberPageView({ section: visible.target.id as (typeof PAGE_SECTIONS)[number] });
      },
      { rootMargin: "-12% 0px -55% 0px", threshold: [0.15, 0.4] },
    );
    nodes.forEach((node) => observer.observe(node));
    return () => {
      window.removeEventListener("scroll", arm);
      observer.disconnect();
    };
  }, []);

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
  const firstPair =
    pairs.find((pair) => pair.view === "brand" && pair.required && !pair.exempt && pair.aaNormal && pair.nonText) ??
    pairs.find((pair) => pair.view === "brand" && pair.required);
  const firstRating = firstPair ? (firstPair.exempt ? "Exempt" : pairWord(firstPair)) : "—";
  const firstRatio = firstPair ? `${formatRatio(firstPair.ratio)}:1` : "—";

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
          templates: current.templates.length ? current.templates : seeded.templates,
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

  function settlePalette(source: BrandColor[]) {
    const anchor = Math.min(selected, source.length - 1);
    const arranged = fromHexes(paletteFromHarmony(source.map((color) => color.hex), anchor, harmony));
    return autoOptimize ? optimizeBrand(arranged, anchor) : { colors: arranged, notes: [] };
  }

  function finishGesture() {
    if (!gesture.current) return;
    const kind = gestureKind.current;
    const started = gestureHex.current;
    const anchor = Math.min(selected, colorsRef.current.length - 1);
    const ended = colorsRef.current[anchor]?.hex ?? null;
    if (kind === "color" && !liveWheel && started && ended && started !== ended) {
      const result = settlePalette(colorsRef.current);
      setNotes(result.notes);
      commit(result.colors, "edit");
    }
    gesture.current = false;
    gestureKind.current = null;
    gestureHex.current = null;
    recordHistory(colorsRef.current);
    rememberPageView({
      colors: colorsRef.current.map((color) => color.hex),
      name: paletteName,
      dot: selected,
      pair: active ? { fg: active.fgKey, bg: active.bgKey } : undefined,
    });
    flushPageView();
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
    // Live update rebuilds the other dots while the pointer moves. Otherwise
    // only the selected dot follows the drag, and the rest update on release.
    if (!liveWheel && gesture.current && gestureKind.current === "color") {
      commit(seeded, "edit");
      return;
    }
    const result = settlePalette(seeded);
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

  function beginColorGesture() {
    touched.current = true;
    if (gesture.current) return;
    gesture.current = true;
    gestureKind.current = "color";
    const anchor = Math.min(selected, colorsRef.current.length - 1);
    gestureHex.current = colorsRef.current[anchor]?.hex ?? null;
    remember();
  }

  function colorCountField(id: string) {
    return (
      <div className="field" id={`${id}-panel`}>
        <label htmlFor={id}>Colors in the palette</label>
        <div className="count-slider">
          <input
            id={id}
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
              gestureKind.current = "count";
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
    );
  }

  function chooseHarmony(nextHarmony: Harmony) {
    setHarmony(nextHarmony);
    applyHarmony(nextHarmony);
    setHarmonyOpen(false);
  }

  function harmonyField(id: string, compact: boolean) {
    if (!compact) {
      return (
        <div className="field">
          <label htmlFor={id}>Harmony for auto palette</label>
          <select id={id} value={harmony} onChange={(event) => chooseHarmony(event.target.value as Harmony)}>
            {HARMONY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      );
    }
    return (
      <div
        className={harmonyOpen ? "build-menu build-harmony is-open" : "build-menu build-harmony"}
        ref={harmonyMenuRef}
      >
        <button
          type="button"
          className="build-menu-hit"
          aria-haspopup="listbox"
          aria-expanded={harmonyOpen}
          aria-controls="harmony-mobile-list"
          onClick={() => setHarmonyOpen((open) => !open)}
        >
          <span>Harmony</span>
          <MenuCaret />
        </button>
        {harmonyOpen ? (
          <ul
            id="harmony-mobile-list"
            role="listbox"
            aria-label="Harmony"
            className={harmonyAbove ? "build-harmony-list is-above" : "build-harmony-list"}
          >
            {HARMONY_OPTIONS.map((option) => (
              <li key={option.value} role="none">
                <button
                  type="button"
                  role="option"
                  className="build-harmony-option"
                  aria-selected={harmony === option.value}
                  onClick={() => chooseHarmony(option.value)}
                >
                  {option.label}
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    );
  }

  function templateRail() {
    return (
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
    );
  }

  const databaseLabel =
    serverState === "verified"
      ? "Ratios verified in Postgres."
      : serverState === "checking"
        ? "Checking ratios in Postgres."
        : "Ratios are calculated in the browser. Connect Neon to verify them in Postgres.";

  return (
    <>
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
              <div className="stage-row">
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
                <div className="stage-bars">
                  <HslBars
                    hex={colors[selected]?.hex ?? "#0c3d66"}
                    onGestureStart={beginColorGesture}
                    onGestureEnd={finishGesture}
                    onChange={updateHex}
                  />
                  <label className="check live-update">
                    <input
                      type="checkbox"
                      checked={liveWheel}
                      onChange={(event) => setLiveWheel(event.target.checked)}
                    />
                    <span>Live update</span>
                  </label>
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
              <div className="build-desktop">
                {colorCountField("color-count")}
                {harmonyField("harmony", false)}
                {templateRail()}
              </div>
              <div className="build-mobile">
                <div className="build-row">
                  <button
                    type="button"
                    className={colorsOpen ? "build-menu is-open" : "build-menu"}
                    aria-expanded={colorsOpen}
                    aria-controls="color-count-mobile-panel"
                    onClick={() => setColorsOpen((open) => !open)}
                  >
                    <span>Colors</span>
                    <MenuCaret />
                  </button>
                  {harmonyField("harmony-mobile", true)}
                  <button
                    type="button"
                    className={templatesOpen ? "build-menu is-open" : "build-menu"}
                    aria-expanded={templatesOpen}
                    aria-controls="template-panel"
                    onClick={() => setTemplatesOpen((open) => !open)}
                  >
                    <span>Template</span>
                    <MenuCaret />
                  </button>
                </div>
                {colorsOpen ? colorCountField("color-count-mobile") : null}
                {templatesOpen ? <div id="template-panel">{templateRail()}</div> : null}
              </div>
              <div className="pair-check">
                <a
                  className="pair-check-link"
                  href="#required-checks"
                  onClick={(event) => {
                    event.preventDefault();
                    if (firstPair) setActive({ view: firstPair.view, fgKey: firstPair.fgKey, bgKey: firstPair.bgKey });
                    setCheckOpen(true);
                    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
                    window.requestAnimationFrame(() => {
                      document.getElementById("required-checks")?.scrollIntoView({
                        behavior: reduce ? "auto" : "smooth",
                        block: "start",
                      });
                    });
                  }}
                >
                  First Pair Check:
                </a>
                <p className="pair-check-line">
                  <a className="info-link" href="/about#level-a-aa-and-aaa">
                    <InfoIcon />
                    <span className="sr-only">How levels A, AA, and AAA work</span>
                  </a>
                  <span>
                    Rating: <strong>{firstRating}</strong>
                  </span>
                </p>
                <p className="pair-check-line">
                  <a className="info-link" href="/about#contrast-ratio">
                    <InfoIcon />
                    <span className="sr-only">How the contrast ratio is calculated</span>
                  </a>
                  <span>
                    Ratio: <strong className="mono">{firstRatio}</strong>
                  </span>
                </p>
              </div>
            </div>
            <div className="panel panel-start">
              <h2>Color</h2>
              <ColorPicker
                hex={colors[selected]?.hex ?? "#0c3d66"}
                mode={pickerMode}
                onMode={setPickerMode}
                onGestureStart={beginColorGesture}
                onGestureEnd={finishGesture}
                onChange={updateHex}
              />
              <label className="check">
                <input
                  type="checkbox"
                  checked={liveWheel}
                  onChange={(event) => setLiveWheel(event.target.checked)}
                />
                <span>Live update</span>
              </label>
            </div>
          </div>
        </section>

        <div className="fold-stack">
        <FoldSection
          id="check-heading"
          title="Check a pair"
          subtitle={
            <>
              Choose a cell in the matrix to put that pair in the badges. {databaseLabel}
            </>
          }
          open={checkOpen}
          onToggle={() => setCheckOpen((open) => !open)}
        >
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
        </FoldSection>

        <FoldSection
          id="preview-heading"
          title="Preview as Site Template"
          subtitle="Preview this color palette as a mock website (Basic, E-Commerce, or Dashboard)."
          open={previewOpen}
          onToggle={() => setPreviewOpen((open) => !open)}
        >
          <Preview
            light={snapshot.light.tokens}
            dark={snapshot.dark.tokens}
            colors={colors.map((color) => color.hex)}
            paletteName={paletteName}
            library={library}
            localOnly={sessionReady && !session?.user}
            onLibrary={acceptLibrary}
            onSaved={(place) => setToast({ id: Date.now(), place })}
          />
        </FoldSection>
        </div>

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
            {toast.place.kind === "matrix" ? "Brand contrast matrix" : toast.place.kind === "template" ? "Template" : "Palette"} saved to{" "}
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
