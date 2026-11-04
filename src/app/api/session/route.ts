import { auth, googleAuthConfigured } from "@/auth";
import { databaseConfigured } from "@/db/pool";
import { pingDatabase } from "@/db/queries";

export async function GET() {
  const database = databaseConfigured() ? await pingDatabase() : "unconfigured";
  try {
    const session = await auth();
    return Response.json({
      authConfigured: googleAuthConfigured,
      database,
      user: session?.user?.id
        ? {
            id: session.user.id,
            name: session.user.name ?? "",
            email: session.user.email ?? "",
            image: session.user.image ?? null,
          }
        : null,
    });
  } catch {
    return Response.json({
      authConfigured: googleAuthConfigured,
      database,
      user: null,
    });
  }
}
