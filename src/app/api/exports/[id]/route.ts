import { currentUserId } from "@/auth";
import { readExport } from "@/db/queries";
import { databaseError } from "@/lib/http";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await currentUserId();
  if (!userId) return Response.json({ error: "sign_in_required" }, { status: 401 });
  const { id } = await params;
  try {
    const file = await readExport(userId, id);
    if (!file) return Response.json({ error: "not_found" }, { status: 404 });
    if (file.format === "ase") {
      const binary = Uint8Array.from(atob(file.body), (char) => char.charCodeAt(0));
      return new Response(binary, {
        headers: {
          "Content-Type": file.mime,
          "Content-Disposition": `attachment; filename="${file.filename}"`,
        },
      });
    }
    return new Response(file.body, {
      headers: {
        "Content-Type": `${file.mime}; charset=utf-8`,
        "Content-Disposition": `attachment; filename="${file.filename}"`,
      },
    });
  } catch (error) {
    return databaseError(error);
  }
}
