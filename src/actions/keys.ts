"use server";

import { revalidatePath } from "next/cache";

import { db } from "@/lib/db";
import { formatDateTime, madridDateKey } from "@/lib/date";
import { buildKeyNotReturnedEmail, sendEmail } from "@/lib/email";
import { requireKeyAccess, requireSuperAdmin } from "@/lib/permissions";
import {
  deleteKeySchema,
  deliverKeySchema,
  remindKeySchema,
  returnKeySchema,
  setConciergeActiveSchema,
  upsertConciergeSchema,
  upsertKeySchema,
} from "@/lib/validations/keys";

export type ActionResult = { success: true } | { success: false; error: string };

// ---------------------------------------------------------------------------
// Noms de conserge (els manté el super admin)
// ---------------------------------------------------------------------------

export async function upsertConcierge(input: unknown): Promise<ActionResult> {
  await requireSuperAdmin();
  const parsed = upsertConciergeSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Dades no vàlides" };
  }
  const { id, name } = parsed.data;

  const duplicate = await db.concierge.findFirst({
    where: { name, ...(id ? { id: { not: id } } : {}) },
  });
  if (duplicate) return { success: false, error: "Ja hi ha un conserge amb aquest nom" };

  if (id) {
    await db.concierge.update({ where: { id }, data: { name } });
  } else {
    await db.concierge.create({ data: { name } });
  }

  revalidatePath("/usuaris");
  revalidatePath("/consergeria");
  return { success: true };
}

/**
 * Els conserges no s'esborren, es donen de baixa: els préstecs antics han de
 * seguir dient qui va entregar cada clau.
 */
export async function setConciergeActive(input: unknown): Promise<ActionResult> {
  await requireSuperAdmin();
  const parsed = setConciergeActiveSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Dades no vàlides" };

  await db.concierge.update({
    where: { id: parsed.data.id },
    data: { active: parsed.data.active },
  });

  revalidatePath("/usuaris");
  revalidatePath("/consergeria");
  return { success: true };
}

// ---------------------------------------------------------------------------
// Claus del centre
// ---------------------------------------------------------------------------

export async function upsertKey(input: unknown): Promise<ActionResult> {
  await requireKeyAccess();
  const parsed = upsertKeySchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Dades no vàlides" };
  }
  const { id, number, name, cartId, copies, notes } = parsed.data;

  const duplicate = await db.key.findFirst({
    where: { number, ...(id ? { id: { not: id } } : {}) },
  });
  if (duplicate) return { success: false, error: `Ja hi ha una clau amb el número ${number}` };

  const data = {
    number,
    name,
    cartId: cartId || null,
    copies,
    notes: notes || null,
  };

  if (id) {
    await db.key.update({ where: { id }, data });
  } else {
    await db.key.create({ data });
  }

  revalidatePath("/consergeria");
  return { success: true };
}

export async function deleteKey(input: unknown): Promise<ActionResult> {
  await requireKeyAccess();
  const parsed = deleteKeySchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Dades no vàlides" };

  // Amb una clau fora, esborrar-la deixaria el préstec sense rastre i ningú
  // sabria a qui reclamar-la.
  const out = await db.keyLoan.count({
    where: { keyId: parsed.data.id, returnedAt: null },
  });
  if (out > 0) {
    return { success: false, error: "Aquesta clau està fora; registra'n el retorn abans" };
  }

  await db.key.delete({ where: { id: parsed.data.id } });
  revalidatePath("/consergeria");
  return { success: true };
}

// ---------------------------------------------------------------------------
// Entrega i retorn
// ---------------------------------------------------------------------------

export async function deliverKey(input: unknown): Promise<ActionResult> {
  await requireKeyAccess();
  const parsed = deliverKeySchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Dades no vàlides" };
  }
  const { keyId, borrowerId, deliveredById, reservationId, reason } = parsed.data;

  const key = await db.key.findUnique({
    where: { id: keyId },
    include: { _count: { select: { loans: { where: { returnedAt: null } } } } },
  });
  if (!key) return { success: false, error: "Aquesta clau no existeix" };

  // No es poden entregar més còpies de les que hi ha al clauer.
  if (key._count.loans >= key.copies) {
    return {
      success: false,
      error: `No queda cap còpia: les ${key.copies} estan fora`,
    };
  }

  await db.keyLoan.create({
    data: {
      keyId,
      borrowerId,
      deliveredById,
      reservationId: reservationId || null,
      reason: reason || null,
    },
  });

  revalidatePath("/consergeria");
  return { success: true };
}

/** La torna qualsevol conserge, així que no cal registrar qui la rep. */
export async function returnKey(input: unknown): Promise<ActionResult> {
  await requireKeyAccess();
  const parsed = returnKeySchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Dades no vàlides" };

  const loan = await db.keyLoan.findUnique({ where: { id: parsed.data.loanId } });
  if (!loan) return { success: false, error: "Aquest préstec no existeix" };
  if (loan.returnedAt) return { success: false, error: "Aquesta clau ja consta tornada" };

  await db.keyLoan.update({
    where: { id: loan.id },
    data: { returnedAt: new Date() },
  });

  revalidatePath("/consergeria");
  return { success: true };
}

/**
 * Avís manual a qui no ha tornat la clau. Es desa qui l'envia i quan, i la
 * pantalla ho ensenya al costat de la fila: amb tres conserges al taulell, si
 * no es veiés, el mateix professor rebria tres correus.
 */
export async function remindKeyReturn(input: unknown): Promise<ActionResult> {
  await requireKeyAccess();
  const parsed = remindKeySchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Dades no vàlides" };
  }

  const loan = await db.keyLoan.findUnique({
    where: { id: parsed.data.loanId },
    include: { borrower: true, key: true },
  });
  if (!loan) return { success: false, error: "Aquest préstec no existeix" };
  if (loan.returnedAt) return { success: false, error: "Aquesta clau ja consta tornada" };

  const concierge = await db.concierge.findUnique({ where: { id: parsed.data.remindedById } });
  if (!concierge) return { success: false, error: "Aquest conserge no existeix" };

  const result = await sendEmail({
    to: loan.borrower.email,
    ...buildKeyNotReturnedEmail({
      keyLabel: `${loan.key.number} — ${loan.key.name}`,
      deliveredAt: formatDateTime(loan.deliveredAt),
      conciergeName: concierge.name,
    }),
  });

  if (!result.sent) {
    return { success: false, error: `No s'ha pogut enviar el correu: ${result.reason}` };
  }

  await db.keyLoan.update({
    where: { id: loan.id },
    data: { remindedAt: new Date(), remindedById: concierge.id },
  });

  revalidatePath("/consergeria");
  return { success: true };
}

/** Reserves del dia d'avui, per encadenar les hores seguides d'un mateix bloc. */
export async function todayReservations(cartId: string, userId: string) {
  const today = madridDateKey(new Date());
  const all = await db.reservation.findMany({
    where: { cartId, userId, status: "CONFIRMADA" },
    select: { startDate: true, endDate: true },
  });
  return all.filter((slot) => madridDateKey(slot.startDate) === today);
}
