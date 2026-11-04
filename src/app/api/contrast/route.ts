import { databaseError } from "@/lib/http";
import { buildSnapshot, listPairs } from "@/lib/snapshot";
import { parsePaletteInput } from "@/lib/validate";
import { ratiosFromDatabase } from "@/db/queries";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "invalid_json" }, { status: 400 });
  }
  const parsed = parsePaletteInput({
    ...(typeof body === "object" && body ? body : {}),
    paletteName: "Preview",
    versionName: "Preview",
  });
  if ("error" in parsed) return Response.json(parsed, { status: 400 });
  const snapshot = buildSnapshot({
    brandColors: parsed.brandColors,
    autoOptimize: parsed.autoOptimize,
    pickerMode: parsed.pickerMode,
    harmony: parsed.harmony,
  });
  try {
    const pairs = await ratiosFromDatabase(listPairs(snapshot));
    return Response.json({ source: "server", pairs, notes: snapshot.notes });
  } catch (error) {
    return databaseError(error);
  }
}
