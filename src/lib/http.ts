import { isMissingTable } from "@/db/pool";

export function databaseError(error: unknown): Response {
  const message = error instanceof Error ? error.message : "";
  if (message === "database_unconfigured") {
    return Response.json(
      {
        error: "database_unconfigured",
        message: "Connect a Neon Postgres database to verify ratios and save versions.",
      },
      { status: 503 },
    );
  }
  if (message === "not_found") {
    return Response.json({ error: "not_found" }, { status: 404 });
  }
  if (message === "version_limit" || message === "palette_limit") {
    return Response.json({ error: message }, { status: 400 });
  }
  if (isMissingTable(error) || (error as { code?: string }).code === "42883") {
    return Response.json(
      {
        error: "database_not_migrated",
        message: "Run npm run db:migrate against the Neon database.",
      },
      { status: 503 },
    );
  }
  console.error(error);
  return Response.json({ error: "database_error" }, { status: 500 });
}
