import { currentUserId } from "@/auth";
import { compareVersions } from "@/db/queries";
import { databaseError } from "@/lib/http";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET(request: Request) {
  const userId = await currentUserId();
  if (!userId) return Response.json({ error: "sign_in_required" }, { status: 401 });
  const url = new URL(request.url);
  const first = url.searchParams.get("a") ?? "";
  const second = url.searchParams.get("b") ?? "";
  if (!UUID.test(first) || !UUID.test(second) || first === second) {
    return Response.json({ error: "Choose two saved versions." }, { status: 400 });
  }
  try {
    return Response.json({ changes: await compareVersions(userId, first, second) });
  } catch (error) {
    return databaseError(error);
  }
}
