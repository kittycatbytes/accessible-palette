"use client";

import { useState, type CSSProperties, type ReactNode } from "react";
import type { TokenMap } from "@/lib/types";
import { AlertIcon, CheckIcon, CrossIcon } from "./icons";

export function Preview({ light, dark }: { light: TokenMap; dark: TokenMap }) {
  const [mode, setMode] = useState<"light" | "dark">("light");
  const tokens = mode === "light" ? light : dark;
  const charts = [1, 2, 3, 4, 5]
    .map((index) => tokens[`chart${index}`])
    .filter((hex): hex is string => Boolean(hex));
  return (
    <div className="stack">
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
      <div
        role="tabpanel"
        aria-labelledby={mode === "light" ? "preview-tab-light" : "preview-tab-dark"}
        className="preview"
        style={{
          background: tokens.background,
          color: tokens.foreground,
          borderColor: tokens.border,
        }}
      >
        <div className="preview-card" style={{ background: tokens.surface, borderColor: tokens.border }}>
          <h3>Component states</h3>
          <div className="tool-row">
            <button type="button" style={buttonStyle(tokens.primary, tokens.primaryForeground)}>
              Primary
            </button>
            <button type="button" style={buttonStyle(tokens.primaryHover, tokens.primaryHoverForeground)}>
              Hover
            </button>
            <button
              type="button"
              style={{
                ...buttonStyle(tokens.primary, tokens.primaryForeground),
                outline: `3px solid ${tokens.focus}`,
                outlineOffset: "3px",
              }}
            >
              Focus
            </button>
            <button
              type="button"
              aria-disabled="true"
              style={buttonStyle(tokens.disabled, tokens.disabledForeground)}
            >
              Disabled
            </button>
          </div>
          <p className="fine-print" style={{ color: tokens.muted }}>
            The disabled control is exempt from contrast. The focus ring is a real outline, not a color change alone.
          </p>
        </div>
        <form className="preview-card" style={{ background: tokens.raised, borderColor: tokens.border }}>
          <h3>Form</h3>
          <label htmlFor="preview-email" style={{ color: tokens.foreground }}>
            Email address
          </label>
          <input
            id="preview-email"
            type="email"
            placeholder="name@example.com"
            style={{
              background: tokens.background,
              color: tokens.foreground,
              border: `2px solid ${tokens.border}`,
            }}
          />
          <p className="fine-print" style={{ color: tokens.placeholder }}>
            Placeholder text uses the secondary text color so it meets AA.
          </p>
          <button type="button" style={buttonStyle(tokens.secondary, tokens.secondaryForeground)}>
            Save
          </button>
        </form>
        <div className="preview-card" style={{ background: tokens.surface, borderColor: tokens.border }}>
          <h3>Card</h3>
          <p>Body copy sits on the surface with the page text color.</p>
          <p>
            <a href="#exports" style={{ color: tokens.link }}>
              Underlined link
            </a>
          </p>
          <p className="fine-print" style={{ color: tokens.muted }}>
            The underline keeps the link from depending on color alone. The matrix still reports link contrast against the surrounding text.
          </p>
        </div>
        <div className="stack">
          <Status title="Success" text="Saved." icon={<CheckIcon />} fill={tokens.success} ink={tokens.successForeground} />
          <Status title="Warning" text="Review this pair." icon={<AlertIcon />} fill={tokens.warning} ink={tokens.warningForeground} />
          <Status title="Error" text="This pair fails." icon={<CrossIcon />} fill={tokens.danger} ink={tokens.dangerForeground} />
        </div>
        <div className="preview-card" style={{ background: tokens.surface, borderColor: tokens.border }}>
          <h3>Chart</h3>
          <div role="img" aria-label="Chart series identified by label, pattern, and color." className="chart">
            {charts.map((hex, index) => (
              <div key={`${hex}-${index}`} className="chart-row">
                <span>S{index + 1}</span>
                <span
                  className={`bar pattern-${index % 5}`}
                  style={{ backgroundColor: hex, width: `${70 - index * 8}%` }}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function buttonStyle(background: string, color: string): CSSProperties {
  return {
    background,
    color,
    border: "2px solid transparent",
    borderRadius: "999px",
    minHeight: "44px",
    padding: "0.55rem 1rem",
    fontWeight: 650,
  };
}

function Status({
  title,
  text,
  icon,
  fill,
  ink,
}: {
  title: string;
  text: string;
  icon: ReactNode;
  fill: string;
  ink: string;
}) {
  return (
    <p className="status-banner" style={{ background: fill, color: ink }}>
      {icon}
      <strong>{title}.</strong> {text}
    </p>
  );
}
