import { currentUserId } from "@/auth";
import { readLibrary, writeLibrary } from "@/db/queries";
import { databaseError } from "@/lib/http";
import { EMPTY_LIBRARY, parseLibrary } from "@/lib/library";

export async function GET() {
  const userId = await currentUserId();
  if (!userId) return Response.json({ error: "sign_in_required" }, { status: 401 });
  try {
    return Response.json({ library: (await readLibrary(userId)) ?? EMPTY_LIBRARY });
  } catch (error) {
    return databaseError(error);
  }
}

export async function PUT(request: Request) {
  const userId = await currentUserId();
  if (!userId) return Response.json({ error: "sign_in_required" }, { status: 401 });
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "invalid_json" }, { status: 400 });
  }
  const library = parseLibrary(body);
  if (!library) return Response.json({ error: "invalid_library" }, { status: 400 });
  try {
    await writeLibrary(userId, library);
    return Response.json({ ok: true });
  } catch (error) {
    return databaseError(error);
  }
}
