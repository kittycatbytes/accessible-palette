CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  google_sub text NOT NULL UNIQUE,
  email text NOT NULL,
  name text NOT NULL,
  image text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS palettes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS palette_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  palette_id uuid NOT NULL REFERENCES palettes (id) ON DELETE CASCADE,
  parent_version_id uuid REFERENCES palette_versions (id) ON DELETE SET NULL,
  name text NOT NULL,
  config jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS palette_versions_palette_idx
  ON palette_versions (palette_id, created_at DESC);

CREATE TABLE IF NOT EXISTS contrast_pairs (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  version_id uuid NOT NULL REFERENCES palette_versions (id) ON DELETE CASCADE,
  view text NOT NULL,
  fg_key text NOT NULL,
  bg_key text NOT NULL,
  fg_hex text NOT NULL,
  bg_hex text NOT NULL,
  purpose text NOT NULL,
  ratio double precision NOT NULL,
  aa_normal boolean NOT NULL,
  aa_large boolean NOT NULL,
  aaa_normal boolean NOT NULL,
  aaa_large boolean NOT NULL,
  non_text boolean NOT NULL,
  required boolean NOT NULL DEFAULT false,
  exempt boolean NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS contrast_pairs_version_idx
  ON contrast_pairs (version_id);

CREATE TABLE IF NOT EXISTS saved_exports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  version_id uuid NOT NULL REFERENCES palette_versions (id) ON DELETE CASCADE,
  format text NOT NULL,
  filename text NOT NULL,
  mime text NOT NULL,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION srgb_channel_to_linear(channel double precision)
RETURNS double precision
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN channel <= 0.04045 THEN channel / 12.92
    ELSE power((channel + 0.055) / 1.055, 2.4)
  END
$$;

CREATE OR REPLACE FUNCTION relative_luminance(hex text)
RETURNS double precision
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT
    0.2126 * srgb_channel_to_linear(get_byte(decode(substr(lower(hex), 2, 2), 'hex'), 0) / 255.0)
    + 0.7152 * srgb_channel_to_linear(get_byte(decode(substr(lower(hex), 4, 2), 'hex'), 0) / 255.0)
    + 0.0722 * srgb_channel_to_linear(get_byte(decode(substr(lower(hex), 6, 2), 'hex'), 0) / 255.0)
$$;

CREATE OR REPLACE FUNCTION contrast_ratio(foreground text, background text)
RETURNS double precision
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN relative_luminance(foreground) >= relative_luminance(background)
      THEN (relative_luminance(foreground) + 0.05) / (relative_luminance(background) + 0.05)
    ELSE (relative_luminance(background) + 0.05) / (relative_luminance(foreground) + 0.05)
  END
$$;

CREATE OR REPLACE FUNCTION contrast_ratios(pairs jsonb)
RETURNS TABLE (
  view text,
  fg_key text,
  bg_key text,
  fg_hex text,
  bg_hex text,
  purpose text,
  required boolean,
  exempt boolean,
  ratio double precision,
  aa_normal boolean,
  aa_large boolean,
  aaa_normal boolean,
  aaa_large boolean,
  non_text boolean
)
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT
    item.view,
    item.fg_key,
    item.bg_key,
    item.fg_hex,
    item.bg_hex,
    item.purpose,
    item.required,
    item.exempt,
    item.ratio,
    item.ratio >= 4.5,
    item.ratio >= 3,
    item.ratio >= 7,
    item.ratio >= 4.5,
    item.ratio >= 3
  FROM (
    SELECT
      x.view,
      x.fg_key,
      x.bg_key,
      x.fg_hex,
      x.bg_hex,
      x.purpose,
      x.required,
      x.exempt,
      contrast_ratio(x.fg_hex, x.bg_hex) AS ratio
    FROM jsonb_to_recordset(pairs) AS x(
      view text,
      fg_key text,
      bg_key text,
      fg_hex text,
      bg_hex text,
      purpose text,
      required boolean,
      exempt boolean
    )
    WHERE x.fg_hex ~ '^#[0-9a-f]{6}$' AND x.bg_hex ~ '^#[0-9a-f]{6}$'
  ) AS item
$$;
