"use server";

import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { Role } from "@prisma/client";

import { db } from "@/lib/db";
import { isDevLoginEnabled } from "@/lib/dev-login-enabled";

const DEV_USERS: Record<Role, { email: string; name: string }> = {
  SUPER_ADMIN: { email: "superadmin.prova@local.test", name: "Super admin de prova" },
  ADMIN: { email: "admin.prova@local.test", name: "Coordinador/a de prova" },
  PROFESSOR: { email: "professor.prova@local.test", name: "Professor/a de prova" },
};

const SESSION_COOKIE_NAME = "authjs.session-token";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24; // 1 dia

// Només disponible en desenvolupament local: permet provar l'aplicació sense
// haver configurat encara les credencials OAuth de Google. Aquest fitxer no
// té cap efecte en producció (NODE_ENV sempre és "production" als desplegaments).
export async function devLogin(role: Role) {
  if (!isDevLoginEnabled()) {
    throw new Error("El dev login no està disponible.");
  }

  const { email, name } = DEV_USERS[role];
  const user = await db.user.upsert({
    where: { email },
    update: { role },
    create: { email, name, role },
  });

  const sessionToken = randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + SESSION_MAX_AGE_SECONDS * 1000);
  await db.session.create({ data: { sessionToken, userId: user.id, expires } });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, sessionToken, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    expires,
  });

  redirect("/");
}
