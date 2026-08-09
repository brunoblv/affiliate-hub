import type { NextAuthConfig } from "next-auth";

/**
 * Config compatível com Edge Runtime — usada pelo middleware.
 * Não pode importar Prisma nem providers que dependem de Node APIs
 * (Credentials/PrismaAdapter ficam apenas em lib/auth/config.ts).
 */
export const edgeAuthConfig: NextAuthConfig = {
  trustHost: true,
  session: { strategy: "jwt" },
  pages: { signIn: "/admin/login" },
  providers: [],
  callbacks: {
    async session({ session, token }) {
      if (session.user) {
        (session.user as typeof session.user & { role?: string }).role = token.role as string | undefined;
      }
      return session;
    },
  },
};
