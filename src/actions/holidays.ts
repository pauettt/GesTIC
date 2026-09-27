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
  revalidatePath("/cites");
  revalidatePath("/");
}

/**
 * La coordinació entra un festiu. Les setmanes de reserves fixes i les hores
 * fixes de cites que hi queien les havia posat l'aplicació, no ningú:
 * s'esborren, i si el festiu s'esborra es tornen a posar (`deleteHoliday`). Les
 * reserves puntuals i les hores de cita obertes a mà les ha fet algú a propòsit
 * i es queden. Les hores fixes que ja tenen cita també: qui la té s'hi
 * presentaria igualment. El resultat diu quantes reserves puntuals i quantes
 * cites hi ha aquells dies.
 */
export async function createHoliday(
  input: unknown,
): Promise<
  { success: true; freed: number; oneOff: number; closedHours: number; appointments: number } | Failure
> {
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

  let result: { freed: number; oneOff: number; closedHours: number; appointments: number };
  try {
    result = await db.$transaction(async (tx) => {
      await tx.schoolHoliday.create({ data: { name, startDate, endDate } });
      const { count } = await tx.reservation.deleteMany({
        where: { recurringId: { not: null }, status: "CONFIRMADA", startDate: upcoming },
      });
      const kept = await tx.reservation.count({
        where: { recurringId: null, status: "CONFIRMADA", startDate: upcoming },
      });
      const closed = await tx.appointmentSlot.deleteMany({
        where: { availabilityId: { not: null }, appointment: { is: null }, startDate: upcoming },
      });
      const appointments = await tx.appointment.count({ where: { slot: { startDate: upcoming } } });
      return { freed: count, oneOff: kept, closedHours: closed.count, appointments };
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
 *
 * També torna a obrir les hores fixes de cites d'aquells dies, menys les que
 * mentrestant s'han obert a mà. Una setmana tancada a mà no deixa rastre: si es
 * va tancar abans d'entrar el festiu, també torna.
 */
export async function deleteHoliday(
  input: unknown,
): Promise<{ success: true; restored: number; reopened: number } | Failure> {
  await requireAdmin();
  const parsed = deleteHolidaySchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Dades no vàlides" };
  const { id } = parsed.data;
  const now = new Date();

  let result: { restored: number; reopened: number };
  try {
    result = await db.$transaction(async (tx) => {
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

      const fixedHours = await tx.appointmentAvailability.findMany({
        select: { id: true, weekday: true, periodId: true, schoolYear: true, coordinatorId: true },
      });
      const hours = fixedHours.flatMap((fixed) =>
        occurrences(fixed.weekday, fixed.periodId, fixed.schoolYear, now, remaining)
          .filter((week) => holiday.startDate <= week.dateKey && week.dateKey <= holiday.endDate)
          .map((week) => ({
            startDate: week.startDate,
            endDate: week.endDate,
            coordinatorId: fixed.coordinatorId,
            availabilityId: fixed.id,
          })),
      );
      // Les que s'han obert a mà mentrestant ja hi són: l'índex únic d'hora i coordinador les salta.
      const reopened =
        hours.length > 0 ? (await tx.appointmentSlot.createMany({ data: hours, skipDuplicates: true })).count : 0;

      return { restored: created, reopened };
    });
  } catch (error) {
    if (error instanceof HolidayRefused) return { success: false, error: error.message };
    console.error("[festius] no s'ha pogut esborrar:", error);
    return { success: false, error: "No s'ha pogut esborrar el festiu. Torna-ho a provar." };
  }

  revalidateCalendar();
  return { success: true, ...result };
}
