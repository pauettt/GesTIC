"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db } from "@/lib/db";
import { requireSuperAdmin } from "@/lib/permissions";

export type ActionResult = { success: true } | { success: false; error: string };

// Només es pot moure gent entre coordinació, consergeria i professorat.
// SUPER_ADMIN no hi és a propòsit: es designa amb ADMIN_EMAILS al servidor i no
// es pot atorgar des de la interfície.
const setUserRoleSchema = z.object({
  userId: z.string().min(1),
  role: z.enum(["ADMIN", "CONSERGERIA", "PROFESSOR"]),
});

export async function setUserRole(input: unknown): Promise<ActionResult> {
  const superAdmin = await requireSuperAdmin();
  const parsed = setUserRoleSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Dades no vàlides" };
  const { userId, role } = parsed.data;

  if (userId === superAdmin.id) {
    return { success: false, error: "No pots canviar el teu propi permís" };
  }

  const target = await db.user.findUnique({ where: { id: userId } });
  if (!target) return { success: false, error: "Aquest usuari no existeix" };
  if (target.role === "SUPER_ADMIN") {
    return {
      success: false,
      error: "Els administradors es defineixen a ADMIN_EMAILS, al servidor",
    };
  }

  await db.user.update({
    where: { id: userId },
    // Consergeria comparteix un compte de taulell i `requireUser` el treu de
    // tota la part general de l'aplicació: si algú hi acaba amb la marca de
    // tutor posada, es queda com una casella marcada que no fa res.
    data: { role, ...(role === "CONSERGERIA" ? { isTutor: false } : {}) },
  });
  revalidatePath("/usuaris");
  return { success: true };
}

// La tutoria no és un rol i va a part del desplegable de permisos: se suma al
// que l'usuari ja té, perquè un coordinador TIC també pot ser tutor d'un grup.
const setUserTutorSchema = z.object({
  userId: z.string().min(1),
  isTutor: z.boolean(),
});

export async function setUserTutor(input: unknown): Promise<ActionResult> {
  await requireSuperAdmin();
  const parsed = setUserTutorSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Dades no vàlides" };
  const { userId, isTutor } = parsed.data;

  const target = await db.user.findUnique({ where: { id: userId } });
  if (!target) return { success: false, error: "Aquest usuari no existeix" };
  if (target.role === "CONSERGERIA") {
    return { success: false, error: "El compte de consergeria no pot ser tutor/a" };
  }

  await db.user.update({ where: { id: userId }, data: { isTutor } });
  revalidatePath("/usuaris");
  return { success: true };
}
