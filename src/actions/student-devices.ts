"use server";

import { revalidatePath } from "next/cache";

import { db } from "@/lib/db";
import {
  notifyStudentDeviceDecision,
  notifyStudentDeviceRequested,
} from "@/lib/notifications";
import { isAdmin, requireAdmin, requireTutor, requireUser } from "@/lib/permissions";
import { checkRateLimit } from "@/lib/rate-limit";
import {
  cancelStudentDeviceRequestSchema,
  createStudentDeviceRequestSchema,
  markStudentDeviceReturnedSchema,
  respondStudentDeviceRequestSchema,
} from "@/lib/validations/student-devices";

export type ActionResult = { success: true } | { success: false; error: string };

// Sentinelles per fer tornar enrere la transacció d'aprovar. Van per missatge i
// no per classe pròpia perquè no surten d'aquest fitxer.
const ALREADY_RESOLVED = "student-device/already-resolved";
const DEVICE_TAKEN = "student-device/device-taken";

export async function createStudentDeviceRequest(input: unknown): Promise<ActionResult> {
  const tutor = await requireTutor();
  const parsed = createStudentDeviceRequestSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Dades no vàlides" };
  }
  const { studentFirstName, studentLastName, groupName, reason, reasonNote } = parsed.data;

  const limited = await checkRateLimit("studentDeviceRequest", tutor.id);
  if (limited) return { success: false, error: limited };

  // Un alumne, un equip: si ja en té una de viva, la següent no és una petició
  // nova sinó la mateixa dues vegades, i acabaria amb dos aparells a casa.
  const existing = await db.studentDeviceRequest.findFirst({
    where: {
      tutorId: tutor.id,
      studentFirstName: { equals: studentFirstName, mode: "insensitive" },
      studentLastName: { equals: studentLastName, mode: "insensitive" },
      status: { in: ["PENDENT", "APROVADA"] },
    },
  });
  if (existing) {
    return {
      success: false,
      error:
        existing.status === "PENDENT"
          ? "Ja has demanat un Chromebook per a aquest alumne/a i encara està pendent"
          : "Aquest alumne/a ja té un Chromebook assignat",
    };
  }

  const created = await db.studentDeviceRequest.create({
    data: {
      tutorId: tutor.id,
      studentFirstName,
      studentLastName,
      groupName: groupName || null,
      reason,
      reasonNote: reasonNote || null,
    },
  });

  await notifyStudentDeviceRequested(created.id);

  revalidatePath("/chromebooks");
  return { success: true };
}

export async function respondStudentDeviceRequest(input: unknown): Promise<ActionResult> {
  const admin = await requireAdmin();
  const parsed = respondStudentDeviceRequestSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Dades no vàlides" };
  }
  const data = parsed.data;

  const request = await db.studentDeviceRequest.findUnique({ where: { id: data.id } });
  if (!request) return { success: false, error: "La sol·licitud no existeix" };
  if (request.status !== "PENDENT") {
    return { success: false, error: "Aquesta sol·licitud ja s'ha resolt" };
  }

  const decision = {
    responseNote: data.responseNote || null,
    respondedById: admin.id,
    respondedAt: new Date(),
  };

  if (data.status === "REBUTJADA") {
    await db.studentDeviceRequest.update({
      where: { id: data.id },
      data: { status: "REBUTJADA", ...decision },
    });
    await notifyStudentDeviceDecision(data.id, false);
    revalidatePath("/chromebooks");
    return { success: true };
  }

  // Comprovacions abans d'entrar a la transacció, només per poder dir què passa
  // amb paraules; qui mana de debò són les condicions dels `updateMany`.
  const chromebook = await db.chromebook.findUnique({ where: { id: data.chromebookId } });
  if (!chromebook || !chromebook.isStudentLoanable) {
    return { success: false, error: "Aquest equip no és del pool de préstec a l'alumnat" };
  }
  if (chromebook.status !== "DISPONIBLE") {
    return { success: false, error: "Aquest equip no està lliure" };
  }

  try {
    // Les dues escriptures van o no van juntes. Si l'equip quedés marcat com a
    // assignat i la sol·licitud no ho digués (o al revés), ningú no sabria on
    // és l'aparell. I les condicions del `where` són el que evita que, amb tres
    // coordinadors decidint alhora, dos alumnes rebin el mateix Chromebook.
    await db.$transaction(async (tx) => {
      const responded = await tx.studentDeviceRequest.updateMany({
        where: { id: data.id, status: "PENDENT" },
        data: { status: "APROVADA", chromebookId: data.chromebookId, ...decision },
      });
      if (responded.count === 0) throw new Error(ALREADY_RESOLVED);

      const claimed = await tx.chromebook.updateMany({
        where: { id: data.chromebookId, isStudentLoanable: true, status: "DISPONIBLE" },
        data: { status: "ASSIGNAT" },
      });
      if (claimed.count === 0) throw new Error(DEVICE_TAKEN);
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message === ALREADY_RESOLVED) {
      return { success: false, error: "Aquesta sol·licitud ja s'ha resolt" };
    }
    if (message === DEVICE_TAKEN) {
      return { success: false, error: "Algú altre acaba d'assignar aquest equip" };
    }
    throw error;
  }

  await notifyStudentDeviceDecision(data.id, true);
  revalidatePath("/chromebooks");
  return { success: true };
}

