"use server";

import { revalidatePath } from "next/cache";

import { db } from "@/lib/db";
import { zonedDateTime } from "@/lib/date";
import { notifyAppointmentBooked, notifyAppointmentCancelled } from "@/lib/notifications";
import { runAfterResponse } from "@/lib/background";
import { getPeriodById, isPastPeriod, isSchoolDay } from "@/lib/schedule";
import { isAdmin, requireSuperAdmin, requireUser } from "@/lib/permissions";
import {
  bookAppointmentSchema,
  cancelAppointmentSchema,
  closeAppointmentSlotSchema,
  openAppointmentSlotSchema,
} from "@/lib/validations/appointments";

export type ActionResult = { success: true } | { success: false; error: string };

/** Un motiu per no donar la cita que ha de veure qui la demana, dins la transacció. */
class AppointmentRefused extends Error {}

/** P2002: violació d'un índex únic de Prisma. */
function isUniqueViolation(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error && error.code === "P2002";
}

/**
 * Obre una sola hora de l'horari del centre perquè s'hi pugui demanar cita:
 * una setmana concreta, fora de les hores fixes. Només ho fa el
 * superadministrador —el compte de coordinació TIC—, perquè l'agenda és una i
 * és la seva: la resta de la coordinació no hi obre hores.
 */
export async function openAppointmentSlot(input: unknown): Promise<ActionResult> {
  const user = await requireSuperAdmin();
  const parsed = openAppointmentSlotSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Dades no vàlides" };
  }
  if (!isSchoolDay(parsed.data.date)) {
    return { success: false, error: "Només es poden obrir hores de dilluns a divendres" };
  }

  const period = getPeriodById(parsed.data.periodId);
  if (!period) return { success: false, error: "Aquesta sessió no existeix a l'horari del centre" };

  const startDate = zonedDateTime(parsed.data.date, period.start);
  const endDate = zonedDateTime(parsed.data.date, period.end);
  if (isPastPeriod(endDate)) {
    return { success: false, error: "No es poden obrir hores que ja han passat" };
  }

  try {
    await db.appointmentSlot.create({ data: { startDate, endDate, openedById: user.id } });
  } catch (error) {
    // Si l'hora ja és oberta —una altra pestanya, o l'hora fixa que s'acaba de
    // marcar—, el resultat ja és el que es volia i fer-ho saltar com un error
    // només confondria qui està marcant la graella.
    if (isUniqueViolation(error)) return { success: true };
    return { success: false, error: "No s'ha pogut obrir l'hora" };
  }

  revalidatePath("/cites");
  return { success: true };
}

/**
 * Tanca una hora oberta. D'una hora fixa, tanca només aquella setmana: és com es
 * diu que un dia concret no s'hi serà.
 */
export async function closeAppointmentSlot(input: unknown): Promise<ActionResult> {
  await requireSuperAdmin();
  const parsed = closeAppointmentSlotSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Dades no vàlides" };

  const slot = await db.appointmentSlot.findUnique({
    where: { id: parsed.data.id },
    include: { appointment: { include: { user: true } } },
  });
  if (!slot) return { success: false, error: "Aquesta hora ja no està oberta" };

  // Tancar-la esborraria la cita en cascada i qui la tenia no se n'assabentaria:
  // es presentaria el dia previst i la seva cita hauria desaparegut.
  if (slot.appointment) {
    const who = slot.appointment.user.name ?? slot.appointment.user.email;
    return {
      success: false,
      error: `Aquesta hora té la cita de ${who}. Cancel·la-la abans de tancar-la.`,
    };
  }

  await db.appointmentSlot.delete({ where: { id: slot.id } });
  revalidatePath("/cites");
  return { success: true };
}

/**
 * Demana una hora oberta. Hi entra tothom del claustre: l'agenda serveix per a
 * qualsevol cosa que s'hagi de fer amb la coordinació, i no hi ha límit de
 * cites per persona mentre quedin hores obertes.
 */
export async function bookAppointment(input: unknown): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = bookAppointmentSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Dades no vàlides" };
  }
  const { slotId, purpose } = parsed.data;

  let appointmentId: string;
  try {
    appointmentId = await db.$transaction(async (tx) => {
      const slot = await tx.appointmentSlot.findUnique({
        where: { id: slotId },
        include: { appointment: true },
      });
      if (!slot) throw new AppointmentRefused("Aquesta hora ja no està oberta");
      if (isPastPeriod(slot.endDate)) throw new AppointmentRefused("Aquesta hora ja ha passat");
      if (slot.appointment) throw new AppointmentRefused("Algú acaba d'agafar aquesta hora. Torna a provar-ho.");

      const created = await tx.appointment.create({ data: { slotId, userId: user.id, purpose } });
      return created.id;
    });
  } catch (error) {
    // L'índex únic sobre slotId és el que aguanta de debò els dos clics
    // simultanis: la comprovació d'aquí sobre llegeix i després escriu.
    if (isUniqueViolation(error)) {
      return { success: false, error: "Algú acaba d'agafar aquesta hora. Torna a provar-ho." };
    }
    if (error instanceof AppointmentRefused) return { success: false, error: error.message };
    console.error("[cita] no s'ha pogut desar:", error);
    return { success: false, error: "No s'ha pogut demanar la cita. Torna-ho a provar." };
  }

  runAfterResponse(() => notifyAppointmentBooked(appointmentId));

  revalidatePath("/cites");
  return { success: true };
}

export async function cancelAppointment(input: unknown): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = cancelAppointmentSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Dades no vàlides" };

  const appointment = await db.appointment.findUnique({
    where: { id: parsed.data.id },
    include: {
      user: { select: { id: true, name: true, email: true } },
      slot: {
        select: {
          startDate: true,
          endDate: true,
          openedBy: { select: { id: true, email: true } },
        },
      },
    },
  });
  if (!appointment) return { success: false, error: "Aquesta cita no existeix" };
  if (!isAdmin(user.role) && appointment.userId !== user.id) {
    return { success: false, error: "No pots cancel·lar aquesta cita" };
  }
  if (isPastPeriod(appointment.slot.endDate)) {
    return { success: false, error: "Aquesta cita ja ha passat" };
  }

  await db.appointment.delete({ where: { id: appointment.id } });

  // Les dades van ja llegides: la cita acaba d'esborrar-se.
  runAfterResponse(() =>
    notifyAppointmentCancelled({
      cancelledById: user.id,
      cancelledByName: user.name ?? "La coordinació TIC",
      owner: appointment.user,
      opener: appointment.slot.openedBy,
      startDate: appointment.slot.startDate,
      purpose: appointment.purpose,
    }),
  );

  revalidatePath("/cites");
  return { success: true };
}
