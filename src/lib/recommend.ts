import { readOklch } from "./color";
import type { ContrastPair } from "./types";

const PAGE_KEYS = new Set(["white", "black", "light-page", "dark-page"]);

function findPair(pairs: ContrastPair[], fgKey: string, bgKey: string): ContrastPair | undefined {
  return pairs.find((pair) => pair.fgKey === fgKey && pair.bgKey === bgKey);
}

function textScore(pair: ContrastPair): number {
  if (!pair.aaNormal) return -1;
  return (pair.aaaNormal ? 100 : 70) + Math.min(pair.ratio, 14) + (PAGE_KEYS.has(pair.fgKey) ? 0 : 12);
}

function best(pairs: ContrastPair[], score: (pair: ContrastPair) => number): ContrastPair | null {
  let winner: ContrastPair | null = null;
  let winning = -1;
  for (const pair of pairs) {
    const value = score(pair);
    if (value > winning) {
      winner = pair;
      winning = value;
    }
  }
  return winning >= 0 ? winner : null;
}

/** A readable foreground on one surface. Brand colors win ties with black or white. */
function chooseText(
  pairs: ContrastPair[],
  candidateIds: string[],
  background: string,
  apartFromHex?: string,
): ContrastPair | null {
  const passing = candidateIds
    .map((id) => findPair(pairs, id, background))
    .filter((pair): pair is ContrastPair => Boolean(pair && textScore(pair) >= 0));
  const pool = apartFromHex
    ? passing.filter((pair) => Math.abs(readOklch(pair.fgHex).l - readOklch(apartFromHex).l) >= 0.08)
    : passing;
  return best(pool, textScore);
}

function apart(leftHex: string, rightHex: string): number {
  const left = readOklch(leftHex);
  const right = readOklch(rightHex);
  const lightness = Math.abs(left.l - right.l) * 100;
  if (left.c < 0.02 || right.c < 0.02) return lightness;
  const hue = Math.abs(left.h - right.h) % 360;
  return lightness + Math.min(hue, 360 - hue) / 6;
}

/** A colorful fill that can carry a white label and still show up on the page. */
function chooseButton(
  pairs: ContrastPair[],
  brandIds: string[],
  pageBackground: string,
  avoid: string[],
): string | null {
  let winner: string | null = null;
  let winning = -1;
  for (const id of brandIds) {
    if (avoid.includes(id)) continue;
    const label = findPair(pairs, "white", id);
    const onPage = findPair(pairs, id, pageBackground);
    if (!label?.aaNormal || !onPage?.nonText) continue;
    const chroma = readOklch(label.bgHex).c;
    const score = (label.aaaNormal ? 40 : 24) + Math.min(label.ratio, 12) + chroma * 90;
    if (score > winning) {
      winner = id;
      winning = score;
    }
  }
  return winner;
}

function chooseLink(
  pairs: ContrastPair[],
  brandIds: string[],
  pageBackground: string,
  avoid: string[],
  neighbors: string[],
): string | null {
  const passing = brandIds
    .filter((id) => !avoid.includes(id))
    .map((id) => findPair(pairs, id, pageBackground))
    .filter((pair): pair is ContrastPair => Boolean(pair && textScore(pair) >= 0));
  const winner = best(passing, (pair) => {
    const distance = neighbors.reduce((total, hex) => total + apart(pair.fgHex, hex), 0);
    return textScore(pair) + distance;
  });
  return winner?.fgKey ?? null;
}

/**
 * A small set of brand-matrix cells for one interface: text, a second line,
 * a button, and the same idea on a dark page. Scores keep failing pairs out.
 * The set stays on a few shared surfaces so the blocks can sit on one screen.
 */
export function recommendBrandBlocks(pairs: ContrastPair[]): string[] {
  const brand = pairs.filter((pair) => pair.view === "brand");
  if (brand.length === 0) return [];
  const ids = [...new Set(brand.map((pair) => pair.fgKey))];
  const brandIds = ids.filter((id) => !PAGE_KEYS.has(id));
  const lightBg = ids.includes("light-page") ? "light-page" : "white";
  const darkBg = ids.includes("dark-page") ? "dark-page" : "black";
  const chosen: string[] = [];

  function add(fgKey?: string, bgKey?: string, minimum: "text" | "ui" = "ui") {
    if (!fgKey || !bgKey || fgKey === bgKey) return;
    const pair = findPair(brand, fgKey, bgKey);
    if (!pair) return;
    if (minimum === "text" ? !pair.aaNormal : !pair.nonText) return;
    const key = `${fgKey}:${bgKey}`;
    if (!chosen.includes(key)) chosen.push(key);
  }

  const body = chooseText(brand, [...brandIds, "black"], lightBg);
  if (body) add(body.fgKey, lightBg, "text");

  const secondary = chooseText(
    brand,
    brandIds.filter((id) => id !== body?.fgKey),
    lightBg,
    body?.fgHex,
  );
  if (secondary) add(secondary.fgKey, lightBg, "text");

  const button = chooseButton(brand, brandIds, lightBg, body ? [body.fgKey] : []);
  if (button) {
    add("white", button, "text");
    add(button, lightBg, "ui");
  }

  const link = chooseLink(
    brand,
    brandIds,
    lightBg,
    [body?.fgKey, button].filter((id): id is string => Boolean(id)),
    [body?.fgHex, button ? findPair(brand, button, lightBg)?.fgHex : undefined].filter(
      (hex): hex is string => Boolean(hex),
    ),
  );
  if (link) add(link, lightBg, "text");

  const darkText = chooseText(brand, ["white", "light-page", ...brandIds], darkBg);
  if (darkText) add(darkText.fgKey, darkBg, "text");

  const buttonOnDark = button ? findPair(brand, button, darkBg) : undefined;
  if (button && buttonOnDark?.nonText) {
    add(button, darkBg, "ui");
  } else {
    const darkButton = chooseButton(brand, brandIds, darkBg, [body?.fgKey, button].filter((id): id is string => Boolean(id)));
    if (darkButton) {
      add("white", darkButton, "text");
      add(darkButton, darkBg, "ui");
    }
  }

  return chosen;
}
