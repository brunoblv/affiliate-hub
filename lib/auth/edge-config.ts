import type { NextAuthConfig } from "next-auth";

/**
 * Config leve para o proxy.ts (sem Prisma nem providers Node).
 * Credentials/PrismaAdapter ficam apenas em lib/auth/config.ts.
 */
export const edgeAuthConfig: NextAuthConfig = {
  trustHost: true,
  session: { strategy: "jwt" },
  pages: { signIn: "/admin/login" },
  providers: [],
  callbacks: {
    async session({ session, token }) {
      if (session.user) {
        session.user.role = typeof token.role === "string" ? token.role : undefined;
      }
      return session;
    },
  },
};
