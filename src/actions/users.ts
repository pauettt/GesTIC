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

  await db.user.update({ where: { id: userId }, data: { role } });
  revalidatePath("/usuaris");
  return { success: true };
}
