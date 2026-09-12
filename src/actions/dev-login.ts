"use server";

import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { Role } from "@prisma/client";

import { db } from "@/lib/db";
import { isDevLoginEnabled } from "@/lib/dev-login-enabled";

// Hi ha dos professors a propòsit: és l'única manera de comprovar que el
// professorat no es veu ni es toca la feina entre si (incidències, préstecs,
// consultes). Amb un de sol, entrant-hi sempre com el mateix, l'aïllament
// sembla que funciona encara que estigui trencat.
const DEV_USERS = {
  SUPER_ADMIN: {
    role: "SUPER_ADMIN",
    email: "superadmin.prova@local.test",
    name: "Super admin de prova",
    isTutor: false,
  },
  ADMIN: {
    role: "ADMIN",
    email: "admin.prova@local.test",
    name: "Coordinador/a de prova",
    isTutor: false,
  },
  CONSERGERIA: {
    role: "CONSERGERIA",
    email: "consergeria.prova@local.test",
    name: "Consergeria de prova",
    isTutor: false,
  },
  PROFESSOR: {
    role: "PROFESSOR",
    email: "professor.prova@local.test",
    name: "Professor/a de prova",
    isTutor: false,
  },
  PROFESSOR_2: {
    role: "PROFESSOR",
    email: "professor2.prova@local.test",
    name: "Professor/a de prova 2",
    isTutor: false,
  },
  PROFESSOR_TUTOR: {
    role: "PROFESSOR",
    email: "tutor.prova@local.test",
    name: "Tutor/a de prova",
    isTutor: true,
  },
} satisfies Record<string, { role: Role; email: string; name: string; isTutor: boolean }>;

export type DevUserKey = keyof typeof DEV_USERS;

const SESSION_COOKIE_NAME = "authjs.session-token";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24; // 1 dia

// Només disponible en desenvolupament local: permet provar l'aplicació sense
// haver configurat encara les credencials OAuth de Google. Aquest fitxer no
// té cap efecte en producció (NODE_ENV sempre és "production" als desplegaments).
export async function devLogin(key: DevUserKey) {
  if (!isDevLoginEnabled()) {
    throw new Error("El dev login no està disponible.");
  }

  // El rol i la tutoria de cada compte manen sobre la base de dades a cada
  // entrada: marcar el "Professor/a de prova" com a tutor des de /usuaris no
  // s'hi queda. Per provar la part de tutors hi ha el compte "Tutor/a de
  // prova", i així el professorat de prova segueix servint per comprovar que a
  // qui no és tutor no li surt res.
  const { role, email, name, isTutor } = DEV_USERS[key];
  const user = await db.user.upsert({
    where: { email },
    update: { role, isTutor },
    create: { email, name, role, isTutor },
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
