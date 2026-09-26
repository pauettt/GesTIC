import { PrismaAdapter } from "@auth/prisma-adapter";
import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { cookies } from "next/headers";

import { db } from "@/lib/db";
import { checkGoogleSignIn } from "@/lib/google-sign-in";
import { SESSION_COOKIE_NAMES } from "@/lib/session-cookie";

const workspaceDomain = process.env.GOOGLE_WORKSPACE_DOMAIN?.toLowerCase();
const adminEmails = (process.env.ADMIN_EMAILS ?? "")
  .split(",")
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean);

const hasExternalAdmin = adminEmails.some((email) => !email.endsWith(`@${workspaceDomain}`));

// Quan el navegador ja té la sessió d'algú i el compte de Google encara no és de
// ningú, Auth.js no crea cap usuari: vincula el compte a l'usuari d'aquella
// sessió, i des de llavors aquell compte entra amb els permisos de l'altre. Va
// passar el 2026-09-13 entrant com a coordtic amb la sessió d'un professor
// oberta. Si es tanca aquí la sessió d'un altre usuari, Auth.js ho tracta com
// una entrada nova. Funciona perquè el callback `signIn` corre abans que Auth.js
// consulti la sessió (`@auth/core`, lib/actions/callback/index.js); si una
// actualització ho canviés, `checkGoogleSignIn` continuaria impedint entrar-hi
// com un altre.
async function closeOtherUsersSession(email: string) {
  const cookieStore = await cookies();
  const sessionTokens = SESSION_COOKIE_NAMES.map((name) => cookieStore.get(name)?.value).filter(
    (token): token is string => Boolean(token),
  );
  if (sessionTokens.length === 0) return;

  await db.session.deleteMany({
    where: { sessionToken: { in: sessionTokens }, user: { email: { not: email } } },
  });
}

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
          ...(workspaceDomain && !hasExternalAdmin ? { hd: workspaceDomain } : {}),
          prompt: "select_account",
        },
      },
    }),
  ],
  callbacks: {
    async signIn({ user, profile }) {
      const verdict = checkGoogleSignIn({
        googleEmail: profile?.email,
        emailVerified: profile?.email_verified,
        // Auth.js no declara `hd` al tipus del perfil, d'aquí el cast.
        hostedDomain: (profile as { hd?: unknown } | undefined)?.hd,
        userEmail: user.email,
        workspaceDomain,
        adminEmails,
      });
      if (!verdict.allowed) {
        if (verdict.reason === "domain-not-configured") {
          console.error("[auth] GOOGLE_WORKSPACE_DOMAIN sense configurar: no es deixa entrar ningú");
          return false;
        }
        if (verdict.reason === "linked-to-another-user") {
          console.error(
            `[auth] el compte de Google de ${profile?.email} està vinculat a l'usuari ${user.email}: no es deixa entrar`,
          );
          return "/login?error=AccountLinked";
        }
        // Sense això, «no puc entrar» no deixava cap rastre: la pantalla diu el
        // mateix per a tots els motius i el motiu només el sap aquest callback.
        console.warn(`[auth] entrada rebutjada (${verdict.reason}): ${profile?.email ?? "sense correu"}`);
        return false;
      }
      const { email } = verdict;

      // Accés retirat a /usuaris: el compte de Google pot seguir actiu (una
      // substitució acabada, un trasllat), però a gesTIC ja no s'hi entra.
      const existing = await db.user.findUnique({ where: { email }, select: { disabledAt: true } });
      if (existing?.disabledAt) {
        console.warn(`[auth] entrada rebutjada (accés retirat): ${email}`);
        return false;
      }

      await closeOtherUsersSession(email);

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
