import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/db";

const adminEmails = (process.env.ADMIN_EMAILS ?? "")
  .split(",")
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean);

export const isAdminEmail = (email?: string | null) =>
  !!email && adminEmails.includes(email.toLowerCase());

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
    }),
  ],
  session: { strategy: "jwt" },
  pages: { signIn: "/entrar" },
  callbacks: {
    signIn({ account, profile }) {
      // Só aceita e-mail verificado pelo Google.
      return account?.provider !== "google" || profile?.email_verified === true;
    },
    jwt({ token }) {
      token.isAdmin = isAdminEmail(token.email);
      return token;
    },
    session({ session, token }) {
      session.user.id = token.sub ?? "";
      session.user.isAdmin = token.isAdmin === true;
      return session;
    },
    authorized({ auth: session, request }) {
      const { pathname } = request.nextUrl;
      if (pathname.startsWith("/admin")) return session?.user?.isAdmin === true;
      if (pathname.startsWith("/conta")) return !!session?.user;
      return true;
    },
  },
});
