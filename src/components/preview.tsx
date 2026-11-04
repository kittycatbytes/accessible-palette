"use client";

import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type KeyboardEvent as ReactKeyboardEvent, type ReactNode } from "react";
import {
  collectTemplates,
  nextTemplateName,
  saveTemplateToFavorites,
  saveTemplateToNewProject,
  saveTemplateToProject,
  type PaletteLibrary,
  type SavedPlace,
} from "@/lib/library";
import { readPageView, rememberPageView, type PreviewTemplate } from "@/lib/page-view";
import type { TokenMap } from "@/lib/types";
import { AlertIcon, CheckIcon, CrossIcon } from "./icons";
import { SaveDialog } from "./save-dialog";

const TEMPLATES = [
  { id: "northroom", brand: "Northroom", kind: "Reservation System", nav: ["Visit", "Collection", "Journal"] },
  { id: "marlow", brand: "Marlow Goods", kind: "E-Commerce Site", nav: ["Shop", "New", "Account"] },
  { id: "ashline", brand: "Ashline", kind: "Metrics Dashboard", nav: ["Overview", "Logs", "Alerts"] },
] as const;

type TemplateId = PreviewTemplate;

const REQUESTS: Array<[number, number]> = [
  [8, 74],
  [40, 66],
  [72, 42],
  [104, 48],
  [136, 26],
  [168, 34],
  [200, 20],
  [232, 30],
  [268, 22],
];

const ERRORS: Array<[number, number]> = [
  [8, 90],
  [40, 86],
  [72, 74],
  [104, 78],
  [136, 68],
  [168, 72],
  [200, 58],
  [232, 62],
  [268, 50],
];

const SERVICES = [
  { name: "API", height: "86%", pattern: "pattern-1", token: "primary" },
  { name: "Web", height: "62%", pattern: "pattern-2", token: "secondary" },
  { name: "Jobs", height: "94%", pattern: "pattern-3", token: "accent" },
  { name: "Queue", height: "40%", pattern: "pattern-4", token: "primaryHover" },
] as const;

const LOGS = [
  { time: "09:14", level: "Info", event: "reservation.confirmed", tone: "success" },
  { time: "09:14", level: "Warn", event: "queue.depth 42", tone: "warning" },
  { time: "09:13", level: "Error", event: "payment.timeout", tone: "danger" },
  { time: "09:12", level: "Info", event: "session.started", tone: "success" },
  { time: "09:11", level: "Warn", event: "cache.miss /catalog", tone: "warning" },
] as const;