export async function cancelStudentDeviceRequest(input: unknown): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = cancelStudentDeviceRequestSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Dades no vàlides" };

  const request = await db.studentDeviceRequest.findUnique({ where: { id: parsed.data.id } });
  if (!request) return { success: false, error: "La sol·licitud no existeix" };
  // El tutor retira la seva; la coordinació també pot, per poder netejar-ne una
  // que s'ha quedat penjada quan ja no cal.
  if (request.tutorId !== user.id && !isAdmin(user.role)) {
    return { success: false, error: "Aquesta sol·licitud no és teva" };
  }
  if (request.status !== "PENDENT") {
    return { success: false, error: "Aquesta sol·licitud ja s'ha resolt" };
  }

  await db.studentDeviceRequest.update({
    where: { id: parsed.data.id },
    data: { status: "CANCELLADA" },
  });

  revalidatePath("/chromebooks");
  return { success: true };
}

/**
 * L'alumne ha tornat l'equip. Ho registra la coordinació, que és qui el rep a
 * la mà: el tutor pot avisar que ja el té, però qui sap que l'aparell ha
 * tornat de debò és qui el torna a tenir a l'armari.
 *
 * Tanca les dues puntes alhora, com l'aprovació: la sol·licitud passa a
 * RETORNADA i l'equip torna a estar lliure. Si només es fes una de les dues,
 * quedaria un Chromebook a l'armari que l'aplicació dona per assignat.
 */
export async function markStudentDeviceReturned(input: unknown): Promise<ActionResult> {
  await requireAdmin();
  const parsed = markStudentDeviceReturnedSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Dades no vàlides" };
  const { id } = parsed.data;

  const request = await db.studentDeviceRequest.findUnique({ where: { id } });
  if (!request) return { success: false, error: "La sol·licitud no existeix" };
  if (request.status !== "APROVADA") {
    return { success: false, error: "Aquest préstec no està actiu" };
  }

  try {
    await db.$transaction(async (tx) => {
      const returned = await tx.studentDeviceRequest.updateMany({
        where: { id, status: "APROVADA" },
        data: { status: "RETORNADA", returnedAt: new Date() },
      });
      if (returned.count === 0) throw new Error(ALREADY_RESOLVED);

      // L'equip només es torna a obrir si encara consta assignat: si mentrestant
      // ha anat a parar a una incidència o a baixa, això no ho ha de desfer.
      if (request.chromebookId) {
        await tx.chromebook.updateMany({
          where: { id: request.chromebookId, status: "ASSIGNAT" },
          data: { status: "DISPONIBLE" },
        });
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message === ALREADY_RESOLVED) {
      return { success: false, error: "Algú altre acaba de registrar aquesta devolució" };
    }
    throw error;
  }

  revalidatePath("/chromebooks");
  return { success: true };
}

/**
 * Buida les sol·licituds tancades: retornades, rebutjades i retirades. Les
 * pendents i les actives no es toquen mai, que són feina viva.
 *
 * Existeix perquè les dades que hi ha aquí són noms de menors i no s'han de
 * quedar per sempre. La decisió del centre (2026-09-12) és fer-ho al juliol,
 * quan tornen els equips, o al setembre següent, i que ho pugui fer tant
 * l'administrador com la coordinació TIC. Si no fos un botó, buidar-ho voldria
 * dir entrar a la base de dades, i llavors no ho faria ningú.
 *
 * Els equips i el seu historial no en depenen: el Chromebook segueix al pool
 * amb les seves notes i incidències. El que marxa és qui el va tenir.
 */
export async function purgeClosedStudentDeviceRequests(): Promise<ActionResult> {
  await requireAdmin();

  await db.studentDeviceRequest.deleteMany({
    where: { status: { in: ["RETORNADA", "REBUTJADA", "CANCELLADA"] } },
  });

  revalidatePath("/chromebooks");
  return { success: true };
}
