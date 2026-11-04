import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Set up accounts · Accessible Palette",
};

export default function SetupPage() {
  return (
    <main className="setup">
      <p>
        <Link href="/">Back to the palette</Link>
      </p>
      <h1>Connect the accounts</h1>
      <p>
        The palette works in the browser before any of this is connected. Saving a version, and
        checking ratios in Postgres, needs a Neon database. Google sign-in needs an OAuth client in
        your own Google account. Nothing here runs a database on your computer.
      </p>
      <section>
        <h2>1. Neon Postgres</h2>
        <ol>
          <li>Create a free project at neon.tech. Choose AWS US East (N. Virginia).</li>
          <li>Copy the pooled connection string.</li>
          <li>
            Put it in <code>.env.local</code> as <code>DATABASE_URL</code>.
          </li>
          <li>
            From this project folder, run <code>npm run db:migrate</code>. That creates the tables
            and the contrast functions.
          </li>
        </ol>
      </section>
      <section>
        <h2>2. Google sign-in</h2>
        <p>
          Google does not let an app use Sign in with Google until the owner creates an OAuth
          client. Open{" "}
          <a href="https://console.cloud.google.com/">Google Cloud Console</a> while signed in to
          the Google account you want to use.
        </p>
        <ol>
          <li>Create a project named accessible-palette.</li>
          <li>
            Open Google Auth Platform, or APIs &amp; Services, then the OAuth consent screen. Choose
            External, name the app Accessible Palette, and add your Gmail address as a test user.
          </li>
          <li>
            Create an OAuth client ID of type Web application. Add{" "}
            <code>http://localhost:3000</code> as an origin. Add{" "}
            <code>http://localhost:3000/api/auth/callback/google</code> as a redirect URI. When the
            app has a public URL, add that origin and{" "}
            <code>https://YOUR-DOMAIN/api/auth/callback/google</code> as well.
          </li>
          <li>
            Put the client id in <code>AUTH_GOOGLE_ID</code> and the secret in{" "}
            <code>AUTH_GOOGLE_SECRET</code>.
          </li>
          <li>
            Generate <code>AUTH_SECRET</code> with <code>openssl rand -base64 32</code>.
          </li>
        </ol>
      </section>
      <section>
        <h2>3. Host the app on Vercel</h2>
        <ol>
          <li>Create a free Vercel account after this repo has a GitHub remote.</li>
          <li>Import the repository. Framework preset: Next.js.</li>
          <li>
            Add <code>DATABASE_URL</code>, <code>AUTH_SECRET</code>, <code>AUTH_GOOGLE_ID</code>,{" "}
            <code>AUTH_GOOGLE_SECRET</code>, and <code>AUTH_URL</code> set to the Vercel URL.
          </li>
          <li>Deploy, then add the Vercel redirect URI in the Google client.</li>
        </ol>
      </section>
      <p className="fine-print">
        <code>npm run dev</code> opens the app on this machine so you can use it while building.
        The database stays on Neon.
      </p>
    </main>
  );
}
