# Accessible Palette

A WCAG 2.2 color palette tool. Pick 3 to 5 brand colors on a circle, check text and UI contrast, preview light and dark pages, and save named versions.

The palette runs in the browser. Postgres, on [Neon](https://neon.tech), is the record of saved palettes and the source of the contrast ratios after you connect it. Google sign-in is how a person keeps those versions. The app is meant to be hosted on [Vercel](https://vercel.com). No database is installed on your computer.

## What you can do before accounts exist

```bash
npm install
npm run dev
```

Open http://localhost:3000. You can build palettes, read the badges, preview UI, and download exports. Saving a version asks you to finish the setup below.

## 1. Neon

Create a free Neon project in AWS US East (N. Virginia). Copy the pooled connection string into `.env.local`:

```bash
DATABASE_URL=postgresql://...
```

Then create the tables and contrast functions:

```bash
npm run db:migrate
```

The schema stores each palette, each named version, the full theme in a `jsonb` column, one contrast row per pair, and the export files for that version.

## 2. Google sign-in

Sign in with Google requires an OAuth client on a Google account you control. This repository cannot create that client.

1. Open [Google Cloud Console](https://console.cloud.google.com/) and create a project named `accessible-palette`.
2. Configure the OAuth consent screen (Google Auth Platform). External is fine while you are testing. Add your Gmail address as a test user.
3. Create a Web application OAuth client.
   - Origin: `http://localhost:3000`
   - Redirect: `http://localhost:3000/api/auth/callback/google`
4. Add the same pair for the Vercel domain when you have one.
5. Put the values in `.env.local`:

```bash
AUTH_GOOGLE_ID=
AUTH_GOOGLE_SECRET=
AUTH_SECRET=   # openssl rand -base64 32
AUTH_URL=http://localhost:3000
```

Restart `npm run dev` after changing env values.

## 3. Vercel

After the GitHub remote exists, import the repo in Vercel and set `DATABASE_URL`, `AUTH_SECRET`, `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`, and `AUTH_URL`. Add the production redirect URI in the Google client, then deploy.

## Scripts

- `npm run dev` — local Next.js app
- `npm test` — contrast, theme, preset, and export checks
- `npm run db:migrate` — apply SQL in `db/migrations` to `DATABASE_URL`
- `npm run build` — production build

## Contrast rules in the badges

- AA normal text, 4.5:1, WCAG 1.4.3
- AA large text, 3:1, WCAG 1.4.3. Large text is 24px, or 18.67px and bold.
- AAA normal text, 7:1, WCAG 1.4.6
- AAA large text, 4.5:1, WCAG 1.4.6
- Graphical objects and UI components, 3:1, WCAG 1.4.11

Pass and fail use the full ratio. A displayed number is not rounded up into a pass. Disabled controls are marked exempt.

While you drag a color, the matrix updates in the browser. When `DATABASE_URL` is set, the same pairs are scored again by the Postgres `contrast_ratio` function and that result replaces the on-screen ratios. Saving a version stores those rows.
