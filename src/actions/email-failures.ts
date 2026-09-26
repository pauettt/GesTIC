"use server";

import { revalidatePath } from "next/cache";

import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/permissions";
import { dismissEmailFailuresSchema } from "@/lib/validations/email-failures";

export type ActionResult = { success: true } | { success: false; error: string };

/**
 * La coordinació ha vist els correus que no han sortit i en treu l'avís. Només
 * fins a l'últim que tenia a la pantalla: si mentrestant n'ha fallat un altre,
 * l'avís continua.
 */
export async function dismissEmailFailures(input: unknown): Promise<ActionResult> {
  await requireAdmin();
  const parsed = dismissEmailFailuresSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Dades no vàlides" };

  const newest = await db.emailFailure.findUnique({
    where: { id: parsed.data.upToId },
    select: { createdAt: true },
  });
  // Si ja no hi és, algú altre les acaba de donar per revisades.
  if (newest) {
    await db.emailFailure.deleteMany({ where: { createdAt: { lte: newest.createdAt } } });
  }

  revalidatePath("/panell");
  revalidatePath("/administracio");
  return { success: true };
}
