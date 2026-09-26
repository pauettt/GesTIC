"use server";

import { revalidatePath } from "next/cache";

import { db } from "@/lib/db";
import { holidayBounds } from "@/lib/holidays";
import { requireAdmin } from "@/lib/permissions";
import { occurrences } from "@/lib/recurring-reservations";
import { createHolidaySchema, deleteHolidaySchema } from "@/lib/validations/holidays";

type Failure = { success: false; error: string };

/** Un motiu per no esborrar-lo que ha de veure qui ho prova, dins la transacció. */
class HolidayRefused extends Error {}

function revalidateCalendar() {
  revalidatePath("/panell");
  // La graella de cada carro, el cercador i les reserves fixes.
  revalidatePath("/chromebooks", "layout");
  revalidatePath("/");
}

/**
 * La coordinació entra un festiu. Les setmanes de reserves fixes que hi queien
 * les havia posat l'aplicació, no ningú: s'esborren, i si el festiu s'esborra
 * es tornen a posar (`deleteHoliday`). Les reserves puntuals d'aquells dies les
 * ha fet algú a propòsit i es queden; el resultat diu quantes n'hi ha.
 */
export async function createHoliday(
  input: unknown,
): Promise<{ success: true; freed: number; oneOff: number } | Failure> {
  await requireAdmin();
  const parsed = createHolidaySchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Dades no vàlides" };
  }
  const { name, startDate, endDate } = parsed.data;

  const { from, to } = holidayBounds({ startDate, endDate });
  const now = new Date();
  // El que ja ha començat no es toca: és història.
  const upcoming = { gte: from > now ? from : now, lt: to };

  let result: { freed: number; oneOff: number };
  try {
    result = await db.$transaction(async (tx) => {
      await tx.schoolHoliday.create({ data: { name, startDate, endDate } });
      const { count } = await tx.reservation.deleteMany({
        where: { recurringId: { not: null }, status: "CONFIRMADA", startDate: upcoming },
      });
      const kept = await tx.reservation.count({
        where: { recurringId: null, status: "CONFIRMADA", startDate: upcoming },
      });
      return { freed: count, oneOff: kept };
    });
  } catch (error) {
    console.error("[festius] no s'ha pogut desar:", error);
    return { success: false, error: "No s'ha pogut desar el festiu. Torna-ho a provar." };
  }

  revalidateCalendar();
  return { success: true, ...result };
}

/**
 * Treu un festiu (entrat per error, o que al final no ho és) i torna a posar
 * les setmanes de les reserves fixes aprovades que hi queien. No les que el
 * titular havia alliberat abans —aquelles setmanes tenen la seva fila
 * cancel·lada— ni les que mentrestant ha reservat algú altre.
 */
export async function deleteHoliday(input: unknown): Promise<{ success: true; restored: number } | Failure> {
  await requireAdmin();
  const parsed = deleteHolidaySchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Dades no vàlides" };
  const { id } = parsed.data;
  const now = new Date();

  let restored: number;
  try {
    restored = await db.$transaction(async (tx) => {
      const holiday = await tx.schoolHoliday.findUnique({ where: { id } });
      if (!holiday) throw new HolidayRefused("Aquest festiu ja no hi és");
      await tx.schoolHoliday.delete({ where: { id } });

      // Els dies que continuen sent festius per un altre festiu no es tornen a posar.
      const remaining = await tx.schoolHoliday.findMany({
        select: { id: true, name: true, startDate: true, endDate: true },
      });
      const series = await tx.recurringReservation.findMany({
        where: { status: "APROVADA" },
        select: {
          id: true,
          cartId: true,
          userId: true,
          weekday: true,
          periodId: true,
          schoolYear: true,
          purpose: true,
        },
      });

      let created = 0;
      for (const fixed of series) {
        const weeks = occurrences(fixed.weekday, fixed.periodId, fixed.schoolYear, now, remaining).filter(
          (week) => holiday.startDate <= week.dateKey && week.dateKey <= holiday.endDate,
        );
        if (weeks.length === 0) continue;

        const starts = weeks.map((week) => week.startDate);
        // Qualsevol fila de la sèrie, també cancel·lada: aquella setmana el titular ja l'havia alliberada.
        const own = await tx.reservation.findMany({
          where: { recurringId: fixed.id, startDate: { in: starts } },
          select: { startDate: true },
        });
        const busy = await tx.reservation.findMany({
          where: { cartId: fixed.cartId, status: "CONFIRMADA", startDate: { in: starts } },
          select: { startDate: true },
        });
        const skip = new Set([...own, ...busy].map((reservation) => reservation.startDate.getTime()));
        const missing = weeks.filter((week) => !skip.has(week.startDate.getTime()));
        if (missing.length === 0) continue;

        await tx.reservation.createMany({
          data: missing.map((week) => ({
            cartId: fixed.cartId,
            userId: fixed.userId,
            startDate: week.startDate,
            endDate: week.endDate,
            purpose: fixed.purpose,
            recurringId: fixed.id,
          })),
        });
        created += missing.length;
      }
      return created;
    });
  } catch (error) {
    if (error instanceof HolidayRefused) return { success: false, error: error.message };
    console.error("[festius] no s'ha pogut esborrar:", error);
    return { success: false, error: "No s'ha pogut esborrar el festiu. Torna-ho a provar." };
  }

  revalidateCalendar();
  return { success: true, restored };
}
