"use server";

import { revalidatePath } from "next/cache";

import { db } from "@/lib/db";
import { formatShortDate } from "@/lib/date";
import { getHolidays } from "@/lib/holidays-data";
import { requireSuperAdmin } from "@/lib/permissions";
import { occurrences, recurringCourse } from "@/lib/recurring-reservations";
import { getPeriodById } from "@/lib/schedule";
import {
  addAppointmentAvailabilitySchema,
  removeAppointmentAvailabilitySchema,
} from "@/lib/validations/appointments";

type Failure = { success: false; error: string };

/** Un motiu per no fer-ho que ha de veure qui ho prova, dins la transacció. */
class AvailabilityRefused extends Error {}

/** P2002: violació d'un índex únic de Prisma. */
function isUniqueViolation(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error && error.code === "P2002";
}

/**
 * Marca una hora fixa de l'agenda: el mateix dia i la mateixa sessió, oberta
 * cada setmana del curs fins al 30 de juny, menys els festius. Les setmanes que
 * ja estaven obertes a mà es queden com eren, i l'hora fixa se les salta: són
 * de qui les va obrir, i treure l'hora fixa més endavant no les tocarà.
 */
export async function addAppointmentAvailability(
  input: unknown,
): Promise<{ success: true; weeks: number } | Failure> {
  const user = await requireSuperAdmin();
  const parsed = addAppointmentAvailabilitySchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Dades no vàlides" };
  }
  const { weekday, periodId } = parsed.data;
  if (!getPeriodById(periodId)) {
    return { success: false, error: "Aquesta sessió no existeix a l'horari del centre" };
  }

  const { schoolYear } = recurringCourse();
  const weeks = occurrences(weekday, periodId, schoolYear, new Date(), await getHolidays());
  if (weeks.length === 0) {
    return { success: false, error: "Aquest curs ja no queda cap setmana amb aquesta sessió" };
  }

  try {
    await db.$transaction(async (tx) => {
      const { id } = await tx.appointmentAvailability.create({
        data: { weekday, periodId, schoolYear, createdById: user.id },
        select: { id: true },
      });
      // Una hora ja oberta a mà no es duplica: l'índex únic de l'hora la salta.
      await tx.appointmentSlot.createMany({
        data: weeks.map((week) => ({
          startDate: week.startDate,
          endDate: week.endDate,
          openedById: user.id,
          availabilityId: id,
        })),
        skipDuplicates: true,
      });
    });
  } catch (error) {
    if (isUniqueViolation(error)) return { success: false, error: "Aquesta hora ja és fixa aquest curs" };
    console.error("[hora fixa] no s'ha pogut desar:", error);
    return { success: false, error: "No s'ha pogut desar l'hora fixa. Torna-ho a provar." };
  }

  revalidatePath("/cites");
  return { success: true, weeks: weeks.length };
}

/**
 * Treu una hora fixa, per exemple quan l'horari canvia a mig curs. Les setmanes
 * que queden sense cita es tanquen. Les que ja en tenen es queden —qui la té
 * s'hi presentaria igualment— i el resultat diu quins dies són, perquè es
 * cancel·lin a part si cal. La que ja ha començat tampoc no es toca.
 */
export async function removeAppointmentAvailability(
  input: unknown,
): Promise<{ success: true; closed: number; kept: string[] } | Failure> {
  await requireSuperAdmin();
  const parsed = removeAppointmentAvailabilitySchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Dades no vàlides" };
  const { id } = parsed.data;
  const now = new Date();

  let result: { closed: number; kept: string[] };
  try {
    result = await db.$transaction(async (tx) => {
      const availability = await tx.appointmentAvailability.findUnique({ where: { id }, select: { id: true } });
      if (!availability) throw new AvailabilityRefused("Aquesta hora ja no és fixa");

      const upcoming = { availabilityId: id, startDate: { gt: now } };
      const { count } = await tx.appointmentSlot.deleteMany({ where: { ...upcoming, appointment: { is: null } } });
      const kept = await tx.appointmentSlot.findMany({
        where: { ...upcoming, appointment: { isNot: null } },
        select: { startDate: true },
        orderBy: { startDate: "asc" },
      });
      // Les setmanes que queden —les passades i les que tenen cita— es desenganxen
      // soles (SET NULL) i passen a ser com obertes a mà.
      await tx.appointmentAvailability.delete({ where: { id } });
      return { closed: count, kept: kept.map((slot) => formatShortDate(slot.startDate)) };
    });
  } catch (error) {
    if (error instanceof AvailabilityRefused) return { success: false, error: error.message };
    console.error("[hora fixa] no s'ha pogut treure:", error);
    return { success: false, error: "No s'ha pogut treure l'hora fixa. Torna-ho a provar." };
  }

  revalidatePath("/cites");
  return { success: true, ...result };
}
