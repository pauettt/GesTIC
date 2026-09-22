"use server";

import { revalidatePath } from "next/cache";

import { db } from "@/lib/db";
import {
  notifyRecurringCancelled,
  notifyRecurringDecision,
  notifyRecurringRequested,
} from "@/lib/notifications";
import { isAdmin, requireAdmin, requireUser } from "@/lib/permissions";
import { checkRateLimit } from "@/lib/rate-limit";
import { occurrences, recurringCourse, shortDay } from "@/lib/recurring-reservations";
import { getPeriodById } from "@/lib/schedule";
import {
  decideRecurringReservationSchema,
  recurringReservationIdSchema,
  requestRecurringReservationSchema,
} from "@/lib/validations/chromebooks";

export type ActionResult = { success: true } | { success: false; error: string };

/** Un motiu per no aprovar-la que ha de veure la coordinació, dins la transacció. */
class RecurringRefused extends Error {}

function revalidateRecurring(cartId: string) {
  revalidatePath("/chromebooks/reserves-fixes");
  revalidatePath(`/chromebooks/${cartId}`);
  revalidatePath("/chromebooks");
  revalidatePath("/panell");
  revalidatePath("/");
}

/**
 * Demana un carro el mateix dia i la mateixa sessió cada setmana del curs, fins
 * al 30 de juny. Queda pendent fins que la coordinació TIC la decideix, i
 * mentrestant la sessió continua lliure per a tothom.
 */
export async function requestRecurringReservation(input: unknown): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = requestRecurringReservationSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Dades no vàlides" };
  }
  const { cartId, weekday, periodId, purpose } = parsed.data;
  if (!getPeriodById(periodId)) {
    return { success: false, error: "Aquesta sessió no existeix a l'horari del centre" };
  }

  const limited = await checkRateLimit("recurringReservation", user.id);
  if (limited) return { success: false, error: limited };

  const { schoolYear } = recurringCourse();
  if (occurrences(weekday, periodId, schoolYear).length === 0) {
    return { success: false, error: "Aquest curs ja no queda cap setmana amb aquesta sessió" };
  }

  const cart = await db.cart.findUnique({ where: { id: cartId }, select: { id: true } });
  if (!cart) return { success: false, error: "Aquest carro ja no existeix" };

  const slot = { cartId, weekday, periodId, schoolYear };
  const approved = await db.recurringReservation.findFirst({
    where: { ...slot, status: "APROVADA" },
    select: { userId: true, user: { select: { name: true, email: true } } },
  });
  if (approved) {
    return {
      success: false,
      error:
        approved.userId === user.id
          ? "Aquesta sessió ja és teva cada setmana"
          : `Aquesta sessió ja és fixa de ${approved.user.name ?? approved.user.email} aquest curs`,
    };
  }
  const pending = await db.recurringReservation.count({ where: { ...slot, userId: user.id, status: "PENDENT" } });
  if (pending > 0) return { success: false, error: "Ja l'has demanada i està pendent d'aprovar" };

  const created = await db.recurringReservation.create({
    data: { ...slot, userId: user.id, purpose },
    select: { id: true },
  });
  await notifyRecurringRequested(created.id);

  revalidateRecurring(cartId);
  return { success: true };
}

/**
 * La coordinació aprova o rebutja una reserva fixa. En aprovar-la, es crea una
 * reserva per a cada setmana que queda del curs; les que algú ja tenia
 * reservades es respecten i se salten, i el correu a qui l'ha demanada diu
 * quines són.
 */
