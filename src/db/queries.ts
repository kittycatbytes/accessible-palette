import type { PoolClient } from "pg";
import { buildExports } from "@/lib/export";
import { parseLibrary, type PaletteLibrary } from "@/lib/library";
import { listPairs } from "@/lib/snapshot";
import type { ContrastPair, ExportFile, Snapshot } from "@/lib/types";
import { getPool, isMissingTable } from "./pool";

export type GoogleUser = {
  googleSub: string;
  email: string;
  name: string;
  image: string | null;
};

export async function pingDatabase(): Promise<"ok" | "missing" | "unconfigured" | "error"> {
  const pool = getPool();
  if (!pool) return "unconfigured";
  try {
    await pool.query("SELECT 1");
    await pool.query("SELECT contrast_ratio('#000000', '#ffffff')");
    return "ok";
  } catch (error) {
    if (isMissingTable(error) || (error as { code?: string }).code === "42883") return "missing";
    return "error";
  }
}

export async function upsertGoogleUser(user: GoogleUser): Promise<{ id: string } | null> {
  const pool = getPool();
  if (!pool) return null;
  const result = await pool.query<{ id: string }>(
    `INSERT INTO users (google_sub, email, name, image)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (google_sub) DO UPDATE
       SET email = EXCLUDED.email, name = EXCLUDED.name, image = EXCLUDED.image
     RETURNING id`,
    [user.googleSub, user.email, user.name, user.image],
  );
  return result.rows[0] ?? null;
}

function pairPayload(pairs: ContrastPair[]) {
  return pairs.map((pair) => ({
    view: pair.view,
    fg_key: pair.fgKey,
    bg_key: pair.bgKey,
    fg_hex: pair.fgHex,
    bg_hex: pair.bgHex,
    purpose: pair.purpose,
    required: pair.required,
    exempt: pair.exempt,
  }));
}

export async function ratiosFromDatabase(pairs: ContrastPair[]): Promise<ContrastPair[]> {
  const pool = getPool();
  if (!pool) throw new Error("database_unconfigured");
  const result = await pool.query<{
    view: ContrastPair["view"];
    fg_key: string;
    bg_key: string;
    fg_hex: string;
    bg_hex: string;
    purpose: string;
    required: boolean;
    exempt: boolean;
    ratio: number;
    aa_normal: boolean;
    aa_large: boolean;
    aaa_normal: boolean;
    aaa_large: boolean;
    non_text: boolean;
  }>("SELECT * FROM contrast_ratios($1::jsonb)", [JSON.stringify(pairPayload(pairs))]);
  return result.rows.map((row) => ({
    view: row.view,
    fgKey: row.fg_key,
    bgKey: row.bg_key,
    fgHex: row.fg_hex,
    bgHex: row.bg_hex,
    purpose: row.purpose,
    required: row.required,
    exempt: row.exempt,
    ratio: Number(row.ratio),
    aaNormal: row.aa_normal,
    aaLarge: row.aa_large,
    aaaNormal: row.aaa_normal,
    aaaLarge: row.aaa_large,
    nonText: row.non_text,
  }));
}

async function insertVersion(
  client: PoolClient,
  paletteId: string,
  parentVersionId: string | null,
  name: string,
  snapshot: Snapshot,
  exports: ExportFile[],
): Promise<string> {
  const inserted = await client.query<{ id: string }>(
    `INSERT INTO palette_versions (palette_id, parent_version_id, name, config)
     VALUES ($1, $2, $3, $4::jsonb)
     RETURNING id`,
    [paletteId, parentVersionId, name, JSON.stringify(snapshot)],
  );
  const versionId = inserted.rows[0].id;
  await client.query(
    `INSERT INTO contrast_pairs (
       version_id, view, fg_key, bg_key, fg_hex, bg_hex, purpose, ratio,
       aa_normal, aa_large, aaa_normal, aaa_large, non_text, required, exempt
     )
     SELECT $1, view, fg_key, bg_key, fg_hex, bg_hex, purpose, ratio,
            aa_normal, aa_large, aaa_normal, aaa_large, non_text, required, exempt
     FROM contrast_ratios($2::jsonb)`,
    [versionId, JSON.stringify(pairPayload(listPairs(snapshot)))],
  );
  for (const file of exports) {
    await client.query(
      `INSERT INTO saved_exports (version_id, format, filename, mime, body)
       VALUES ($1, $2, $3, $4, $5)`,
      [versionId, file.format, file.filename, file.mime, file.body],
    );
  }
  await client.query("UPDATE palettes SET updated_at = now() WHERE id = $1", [paletteId]);
  return versionId;
}

