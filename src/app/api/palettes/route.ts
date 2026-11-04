import { currentUserId } from "@/auth";
import { listPalettes, saveVersion } from "@/db/queries";
import { databaseError } from "@/lib/http";
import { buildSnapshot } from "@/lib/snapshot";
import { parsePaletteInput } from "@/lib/validate";

export async function GET() {
  const userId = await currentUserId();
  if (!userId) return Response.json({ error: "sign_in_required" }, { status: 401 });
  try {
    return Response.json({ palettes: await listPalettes(userId) });
  } catch (error) {
    return databaseError(error);
  }
}

export async function POST(request: Request) {
  const userId = await currentUserId();
  if (!userId) return Response.json({ error: "sign_in_required" }, { status: 401 });
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "invalid_json" }, { status: 400 });
  }
  const parsed = parsePaletteInput(body);
  if ("error" in parsed) return Response.json(parsed, { status: 400 });
  const snapshot = buildSnapshot({
    brandColors: parsed.brandColors,
    autoOptimize: parsed.autoOptimize,
    pickerMode: parsed.pickerMode,
    harmony: parsed.harmony,
  });
  try {
    const saved = await saveVersion({
      userId,
      paletteId: parsed.paletteId,
      paletteName: parsed.paletteName,
      versionName: parsed.versionName,
      snapshot,
    });
    return Response.json(saved, { status: 201 });
  } catch (error) {
    return databaseError(error);
  }
}
