import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { upsertGoogleUser } from "@/db/queries";

export const googleAuthConfigured = Boolean(
  process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET && process.env.AUTH_SECRET,
);

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  secret:
    process.env.AUTH_SECRET ??
    (process.env.NODE_ENV === "production" ? undefined : "dev-only-secret-change-me"),
  providers: googleAuthConfigured ? [Google] : [],
  session: { strategy: "jwt" },
  callbacks: {
    async jwt({ token, account, profile }) {
      const google = profile as
        | { sub?: string; email?: string; name?: string; picture?: string }
        | undefined;
      if (account && google?.sub && google.email) {
        const user = await upsertGoogleUser({
          googleSub: google.sub,
          email: google.email,
          name: google.name || google.email,
          image: google.picture ?? null,
        }).catch(() => null);
        if (user) token.userId = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && typeof token.userId === "string") {
        session.user.id = token.userId;
      }
      return session;
    },
  },
});

export async function currentUserId(): Promise<string | null> {
  try {
    const session = await auth();
    return session?.user?.id ?? null;
  } catch {
    return null;
  }
}