export async function saveVersion(input: {
  userId: string;
  paletteId?: string;
  paletteName: string;
  versionName: string;
  snapshot: Snapshot;
}): Promise<{ paletteId: string; versionId: string }> {
  const pool = getPool();
  if (!pool) throw new Error("database_unconfigured");
  const client = await pool.connect();
  const exports = buildExports(input.snapshot, input.paletteName);
  try {
    await client.query("BEGIN");
    let paletteId = input.paletteId;
    let parent: string | null = null;
    if (paletteId) {
      const owned = await client.query<{ id: string }>(
        "SELECT id FROM palettes WHERE id = $1 AND user_id = $2",
        [paletteId, input.userId],
      );
      if (!owned.rowCount) throw new Error("not_found");
      const count = await client.query<{ count: string }>(
        "SELECT count(*)::text AS count FROM palette_versions WHERE palette_id = $1",
        [paletteId],
      );
      if (Number(count.rows[0].count) >= 80) throw new Error("version_limit");
      const latest = await client.query<{ id: string }>(
        `SELECT id FROM palette_versions
         WHERE palette_id = $1
         ORDER BY created_at DESC
         LIMIT 1`,
        [paletteId],
      );
      parent = latest.rows[0]?.id ?? null;
      await client.query("UPDATE palettes SET name = $2 WHERE id = $1", [
        paletteId,
        input.paletteName,
      ]);
    } else {
      const count = await client.query<{ count: string }>(
        "SELECT count(*)::text AS count FROM palettes WHERE user_id = $1",
        [input.userId],
      );
      if (Number(count.rows[0].count) >= 40) throw new Error("palette_limit");
      const created = await client.query<{ id: string }>(
        "INSERT INTO palettes (user_id, name) VALUES ($1, $2) RETURNING id",
        [input.userId, input.paletteName],
      );
      paletteId = created.rows[0].id;
    }
    const versionId = await insertVersion(
      client,
      paletteId,
      parent,
      input.versionName,
      input.snapshot,
      exports,
    );
    await client.query("COMMIT");
    return { paletteId, versionId };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function listPalettes(userId: string) {
  const pool = getPool();
  if (!pool) throw new Error("database_unconfigured");
  const palettes = await pool.query<{
    id: string;
    name: string;
    updated_at: string;
  }>(
    `SELECT id, name, updated_at
     FROM palettes
     WHERE user_id = $1
     ORDER BY updated_at DESC`,
    [userId],
  );
  const versions = await pool.query<{
    id: string;
    palette_id: string;
    parent_version_id: string | null;
    name: string;
    created_at: string;
    config: Snapshot;
  }>(
    `SELECT v.id, v.palette_id, v.parent_version_id, v.name, v.created_at, v.config
     FROM palette_versions v
     JOIN palettes p ON p.id = v.palette_id
     WHERE p.user_id = $1
     ORDER BY v.created_at DESC`,
    [userId],
  );
  const exports = await pool.query<{
    id: string;
    version_id: string;
    format: string;
    filename: string;
  }>(
    `SELECT e.id, e.version_id, e.format, e.filename
     FROM saved_exports e
     JOIN palette_versions v ON v.id = e.version_id
     JOIN palettes p ON p.id = v.palette_id
     WHERE p.user_id = $1`,
    [userId],
  );
  return palettes.rows.map((palette) => ({
    id: palette.id,
    name: palette.name,
    updatedAt: palette.updated_at,
    versions: versions.rows
      .filter((version) => version.palette_id === palette.id)
      .map((version) => ({
        id: version.id,
        parentVersionId: version.parent_version_id,
        name: version.name,
        createdAt: version.created_at,
        config: version.config,
        exports: exports.rows
          .filter((file) => file.version_id === version.id)
          .map((file) => ({ id: file.id, format: file.format, filename: file.filename })),
      })),
  }));
}

export async function readExport(userId: string, exportId: string) {
  const pool = getPool();
  if (!pool) throw new Error("database_unconfigured");
  const result = await pool.query<{ filename: string; mime: string; body: string; format: string }>(
    `SELECT e.filename, e.mime, e.body, e.format
     FROM saved_exports e
     JOIN palette_versions v ON v.id = e.version_id
     JOIN palettes p ON p.id = v.palette_id
     WHERE e.id = $1 AND p.user_id = $2`,
    [exportId, userId],
  );
  return result.rows[0] ?? null;
}

export async function compareVersions(userId: string, firstId: string, secondId: string) {
  const pool = getPool();
  if (!pool) throw new Error("database_unconfigured");
  const owned = await pool.query(
    `SELECT v.id
     FROM palette_versions v
     JOIN palettes p ON p.id = v.palette_id
     WHERE p.user_id = $1 AND v.id = ANY($2::uuid[])`,
    [userId, [firstId, secondId]],
  );
  if (owned.rowCount !== 2) throw new Error("not_found");
  const rows = await pool.query<{
    view: string;
    fg_key: string;
    bg_key: string;
    purpose: string;
    ratio_a: number;
    ratio_b: number;
    aa_a: boolean;
    aa_b: boolean;
    ui_a: boolean;
    ui_b: boolean;
  }>(
    `SELECT a.view, a.fg_key, a.bg_key, a.purpose,
            a.ratio AS ratio_a, b.ratio AS ratio_b,
            a.aa_normal AS aa_a, b.aa_normal AS aa_b,
            a.non_text AS ui_a, b.non_text AS ui_b
     FROM contrast_pairs a
     JOIN contrast_pairs b
       ON a.view = b.view AND a.fg_key = b.fg_key AND a.bg_key = b.bg_key
     WHERE a.version_id = $1
       AND b.version_id = $2
       AND a.required
       AND b.required
       AND (
         a.aa_normal <> b.aa_normal
         OR a.non_text <> b.non_text
         OR abs(a.ratio - b.ratio) > 0.05
       )
     ORDER BY a.view, a.purpose`,
    [firstId, secondId],
  );
  return rows.rows;
}

export async function readLibrary(userId: string): Promise<PaletteLibrary | null> {
  const pool = getPool();
  if (!pool) throw new Error("database_unconfigured");
  const result = await pool.query<{ document: unknown }>(
    "SELECT document FROM user_libraries WHERE user_id = $1",
    [userId],
  );
  const document = result.rows[0]?.document;
  if (!document) return null;
  return parseLibrary(document);
}

export async function writeLibrary(userId: string, library: PaletteLibrary): Promise<void> {
  const pool = getPool();
  if (!pool) throw new Error("database_unconfigured");
  await pool.query(
    `INSERT INTO user_libraries (user_id, document)
     VALUES ($1, $2::jsonb)
     ON CONFLICT (user_id) DO UPDATE
       SET document = EXCLUDED.document, updated_at = now()`,
    [userId, JSON.stringify(library)],
  );
}
