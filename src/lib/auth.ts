import { PrismaAdapter } from "@auth/prisma-adapter";
import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

import { db } from "@/lib/db";

const workspaceDomain = process.env.GOOGLE_WORKSPACE_DOMAIN?.toLowerCase();
const adminEmails = (process.env.ADMIN_EMAILS ?? "")
  .split(",")
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean);

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(db),
  session: { strategy: "database" },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers: [
    Google({
      authorization: {
        params: {
          hd: workspaceDomain,
          prompt: "select_account",
        },
      },
    }),
  ],
  callbacks: {
    async signIn({ user }) {
      const email = user.email?.toLowerCase();
      if (!email) return false;
      if (workspaceDomain && !email.endsWith(`@${workspaceDomain}`)) return false;

      // ADMIN_EMAILS és la llista de super admins i mana sobre la base de
      // dades: qui té accés al servidor és qui reparteix els permisos. Es
      // reconcilia a cada inici de sessió perquè l'esdeveniment `createUser`
      // només salta el primer cop.
      if (adminEmails.includes(email)) {
        await db.user.updateMany({
          where: { email, role: { not: "SUPER_ADMIN" } },
          data: { role: "SUPER_ADMIN" },
        });
      } else if (adminEmails.length > 0) {
        // Qui surt de la llista deixa de ser super admin, però es queda com a
        // coordinador. La condició `length > 0` evita que una variable buida o
        // mal configurada degradi tothom i deixi el centre sense ningú que
        // pugui repartir permisos.
        await db.user.updateMany({
          where: { email, role: "SUPER_ADMIN" },
          data: { role: "ADMIN" },
        });
      }

      await db.user.updateMany({ where: { email }, data: { lastLoginAt: new Date() } });
      return true;
    },
    async session({ session, user }) {
      session.user.id = user.id;
      session.user.role = user.role;
      session.user.isTutor = user.isTutor;
      return session;
    },
  },
  events: {
    async createUser({ user }) {
      const email = user.email?.toLowerCase();
      if (email && adminEmails.includes(email)) {
        await db.user.update({ where: { id: user.id }, data: { role: "SUPER_ADMIN" } });
      }
    },
  },
});