export async function decideRecurringReservation(input: unknown): Promise<ActionResult> {
  const admin = await requireAdmin();
  const parsed = decideRecurringReservationSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Dades no vàlides" };
  }
  const { id, approve, responseNote } = parsed.data;

  const recurring = await db.recurringReservation.findUnique({ where: { id } });
  if (!recurring) return { success: false, error: "Aquesta reserva fixa no existeix" };
  if (recurring.status !== "PENDENT") return { success: false, error: "Aquesta reserva fixa ja s'ha resolt" };
  const decision = { responseNote: responseNote || null, respondedById: admin.id, respondedAt: new Date() };

  if (!approve) {
    const { count } = await db.recurringReservation.updateMany({
      where: { id, status: "PENDENT" },
      data: { status: "REBUTJADA", ...decision },
    });
    if (count === 0) return { success: false, error: "Aquesta reserva fixa ja s'ha resolt" };
    await notifyRecurringDecision(id, { approved: false, weeks: 0, skipped: [] });
    revalidateRecurring(recurring.cartId);
    return { success: true };
  }

  const { cartId, userId, weekday, periodId, schoolYear, purpose } = recurring;
  let outcome: { weeks: number; skipped: string[] };
  try {
    outcome = await db.$transaction(async (tx) => {
      // Bloqueja el carro fins al final: mentre es reparteixen les setmanes, cap
      // altra reserva del carro no es pot desar pel mig.
      await tx.$queryRaw`SELECT "id" FROM "Cart" WHERE "id" = ${cartId} FOR UPDATE`;

      const current = await tx.recurringReservation.findUnique({ where: { id }, select: { status: true } });
      if (current?.status !== "PENDENT") throw new RecurringRefused("Aquesta reserva fixa ja s'ha resolt");

      const taken = await tx.recurringReservation.findFirst({
        where: { cartId, weekday, periodId, schoolYear, status: "APROVADA" },
        select: { user: { select: { name: true, email: true } } },
      });
      if (taken) {
        throw new RecurringRefused(
          `Aquesta sessió ja és fixa de ${taken.user.name ?? taken.user.email} aquest curs: rebutja aquesta`,
        );
      }

      const weeks = occurrences(weekday, periodId, schoolYear);
      if (weeks.length === 0) throw new RecurringRefused("Aquest curs ja no queda cap setmana amb aquesta sessió");

      const booked = await tx.reservation.findMany({
        where: { cartId, status: "CONFIRMADA", startDate: { in: weeks.map((week) => week.startDate) } },
        select: { startDate: true, userId: true },
      });
      const bookedBy = new Map(booked.map((reservation) => [reservation.startDate.getTime(), reservation.userId]));
      const free = weeks.filter((week) => !bookedBy.has(week.startDate.getTime()));

      await tx.reservation.createMany({
        data: free.map((week) => ({
          cartId,
          userId,
          startDate: week.startDate,
          endDate: week.endDate,
          purpose,
          recurringId: id,
        })),
      });
      await tx.recurringReservation.update({ where: { id }, data: { status: "APROVADA", ...decision } });

      return {
        weeks: free.length,
        // Les que ja tenia reservades la mateixa persona no cal dir-les: la sessió ja és seva.
        skipped: weeks
          .filter((week) => {
            const owner = bookedBy.get(week.startDate.getTime());
            return owner !== undefined && owner !== userId;
          })
          .map((week) => shortDay(week.dateKey)),
      };
    });
  } catch (error) {
    if (error instanceof RecurringRefused) return { success: false, error: error.message };
    console.error("[reserva fixa] no s'ha pogut aprovar:", error);
    return { success: false, error: "No s'ha pogut aprovar la reserva fixa. Torna-ho a provar." };
  }

  await notifyRecurringDecision(id, { approved: true, ...outcome });
  revalidateRecurring(cartId);
  return { success: true };
}

/**
 * Retira una reserva fixa pendent, o anul·la una d'aprovada, en qualsevol
 * moment del curs: les setmanes que queden tornen a ser lliures, i les que ja
 * han passat es queden com a registre. Ho pot fer qui l'ha demanada o la
 * coordinació; si és la coordinació, a qui la tenia li arriba un correu. Queda
 * qui ho ha fet i quan, per a l'historial.
 */
export async function cancelRecurringReservation(input: unknown): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = recurringReservationIdSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Dades no vàlides" };
  const { id } = parsed.data;

  const recurring = await db.recurringReservation.findUnique({ where: { id } });
  if (!recurring) return { success: false, error: "Aquesta reserva fixa no existeix" };
  if (!isAdmin(user.role) && recurring.userId !== user.id) {
    return { success: false, error: "Aquesta reserva fixa no és teva" };
  }
  if (recurring.status !== "PENDENT" && recurring.status !== "APROVADA") {
    return { success: false, error: "Aquesta reserva fixa ja està tancada" };
  }

  const now = new Date();
  const cancelled = await db.$transaction(async (tx) => {
    const { count } = await tx.recurringReservation.updateMany({
      where: { id, status: recurring.status },
      data: { status: "CANCELLADA", cancelledById: user.id, cancelledAt: now },
    });
    if (count === 0) return false;
    // La d'avui, si ja ha començat, es queda: el carro ja pot ser a l'aula.
    await tx.reservation.updateMany({
      where: { recurringId: id, status: "CONFIRMADA", startDate: { gt: now } },
      data: { status: "CANCELLADA" },
    });
    return true;
  });
  if (!cancelled) return { success: false, error: "Aquesta reserva fixa ja està tancada" };

  if (recurring.status === "APROVADA" && recurring.userId !== user.id) {
    await notifyRecurringCancelled(id, user.name ?? user.email ?? "Algú");
  }
  revalidateRecurring(recurring.cartId);
  return { success: true };
}
