"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { auditName, recordAudit } from "@/lib/audit";
import { db } from "@/lib/db";
import { roleLabels } from "@/lib/labels";
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
      error: "Els superadministradors es defineixen a ADMIN_EMAILS, al servidor",
    };
  }
  if (target.role === role) return { success: true };

  await db.user.update({
    where: { id: userId },
    // Consergeria comparteix un compte de taulell i `requireUser` el treu de
    // tota la part general de l'aplicació: si algú hi acaba amb la marca de
    // tutor posada, es queda com una casella marcada que no fa res.
    data: { role, ...(role === "CONSERGERIA" ? { isTutor: false } : {}) },
  });

  await recordAudit(
    superAdmin.id,
    "user.role",
    `${auditName(target)}: de ${roleLabels[target.role]} a ${roleLabels[role]}`,
  );
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
  const superAdmin = await requireSuperAdmin();
  const parsed = setUserTutorSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Dades no vàlides" };
  const { userId, isTutor } = parsed.data;

  const target = await db.user.findUnique({ where: { id: userId } });
  if (!target) return { success: false, error: "Aquest usuari no existeix" };
  if (target.role === "CONSERGERIA") {
    return { success: false, error: "El compte de consergeria no pot ser tutor/a" };
  }
  if (target.isTutor === isTutor) return { success: true };

  await db.user.update({ where: { id: userId }, data: { isTutor } });

  await recordAudit(
    superAdmin.id,
    "user.tutor",
    `${auditName(target)} ${isTutor ? "passa a constar" : "deixa de constar"} com a tutor/a`,
  );
  revalidatePath("/usuaris");
  return { success: true };
}

const setUserAccessSchema = z.object({
  userId: z.string().min(1),
  enabled: z.boolean(),
});

/**
 * Retira o torna l'accés a gesTIC. És per a qui ja no és al centre però conserva
 * el compte de Google: una substitució que s'acaba, un trasllat, una jubilació.
 *
 * L'usuari no s'esborra —el que va fer ha de continuar dient qui ho va fer—,
 * però ja no pot entrar, les sessions que tingui obertes es tanquen a l'instant
 * i deixa de sortir a les llistes on se l'avisa o se li entrega res.
 */
export async function setUserAccess(input: unknown): Promise<ActionResult> {
  const superAdmin = await requireSuperAdmin();
  const parsed = setUserAccessSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Dades no vàlides" };
  const { userId, enabled } = parsed.data;

  if (userId === superAdmin.id) {
    return { success: false, error: "No et pots retirar l'accés a tu mateix" };
  }

  const target = await db.user.findUnique({ where: { id: userId } });
  if (!target) return { success: false, error: "Aquest usuari no existeix" };
  if (target.role === "SUPER_ADMIN") {
    return {
      success: false,
      error: "Els superadministradors es defineixen a ADMIN_EMAILS, al servidor",
    };
  }
  if (Boolean(target.disabledAt) === !enabled) return { success: true };

  if (enabled) {
    await db.user.update({ where: { id: userId }, data: { disabledAt: null } });
  } else {
    // Totes dues coses alhora: sense esborrar les sessions, qui ja era dins s'hi
    // quedaria fins que la sessió caduqués.
    await db.$transaction([
      db.user.update({ where: { id: userId }, data: { disabledAt: new Date() } }),
      db.session.deleteMany({ where: { userId } }),
    ]);
  }

  await recordAudit(
    superAdmin.id,
    "user.access",
    enabled ? `Accés retornat a ${auditName(target)}` : `Accés retirat a ${auditName(target)}`,
  );
  revalidatePath("/usuaris");
  return { success: true };
}