export function Preview({
  light,
  dark,
  colors,
  paletteName,
  library,
  localOnly,
  onLibrary,
  onSaved,
}: {
  light: TokenMap;
  dark: TokenMap;
  colors: string[];
  paletteName: string;
  library: PaletteLibrary;
  localOnly: boolean;
  onLibrary: (library: PaletteLibrary) => void;
  onSaved: (place: SavedPlace) => void;
}) {
  const [mode, setMode] = useState<"light" | "dark">("light");
  const [templateId, setTemplateId] = useState<TemplateId>("northroom");
  const [saveOpen, setSaveOpen] = useState(false);
  const [suggestedName, setSuggestedName] = useState("");

  useLayoutEffect(() => {
    const view = readPageView();
    if (view.page) setMode(view.page);
    if (view.template) setTemplateId(view.template);
  }, []);

  useEffect(() => {
    rememberPageView({ page: mode, template: templateId });
  }, [mode, templateId]);
  const [open, setOpen] = useState(false);
  const brandRef = useRef<HTMLDivElement>(null);
  const switchRef = useRef<HTMLButtonElement>(null);
  const tokens = mode === "light" ? light : dark;
  const template = TEMPLATES.find((item) => item.id === templateId) ?? TEMPLATES[0];

  useEffect(() => {
    if (!open) return;
    brandRef.current?.querySelector<HTMLButtonElement>('[aria-checked="true"]')?.focus();
    function onPointer(event: PointerEvent) {
      if (!brandRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      setOpen(false);
      switchRef.current?.focus();
    }
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function onMenuKeyDown(event: ReactKeyboardEvent<HTMLDivElement>) {
    const items = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="menuitemradio"]'));
    const index = items.indexOf(document.activeElement as HTMLButtonElement);
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const next = event.key === "ArrowDown" ? index + 1 : index - 1;
      items[(next + items.length) % items.length]?.focus();
    } else if (event.key === "Home") {
      event.preventDefault();
      items[0]?.focus();
    } else if (event.key === "End") {
      event.preventDefault();
      items[items.length - 1]?.focus();
    }
  }

  function openSave() {
    const current = TEMPLATES.find((item) => item.id === templateId) ?? TEMPLATES[0];
    setSuggestedName(
      nextTemplateName(collectTemplates(library), current.id, paletteName, `${current.brand} ${current.kind}`),
    );
    setSaveOpen(true);
  }

  return (
    <div className="stack">
      <div className="preview-tools">
      <div role="tablist" aria-label="Preview page theme" className="tool-row">
        <button
          type="button"
          role="tab"
          id="preview-tab-light"
          className={mode === "light" ? "button" : "button button-ghost"}
          aria-selected={mode === "light"}
          onClick={() => setMode("light")}
        >
          Light page
        </button>
        <button
          type="button"
          role="tab"
          id="preview-tab-dark"
          className={mode === "dark" ? "button" : "button button-ghost"}
          aria-selected={mode === "dark"}
          onClick={() => setMode("dark")}
        >
          Dark page
        </button>
      </div>
      <button type="button" className="button button-ghost combo-save" onClick={openSave}>
        <span aria-hidden="true">+</span>
        Save
      </button>
      </div>
      <div
        role="tabpanel"
        aria-labelledby={mode === "light" ? "preview-tab-light" : "preview-tab-dark"}
        className="preview"
        style={{
          background: tokens.background,
          color: tokens.foreground,
          borderColor: tokens.border,
          ["--site-placeholder" as string]: tokens.placeholder,
          ["--site-focus" as string]: tokens.focus,
        }}
      >
        <article className="site">
          <header className="site-nav">
            <div className="site-brand" ref={brandRef}>
              <span className="site-mark" style={{ color: tokens.foreground }}>
                <span className="site-mark-dot" style={{ background: tokens.primary }} />
                <span>{template.brand}</span>
                <span className="site-mark-kind" style={{ color: tokens.muted }}>
                  {template.kind}
                </span>
              </span>
              <button
                ref={switchRef}
                type="button"
                className="site-switch"
                aria-haspopup="menu"
                aria-expanded={open}
                aria-controls="preview-template-menu"
                aria-label="Choose a preview"
                style={{ color: tokens.foreground }}
                onClick={() => setOpen((value) => !value)}
              >
                <Caret />
              </button>
              {open ? (
                <div
                  role="menu"
                  id="preview-template-menu"
                  aria-label="Preview templates"
                  className="site-menu"
                  style={{ background: tokens.raised, color: tokens.foreground, borderColor: tokens.border }}
                  onKeyDown={onMenuKeyDown}
                >
                  {TEMPLATES.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      role="menuitemradio"
                      aria-checked={item.id === template.id}
                      onClick={() => {
                        setTemplateId(item.id);
                        setOpen(false);
                        switchRef.current?.focus();
                      }}
                    >
                      <span className="site-menu-label">
                        <span>{item.brand}</span>
                        <span className="site-mark-kind" style={{ color: tokens.muted }}>
                          {item.kind}
                        </span>
                      </span>
                      {item.id === template.id ? <CheckIcon /> : null}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
            <nav aria-label="Example site">
              {template.nav.map((label) => (
                <a key={label} href="#preview-heading" style={{ color: tokens.link }}>
                  {label}
                </a>
              ))}
            </nav>
          </header>

          {template.id === "northroom" ? <Northroom tokens={tokens} /> : null}
          {template.id === "marlow" ? <Marlow tokens={tokens} /> : null}
          {template.id === "ashline" ? <Ashline tokens={tokens} /> : null}

          <footer className="site-foot" style={{ color: tokens.muted, borderColor: tokens.border }}>
            <span className="site-foot-name" style={{ color: tokens.foreground }}>
              {template.brand}{" "}
              <span className="site-mark-kind" style={{ color: tokens.muted }}>
                {template.kind}
              </span>
            </span>
            <span>A page composed from this palette.</span>
          </footer>
        </article>
      </div>
      <SaveDialog
        open={saveOpen}
        title="Save template"
        nameLabel="Name"
        destinationLegend="Where should this template go?"
        paletteName={suggestedName}
        library={library}
        localOnly={localOnly}
        onDismiss={() => setSaveOpen(false)}
        onSubmit={({ destination, projectName, projectId, paletteName: nextName }) => {
          const draft = {
            name: nextName,
            template: templateId,
            page: mode,
            colors,
            paletteName,
          };
          const result =
            destination === "favorites"
              ? saveTemplateToFavorites(library, draft)
              : destination === "new"
                ? saveTemplateToNewProject(library, draft, projectName)
                : saveTemplateToProject(library, draft, projectId);
          if (!result.ok) return result.message;
          onLibrary(result.library);
          onSaved(result.place);
          return null;
        }}
      />
    </div>
  );
}

function Northroom({ tokens }: { tokens: TokenMap }) {
  const charts = [1, 2, 3, 4, 5]
    .map((index) => tokens[`chart${index}`])
    .filter((hex): hex is string => Boolean(hex));
  const series = ["Morning", "Gallery", "Evening", "Archive", "Courtyard"];

  return (
    <>
      <section className="site-hero">
        <div className="site-copy">
          <p className="site-kicker" style={{ color: tokens.muted }}>
            Open this season
          </p>
          <h3 className="site-title">A room with the light left on.</h3>
          <p className="site-lead">
            The north room keeps the morning longer than the rest of the house. Visits run Thursday
            through Sunday while the season is open.
          </p>
          <p>
            <a className="site-link" href="#preview-heading" style={{ color: tokens.link }}>
              Underlined link
            </a>
            <span style={{ color: tokens.muted }}>
              {" "}
              keeps the link from depending on color alone. The matrix still reports link contrast
              against the surrounding text.
            </span>
          </p>
        </div>

        <aside className="site-feature" style={{ borderColor: tokens.border }} aria-label="Featured room">
          <div className="site-feature-top" style={{ background: tokens.primary, color: tokens.primaryForeground }}>
            <p className="site-kicker">Now open</p>
            <p className="site-feature-mark">08</p>
          </div>
          <div className="site-feature-body" style={{ background: tokens.surface, color: tokens.foreground }}>
            <p>A sitting for eight. People book it for the light.</p>
            <p style={{ color: tokens.muted }}>Thursday through Sunday.</p>
          </div>
        </aside>

        <div className="site-actions-block">
          <div className="site-actions">
            <button type="button" style={buttonStyle(tokens.primary, tokens.primaryForeground)}>
              Reserve
            </button>
            <button type="button" style={buttonStyle(tokens.primaryHover, tokens.primaryHoverForeground)}>
              Tour
            </button>
            <button
              type="button"
              style={{
                ...buttonStyle(tokens.primary, tokens.primaryForeground),
                outline: `3px solid ${tokens.focus}`,
                outlineOffset: "3px",
              }}
            >
              Details
            </button>
            <button type="button" aria-disabled="true" style={buttonStyle(tokens.disabled, tokens.disabledForeground, true)}>
              Waitlist
            </button>
          </div>
          <p className="site-note" style={{ color: tokens.muted }}>
            Reserve is primary. Tour uses the hover colors. Details carries the focus ring. Waitlist is
            disabled, and disabled controls are exempt from contrast.
          </p>
        </div>
      </section>

      <div className="site-grid">
        <form
          className="site-panel"
          style={{ background: tokens.raised, borderColor: tokens.border, color: tokens.foreground }}
          onSubmit={(event) => event.preventDefault()}
        >
          <h3>Ask for a room</h3>
          <p style={{ color: tokens.muted }}>A short note is enough. The field uses the page colors.</p>
          <label htmlFor="preview-email">Email address</label>
          <input
            id="preview-email"
            type="email"
            placeholder="name@example.com"
            style={{
              background: tokens.background,
              color: tokens.foreground,
              borderColor: tokens.border,
            }}
          />
          <p className="site-note" style={{ color: tokens.placeholder }}>
            Placeholder text uses the secondary text color so it meets AA.
          </p>
          <button type="submit" style={buttonStyle(tokens.secondary, tokens.secondaryForeground)}>
            Save
          </button>
        </form>

        <section
          className="site-panel"
          style={{ background: tokens.surface, borderColor: tokens.border }}
          aria-labelledby="preview-chart"
        >
          <h3 id="preview-chart">This week</h3>
          <p style={{ color: tokens.muted }}>Each series has a name, a pattern, and a color.</p>
          <div role="img" aria-label="Chart series identified by label, pattern, and color." className="chart">
            {charts.map((hex, index) => (
              <div key={`${hex}-${index}`} className="chart-row">
                <span>{series[index] ?? `Series ${index + 1}`}</span>
                <span className="bar-track">
                  <span
                    className={`bar pattern-${(index % 4) + 1}`}
                    style={{ backgroundColor: hex, width: `${92 - index * 10}%` }}
                  />
                </span>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="site-notices" aria-label="Notices">
        <h3>Notices</h3>
        <div className="site-status-row">
          <Status text="Your visit is reserved." icon={<CheckIcon />} fill={tokens.success} ink={tokens.successForeground} />
          <Status text="Check the date before you reserve." icon={<AlertIcon />} fill={tokens.warning} ink={tokens.warningForeground} />
          <Status text="That request could not be sent." icon={<CrossIcon />} fill={tokens.danger} ink={tokens.dangerForeground} />
        </div>
      </section>
    </>
  );
}

function Marlow({ tokens }: { tokens: TokenMap }) {
  const products = [
    {
      name: "Ceramic lamp",
      price: "$86",
      note: "Small batch",
      art: <LampIcon shade={tokens.primary} stem={tokens.foreground} base={tokens.secondary} />,
    },
    {
      name: "Linen throw",
      price: "$64",
      note: "Two left",
      art: <ThrowIcon field={tokens.accent} fold={tokens.primary} stripe={tokens.secondary} />,
    },
    {
      name: "Oak tray",
      price: "$42",
      note: "In stock",
      art: <TrayIcon body={tokens.secondary} well={tokens.background} rim={tokens.accent} />,
    },
    {
      name: "Glass pitcher",
      price: "$38",
      note: "In stock",
      art: <PitcherIcon body={tokens.primary} rim={tokens.accent} handle={tokens.secondary} />,
    },
  ];

  return (
    <>
      <section className="site-hero">
        <div className="site-copy">
          <p className="site-kicker" style={{ color: tokens.muted }}>
            In the shop
          </p>
          <h3 className="site-title">Goods for the long morning.</h3>
          <p className="site-lead">
            Linen, ceramic, and oak for rooms that keep the light. The drawings use this palette, and
            the names stay with them.
          </p>
          <p>
            <a className="site-link" href="#preview-heading" style={{ color: tokens.link }}>
              Underlined link
            </a>
            <span style={{ color: tokens.muted }}> keeps the catalog from depending on color alone.</span>
          </p>
        </div>

        <aside className="site-feature" style={{ borderColor: tokens.border }} aria-label="Featured lamp">
          <div className="feature-art" style={{ background: tokens.surface }}>
            <LampIcon shade={tokens.primary} stem={tokens.foreground} base={tokens.secondary} />
          </div>
          <div className="site-feature-body" style={{ background: tokens.raised, color: tokens.foreground }}>
            <p>Ceramic lamp, featured this week.</p>
            <p style={{ color: tokens.muted }}>$86 · fires in small batches.</p>
          </div>
        </aside>

        <div className="site-actions-block">
          <div className="site-actions">
            <button type="button" style={buttonStyle(tokens.primary, tokens.primaryForeground)}>
              Add to bag
            </button>
            <button type="button" style={buttonStyle(tokens.primaryHover, tokens.primaryHoverForeground)}>
              Lookbook
            </button>
            <button
              type="button"
              style={{
                ...buttonStyle(tokens.primary, tokens.primaryForeground),
                outline: `3px solid ${tokens.focus}`,
                outlineOffset: "3px",
              }}
            >
              Gift note
            </button>
            <button type="button" aria-disabled="true" style={buttonStyle(tokens.disabled, tokens.disabledForeground, true)}>
              Sold out
            </button>
          </div>
          <p className="site-note" style={{ color: tokens.muted }}>
            Add to bag is primary. Lookbook uses the hover colors. Gift note carries the focus ring. Sold
            out is disabled.
          </p>
        </div>
      </section>

      <div className="product-grid">
        {products.map((product) => (
          <article key={product.name} className="product-card" style={{ background: tokens.surface, borderColor: tokens.border }}>
            <div className="product-art" style={{ background: tokens.raised }} aria-hidden="true">
              {product.art}
            </div>
            <h3 className="product-name">{product.name}</h3>
            <p className="product-meta">
              {product.price} <span style={{ color: tokens.muted }}>· {product.note}</span>
            </p>
            <button type="button" style={buttonStyle(tokens.secondary, tokens.secondaryForeground)}>
              Add
            </button>
          </article>
        ))}
      </div>

      <div className="site-grid">
        <section className="site-panel" style={{ background: tokens.raised, borderColor: tokens.border }} aria-labelledby="preview-bag">
          <h3 id="preview-bag">In the bag</h3>
          <ul className="bag-list">
            <li className="bag-row">
              <span className="bag-art" style={{ background: tokens.surface }} aria-hidden="true">
                <LampIcon shade={tokens.primary} stem={tokens.foreground} base={tokens.secondary} />
              </span>
              <span>
                Ceramic lamp
                <br />
                <span style={{ color: tokens.muted }}>$86</span>
              </span>
            </li>
            <li className="bag-row">
              <span className="bag-art" style={{ background: tokens.surface }} aria-hidden="true">
                <ThrowIcon field={tokens.accent} fold={tokens.primary} stripe={tokens.secondary} />
              </span>
              <span>
                Linen throw
                <br />
                <span style={{ color: tokens.muted }}>$64</span>
              </span>
            </li>
          </ul>
          <p className="bag-total">
            <span>Subtotal</span>
            <span>$150</span>
          </p>
          <button type="button" style={buttonStyle(tokens.primary, tokens.primaryForeground)}>
            Checkout
          </button>
        </section>

        <form
          className="site-panel"
          style={{ background: tokens.surface, borderColor: tokens.border, color: tokens.foreground }}
          onSubmit={(event) => event.preventDefault()}
        >
          <h3>Gift code</h3>
          <p style={{ color: tokens.muted }}>The field uses the page colors, including the placeholder.</p>
          <label htmlFor="preview-code">Code</label>
          <input
            id="preview-code"
            type="text"
            placeholder="NORTH-LIGHT"
            style={{ background: tokens.background, color: tokens.foreground, borderColor: tokens.border }}
          />
          <p className="site-note" style={{ color: tokens.placeholder }}>
            Placeholder text uses the secondary text color so it meets AA.
          </p>
          <button type="submit" style={buttonStyle(tokens.secondary, tokens.secondaryForeground)}>
            Apply
          </button>
        </form>
      </div>

      <section className="site-notices" aria-label="Notices">
        <h3>Notices</h3>
        <div className="site-status-row">
          <Status text="Your order is confirmed." icon={<CheckIcon />} fill={tokens.success} ink={tokens.successForeground} />
          <Status text="The linen throw is down to two." icon={<AlertIcon />} fill={tokens.warning} ink={tokens.warningForeground} />
          <Status text="That gift code could not be applied." icon={<CrossIcon />} fill={tokens.danger} ink={tokens.dangerForeground} />
        </div>
      </section>
    </>
  );
}

function Ashline({ tokens }: { tokens: TokenMap }) {
  return (
    <>
      <section className="dash" aria-label="Metrics overview">
        <div className="kpi-row">
          <Kpi tokens={tokens} label="Requests" value="18.4k" note="+6% today" tone={tokens.primary} />
          <Kpi tokens={tokens} label="Error rate" value="0.42%" note="Within budget" tone={tokens.danger} />
          <Kpi tokens={tokens} label="p95 latency" value="240 ms" note="Steady since noon" tone={tokens.secondary} />
          <Kpi tokens={tokens} label="Sessions" value="1,204" note="+18 open now" tone={tokens.accent} />
        </div>

        <div className="dash-grid">
          <section className="site-panel" style={{ background: tokens.surface, borderColor: tokens.border }} aria-labelledby="preview-volume">
            <h3 id="preview-volume">Request volume</h3>
            <p style={{ color: tokens.muted }}>A solid line for requests. A dashed line for errors.</p>
            <VolumeChart tokens={tokens} />
            <p className="chart-scale" style={{ color: tokens.muted }}>
              <span>12a</span>
              <span>6a</span>
              <span>12p</span>
              <span>6p</span>
              <span>Now</span>
            </p>
            <ul className="legend">
              <li>
                <span className="legend-swatch" style={{ background: tokens.primary }} />
                Requests
              </li>
              <li>
                <span className="legend-swatch dashed" style={{ background: tokens.secondary }} />
                Errors
              </li>
            </ul>
          </section>

          <section className="site-panel" style={{ background: tokens.raised, borderColor: tokens.border }} aria-labelledby="preview-services">
            <h3 id="preview-services">By service</h3>
            <p style={{ color: tokens.muted }}>Each bar has a name, a pattern, and a color.</p>
            <div className="vbars" role="img" aria-label="API is high, Web is mid, Jobs is highest, and Queue is low.">
              {SERVICES.map((service) => (
                <div key={service.name} className="vbar">
                  <div className="vbar-plot">
                    <span
                      className={`vbar-fill ${service.pattern}`}
                      style={{ height: service.height, backgroundColor: tokens[service.token] }}
                    />
                  </div>
                  <span className="vbar-label">{service.name}</span>
                </div>
              ))}
            </div>
          </section>
        </div>

        <section className="site-panel" style={{ background: tokens.surface, borderColor: tokens.border }} aria-labelledby="preview-logs">
          <h3 id="preview-logs">Recent logs</h3>
          <p style={{ color: tokens.muted }}>Level is written out. Color repeats it, and does not replace it.</p>
          <form onSubmit={(event) => event.preventDefault()}>
            <label htmlFor="preview-log-filter">Filter logs</label>
            <input
              id="preview-log-filter"
              type="text"
              placeholder="payment, queue, session"
              style={{ background: tokens.background, color: tokens.foreground, borderColor: tokens.border }}
            />
          </form>
          <table className="log-table">
            <thead>
              <tr style={{ color: tokens.muted }}>
                <th scope="col">Time</th>
                <th scope="col">Level</th>
                <th scope="col">Event</th>
              </tr>
            </thead>
            <tbody>
              {LOGS.map((row) => (
                <tr key={`${row.time}-${row.event}`}>
                  <td>{row.time}</td>
                  <td>
                    <span className="level-pill" style={{ background: tokens[row.tone], color: tokens[`${row.tone}Foreground`] }}>
                      {row.level}
                    </span>
                  </td>
                  <td>{row.event}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <div className="site-actions">
          <button type="button" style={buttonStyle(tokens.primary, tokens.primaryForeground)}>
            Refresh
          </button>
          <button type="button" style={buttonStyle(tokens.primaryHover, tokens.primaryHoverForeground)}>
            Compare
          </button>
          <button
            type="button"
            style={{
              ...buttonStyle(tokens.primary, tokens.primaryForeground),
              outline: `3px solid ${tokens.focus}`,
              outlineOffset: "3px",
            }}
          >
            Pin
          </button>
          <button type="button" aria-disabled="true" style={buttonStyle(tokens.disabled, tokens.disabledForeground, true)}>
            Share
          </button>
        </div>
        <p className="site-note" style={{ color: tokens.muted }}>
          Refresh is primary. Compare uses the hover colors. Pin carries the focus ring. Share is disabled.
        </p>
      </section>

      <section className="site-notices" aria-label="Notices">
        <h3>Notices</h3>
        <div className="site-status-row">
          <Status text="The morning deploy finished." icon={<CheckIcon />} fill={tokens.success} ink={tokens.successForeground} />
          <Status text="The error budget is close." icon={<AlertIcon />} fill={tokens.warning} ink={tokens.warningForeground} />
          <Status text="One check failed to report." icon={<CrossIcon />} fill={tokens.danger} ink={tokens.dangerForeground} />
        </div>
      </section>
    </>
  );
}

function Kpi({
  tokens,
  label,
  value,
  note,
  tone,
}: {
  tokens: TokenMap;
  label: string;
  value: string;
  note: string;
  tone: string;
}) {
  return (
    <article className="kpi" style={{ background: tokens.surface, borderColor: tokens.border }}>
      <span className="kpi-bar" style={{ background: tone }} />
      <p className="kpi-label" style={{ color: tokens.muted }}>
        {label}
      </p>
      <p className="kpi-value">{value}</p>
      <p className="kpi-note" style={{ color: tokens.muted }}>
        {note}
      </p>
    </article>
  );
}

function VolumeChart({ tokens }: { tokens: TokenMap }) {
  const requests = linePath(REQUESTS);
  const area = `${requests} L 268 100 L 8 100 Z`;
  return (
    <svg
      className="chart-svg"
      viewBox="0 0 276 108"
      role="img"
      aria-label="Requests rise through the morning, dip after noon, and peak again before now. Errors stay lower and climb slowly."
    >
      {[28, 58, 88].map((y) => (
        <line key={y} x1="8" x2="268" y1={y} y2={y} stroke={tokens.border} strokeWidth="1" />
      ))}
      <path d={area} fill={tokens.primary} fillOpacity="0.16" />
      <path d={linePath(ERRORS)} fill="none" stroke={tokens.secondary} strokeWidth="2.5" strokeDasharray="6 5" strokeLinecap="round" />
      <path d={requests} fill="none" stroke={tokens.primary} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function linePath(points: Array<[number, number]>) {
  return points.map((point, index) => `${index === 0 ? "M" : "L"}${point[0]} ${point[1]}`).join(" ");
}

function LampIcon({ shade, stem, base }: { shade: string; stem: string; base: string }) {
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true">
      <path d="M12 32 23 8h18l11 24z" fill={shade} />
      <path d="M30 32h4v16h-4z" fill={stem} />
      <rect x="16" y="48" width="32" height="6" rx="3" fill={base} />
    </svg>
  );
}

function ThrowIcon({ field, fold, stripe }: { field: string; fold: string; stripe: string }) {
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true">
      <path d="M8 18h40v30H8z" fill={field} />
      <path d="M48 18 60 27 48 48z" fill={fold} />
      <path d="M20 18v30M32 18v30" stroke={stripe} strokeWidth="4" />
    </svg>
  );
}

function TrayIcon({ body, well, rim }: { body: string; well: string; rim: string }) {
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true">
      <rect x="6" y="18" width="52" height="28" rx="8" fill={body} />
      <rect x="14" y="26" width="36" height="12" rx="4" fill={well} />
      <rect x="10" y="18" width="44" height="5" rx="2" fill={rim} />
    </svg>
  );
}

function PitcherIcon({ body, rim, handle }: { body: string; rim: string; handle: string }) {
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true">
      <path d="M16 18h24l4 32H18z" fill={body} />
      <path d="M16 16h26v6H16z" fill={rim} />
      <path d="M40 24c8 2 10 12 4 18" fill="none" stroke={handle} strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}

function Caret() {
  return (
    <svg className="site-caret" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M6.5 9.5 12 15l5.5-5.5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function buttonStyle(background: string, color: string, quiet = false): CSSProperties {
  return {
    background,
    color,
    border: "2px solid transparent",
    borderRadius: "999px",
    minHeight: "44px",
    padding: "0.55rem 1.05rem",
    font: "inherit",
    fontWeight: 620,
    cursor: quiet ? "default" : "pointer",
  };
}

function Status({
  text,
  icon,
  fill,
  ink,
}: {
  text: string;
  icon: ReactNode;
  fill: string;
  ink: string;
}) {
  return (
    <p className="status-banner" style={{ background: fill, color: ink }}>
      {icon}
      <span>{text}</span>
    </p>
  );
}
