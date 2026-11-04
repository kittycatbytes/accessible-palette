"use client";

import { signIn, signOut } from "next-auth/react";
import { usePathname, useRouter } from "next/navigation";
import { Suspense, useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import { EMPTY_LIBRARY, LIBRARY_STORAGE_KEY, parseLibrary, recentProjects, type PaletteLibrary } from "@/lib/library";
import { flushPageView, rememberPageView } from "@/lib/page-view";
import { MenuIcon } from "./icons";

export type SessionInfo = {
  authConfigured: boolean;
  database: string;
  user: { id: string; name: string; email: string } | null;
};

const themeListeners = new Set<() => void>();

export function subscribeTheme(listener: () => void) {
  themeListeners.add(listener);
  return () => themeListeners.delete(listener);
}

export function readTheme(): "light" | "dark" {
  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}

export function writeTheme(next: "light" | "dark") {
  if (next === "dark") document.documentElement.setAttribute("data-theme", "dark");
  else document.documentElement.removeAttribute("data-theme");
  localStorage.setItem("accessible-palette-theme", next);
  themeListeners.forEach((listener) => listener());
}

export function readStoredLibrary(): PaletteLibrary {
  try {
    const sessionCopy = parseLibrary(JSON.parse(sessionStorage.getItem(LIBRARY_STORAGE_KEY) || "null"));
    if (sessionCopy) return sessionCopy;
  } catch {
    // Storage can be blocked.
  }
  try {
    return parseLibrary(JSON.parse(localStorage.getItem(LIBRARY_STORAGE_KEY) || "null")) ?? EMPTY_LIBRARY;
  } catch {
    return EMPTY_LIBRARY;
  }
}

export function persistLibrary(library: PaletteLibrary, signedIn: boolean) {
  try {
    sessionStorage.setItem(LIBRARY_STORAGE_KEY, JSON.stringify(library));
  } catch {
    // Storage can be blocked. The signed-in copy still goes to the account.
  }
  if (signedIn) {
    void fetch("/api/library", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(library),
    });
    return;
  }
  localStorage.setItem(LIBRARY_STORAGE_KEY, JSON.stringify(library));
}

