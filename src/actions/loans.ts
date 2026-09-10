"use server";

import { revalidatePath } from "next/cache";

import { db } from "@/lib/db";
import { zonedDateTime } from "@/lib/date";
import {
  notifyLoanDecision,
  notifyLoanRequested,
  sendLoanOverdueReminder,
} from "@/lib/notifications";
import { isAdmin, requireAdmin, requireUser } from "@/lib/permissions";
import { checkRateLimit } from "@/lib/rate-limit";
import {
  cancelLoanRequestSchema,
  createLoanRequestSchema,
  markLoanReturnedSchema,
  respondLoanRequestSchema,
} from "@/lib/validations/loans";

export type ActionResult = { success: true } | { success: false; error: string };

export async function createLoanRequest(input: unknown): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = createLoanRequestSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Dades no vàlides" };
  }
  const { itemId, startDate, endDate, purpose } = parsed.data;

  const limited = await checkRateLimit("loanRequest", user.id);
  if (limited) return { success: false, error: limited };
  const start = zonedDateTime(startDate, "00:00");
  const end = zonedDateTime(endDate, "23:59");

  // Es pot demanar un préstec que comenci avui, però no un que ja hauria
  // d'haver estat retornat: seria un registre fals des del primer dia.
  if (end < new Date()) {
    return { success: false, error: "La data de retorn ja ha passat" };
  }

  const item = await db.inventoryItem.findUnique({ where: { id: itemId } });
  if (!item) return { success: false, error: "L'equip no existeix" };
  if (!item.isLoanable) return { success: false, error: "Aquest equip no és prestable" };
  if (item.status !== "ACTIU") return { success: false, error: "Aquest equip no està disponible" };

  const overlapping = await db.loanRequest.findFirst({
    where: {
      itemId,
      status: "APROVADA",
      startDate: { lte: end },
      endDate: { gte: start },
    },
  });
  if (overlapping) {
    return { success: false, error: "L'equip ja té un préstec aprovat en aquestes dates" };
  }

  const created = await db.loanRequest.create({
    data: { itemId, requesterId: user.id, startDate: start, endDate: end, purpose: purpose || null },
  });

  await notifyLoanRequested(created.id);

  revalidatePath("/inventari");
  return { success: true };
}

export async function respondLoanRequest(input: unknown): Promise<ActionResult> {
  const admin = await requireAdmin();
  const parsed = respondLoanRequestSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Dades no vàlides" };
  const { id, status, responseNote } = parsed.data;

  const request = await db.loanRequest.findUnique({ where: { id } });
  if (!request) return { success: false, error: "La sol·licitud no existeix" };
  if (request.status !== "PENDENT") {
    return { success: false, error: "Aquesta sol·licitud ja s'ha resolt" };
  }

  if (status === "APROVADA") {
    const overlapping = await db.loanRequest.findFirst({
      where: {
        itemId: request.itemId,
        status: "APROVADA",
        id: { not: id },
        startDate: { lte: request.endDate },
        endDate: { gte: request.startDate },
      },
    });
    if (overlapping) {
      return { success: false, error: "Ja hi ha un préstec aprovat que se solapa amb aquestes dates" };
    }
  }

  await db.loanRequest.update({
    where: { id },
    data: { status, responseNote: responseNote || null, respondedById: admin.id, respondedAt: new Date() },
  });

  await notifyLoanDecision(id, status === "APROVADA");

  revalidatePath("/inventari");
  return { success: true };
}

export async function cancelLoanRequest(input: unknown): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = cancelLoanRequestSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Dades no vàlides" };

  const request = await db.loanRequest.findUnique({ where: { id: parsed.data.id } });
  if (!request) return { success: false, error: "La sol·licitud no existeix" };
  if (!isAdmin(user.role) && request.requesterId !== user.id) {
    return { success: false, error: "No pots cancel·lar aquesta sol·licitud" };
  }
  if (request.status !== "PENDENT" && request.status !== "APROVADA") {
    return { success: false, error: "Aquesta sol·licitud ja està tancada" };
  }

  await db.loanRequest.update({ where: { id: parsed.data.id }, data: { status: "CANCELLADA" } });
  revalidatePath("/inventari");
  return { success: true };
}

export async function remindOverdueLoan(input: unknown): Promise<ActionResult> {
  await requireAdmin();
  const parsed = markLoanReturnedSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Dades no vàlides" };

  const result = await sendLoanOverdueReminder(parsed.data.id);
  if (!result.sent) {
    return { success: false, error: `No s'ha pogut enviar el recordatori: ${result.reason}` };
  }
  return { success: true };
}

export async function markLoanReturned(input: unknown): Promise<ActionResult> {
  await requireAdmin();
  const parsed = markLoanReturnedSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Dades no vàlides" };

  const request = await db.loanRequest.findUnique({ where: { id: parsed.data.id } });
  if (!request) return { success: false, error: "La sol·licitud no existeix" };
  if (request.status !== "APROVADA") {
    return { success: false, error: "Només es poden retornar préstecs aprovats" };
  }

  await db.loanRequest.update({
    where: { id: parsed.data.id },
    data: { status: "RETORNADA", returnedAt: new Date() },
  });
  revalidatePath("/inventari");
  revalidatePath(`/inventari/${request.itemId}`);
  return { success: true };
}