export function SiteHeader({
  projects,
  brandHref = "/",
}: {
  projects?: { id: string; name: string }[];
  brandHref?: string;
}) {
  const [copied, setCopied] = useState(false);
  const copiedTimer = useRef(0);
  const [session, setSession] = useState<SessionInfo | null>(null);
  const [sessionReady, setSessionReady] = useState(false);
  const [storedProjects, setStoredProjects] = useState<{ id: string; name: string }[]>([]);
  const theme = useSyncExternalStore(subscribeTheme, readTheme, () => "light" as const);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [confirming, setConfirming] = useState(false);
  const listed = projects ?? storedProjects;

  useEffect(() => {
    let cancelled = false;
    fetch("/api/session")
      .then((response) => response.json())
      .then((data: SessionInfo) => {
        if (!cancelled) setSession(data);
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
    rememberPageView({ theme: readTheme() });
  }, [theme]);

  useEffect(() => {
    return () => window.clearTimeout(copiedTimer.current);
  }, []);

  useEffect(() => {
    if (projects || !sessionReady) return;
    let cancelled = false;
    async function load() {
      if (session?.user) {
        try {
          const response = await fetch("/api/library");
          if (response.ok) {
            const data = (await response.json()) as { library?: unknown };
            const library = parseLibrary(data.library);
            if (!cancelled && library) setStoredProjects(library.projects);
            return;
          }
        } catch {
          // Fall through to the copy stored in this browser.
        }
      }
      if (!cancelled) setStoredProjects(readStoredLibrary().projects);
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [projects, sessionReady, session?.user]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (confirming && !dialog.open) dialog.showModal();
    if (!confirming && dialog.open) dialog.close();
  }, [confirming]);

  const recent = recentProjects(listed);

  async function sharePage() {
    rememberPageView({ theme: readTheme() });
    flushPageView();
    const url = window.location.href;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      const input = document.createElement("textarea");
      input.value = url;
      input.setAttribute("readonly", "");
      input.style.position = "fixed";
      input.style.left = "-9999px";
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      input.remove();
    }
    setCopied(true);
    window.clearTimeout(copiedTimer.current);
    copiedTimer.current = window.setTimeout(() => setCopied(false), 2000);
  }

  return (
    <header className="app-header">
      <a className="brand-mark" href={brandHref}>
        <span className="brand-kicker">WCAG 2.2</span>
        <span>Accessible Palette Generator</span>
      </a>
      <div className="header-actions">
        <button
          type="button"
          className="button button-ghost share-button"
          aria-live="polite"
          onClick={() => void sharePage()}
        >
          {copied ? "Link copied!" : "Share this page"}
        </button>
        <button
          type="button"
          className="button button-ghost"
          aria-pressed={theme === "dark"}
          onClick={() => writeTheme(theme === "dark" ? "light" : "dark")}
        >
          {theme === "dark" ? "Switch to light" : "Switch to dark"}
        </button>
        <Suspense fallback={<MenuFallback />}>
          <AccountMenu
            session={session}
            sessionReady={sessionReady}
            recent={recent}
            onSignOut={() => setConfirming(true)}
          />
        </Suspense>
      </div>
      <dialog
        ref={dialogRef}
        className="modal"
        aria-labelledby="sign-out-title"
        onClose={() => setConfirming(false)}
      >
        <form
          method="dialog"
          onSubmit={(event) => {
            event.preventDefault();
            setConfirming(false);
            void signOut({ callbackUrl: "/" });
          }}
        >
          <h2 id="sign-out-title">Are you sure you want to sign out?</h2>
          <div className="tool-row">
            <button type="submit" className="button">
              Sign out
            </button>
            <button type="button" className="button button-ghost" onClick={() => setConfirming(false)}>
              Cancel
            </button>
          </div>
        </form>
      </dialog>
    </header>
  );
}

function MenuFallback() {
  return (
    <div className="account-menu">
      <button type="button" className="menu-button" aria-label="Account menu" disabled>
        <MenuIcon />
      </button>
    </div>
  );
}

function AccountMenu({
  session,
  sessionReady,
  recent,
  onSignOut,
}: {
  session: SessionInfo | null;
  sessionReady: boolean;
  recent: { id: string; name: string }[];
  onSignOut: () => void;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const onProjects = pathname === "/projects" || pathname.startsWith("/projects/") || pathname === "/favorites";
  const menuId = useId();
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    function onPointer(event: PointerEvent) {
      if (!menuRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    }
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function startSignIn() {
    setOpen(false);
    if (session?.authConfigured) void signIn("google", { callbackUrl: "/" });
    else router.push("/setup");
  }

  return (
    <div className="account-menu" ref={menuRef}>
      <button
        ref={buttonRef}
        type="button"
        className="menu-button"
        aria-haspopup="true"
        aria-expanded={open}
        aria-controls={menuId}
        aria-label="Account menu"
        onClick={() => setOpen((value) => !value)}
      >
        <MenuIcon />
      </button>
      {open ? (
        <div className="account-panel" id={menuId}>
          {session?.user ? (
            <div className="menu-section">
              <p className="account-name">{session.user.name || session.user.email}</p>
            </div>
          ) : null}
          {onProjects ? (
            <div className="menu-section">
              <a className="account-link" href="/#build-heading" onClick={() => setOpen(false)}>
                Back to Build a Palette
              </a>
            </div>
          ) : null}
          {session?.user ? (
            <div className="menu-section">
              <ul className="account-projects">
                {recent.map((project) => (
                  <li key={project.id}>
                    <a href={`/projects/${project.id}`} onClick={() => setOpen(false)}>
                      {project.name}
                    </a>
                  </li>
                ))}
                <li>
                  <a href="/projects" onClick={() => setOpen(false)}>
                    See all projects
                  </a>
                </li>
              </ul>
            </div>
          ) : (
            <div className="menu-section">
              <button type="button" className="account-sign-in" onClick={startSignIn} disabled={!sessionReady}>
                Sign in
              </button>
            </div>
          )}
          <div className="menu-section">
            <a className="account-link" href="/about" onClick={() => setOpen(false)}>
              About WCAG
            </a>
          </div>
          {session?.user ? (
            <div className="menu-section">
              <button
                type="button"
                className="account-sign-out"
                onClick={() => {
                  setOpen(false);
                  onSignOut();
                }}
              >
                Sign out
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
