"use server";

import { revalidatePath } from "next/cache";

import { db } from "@/lib/db";
import { academicGroupLabel } from "@/lib/academic-structure";
import { syncChromebookStatus } from "@/lib/chromebook-status";
import {
  notifyStudentDeviceDecision,
  notifyStudentDeviceRequested,
} from "@/lib/notifications";
import { isAdmin, requireAdmin, requireTutor, requireUser } from "@/lib/permissions";
import { checkRateLimit } from "@/lib/rate-limit";
import { studentDeviceRequestStatusLabels } from "@/lib/labels";
import {
  cancelStudentDeviceRequestSchema,
  createStudentDeviceRequestSchema,
  deleteStudentDeviceRequestSchema,
  markStudentDeviceDeliveredSchema,
  markStudentDeviceReturnedSchema,
  respondStudentDeviceRequestSchema,
} from "@/lib/validations/student-devices";

export type ActionResult = { success: true } | { success: false; error: string };

// Sentinelles per fer tornar enrere una transacció. Van per missatge i no per
// classe pròpia perquè no surten d'aquest fitxer.
const ALREADY_RESOLVED = "student-device/already-resolved";
const DEVICE_TAKEN = "student-device/device-taken";

/** La pantalla del préstec a l'alumnat i la fitxa d'historial de cada equip, que en penja. */
function revalidateStudentDevices() {
  revalidatePath("/alumnat", "layout");
}

/** Esborrat explícit de coordinació, també per retirar sol·licituds de prova. */
export async function deleteStudentDeviceRequest(input: unknown): Promise<ActionResult> {
  const admin = await requireAdmin();
  const parsed = deleteStudentDeviceRequestSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Dades no vàlides" };
  const { id, status } = parsed.data;

  try {
    await db.$transaction(async (tx) => {
      const request = await tx.studentDeviceRequest.findUnique({
        where: { id },
        select: { status: true, chromebookId: true },
      });
      if (!request || request.status !== status) throw new Error(ALREADY_RESOLVED);

      // La condició també cobreix una aprovació o entrega concurrent després de la lectura.
      await tx.studentDeviceRequest.delete({
        where: { id, status, chromebookId: request.chromebookId },
      });
      if (request.chromebookId) await syncChromebookStatus(tx, request.chromebookId);

      // El registre conserva qui ho ha fet, sense tornar-hi a desar dades de l'alumne.
      await tx.auditEvent.create({
        data: {
          actorId: admin.id,
          action: "student-request.delete",
          summary: `Sol·licitud de préstec a l'alumnat eliminada (estat: ${studentDeviceRequestStatusLabels[status]}).`,
        },
      });
    });
  } catch (error) {
    if (
      (error instanceof Error && error.message === ALREADY_RESOLVED) ||
      (typeof error === "object" && error !== null && "code" in error && error.code === "P2025")
    ) {
      return { success: false, error: "La sol·licitud ha canviat o ja s'ha eliminat. Actualitza la pàgina i revisa-la abans d'esborrar-la." };
    }
    throw error;
  }

  revalidateStudentDevices();
  revalidatePath("/espais");
  revalidatePath("/panell");
  revalidatePath("/");
  revalidatePath("/administracio");
  return { success: true };
}

export async function createStudentDeviceRequest(input: unknown): Promise<ActionResult> {
  const tutor = await requireTutor();
  const parsed = createStudentDeviceRequestSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Dades no vàlides" };
  }
  const { studentFirstName, studentLastName, groupId, reason, reasonNote } = parsed.data;

  const limited = await checkRateLimit("studentDeviceRequest", tutor.id);
  if (limited) return { success: false, error: limited };

  const group = groupId ? await db.academicGroup.findUnique({
    where: { id: groupId },
    include: { course: { include: { stage: true } } },
  }) : null;
  if (groupId && !group) {
    return { success: false, error: "El grup triat ja no existeix. Torna a obrir el formulari i tria'n un altre." };
  }

  // Un alumne, un equip: si ja en té una de viva, la següent no és una petició
  // nova sinó la mateixa dues vegades, i acabaria amb dos aparells a casa.
  const existing = await db.studentDeviceRequest.findFirst({
    where: {
      tutorId: tutor.id,
      studentFirstName: { equals: studentFirstName, mode: "insensitive" },
      studentLastName: { equals: studentLastName, mode: "insensitive" },
      status: { in: ["PENDENT", "APROVADA", "ENTREGADA"] },
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

  let created;
  try {
    created = await db.studentDeviceRequest.create({
      data: {
        tutorId: tutor.id,
        studentFirstName,
        studentLastName,
        groupId: group?.id ?? null,
        groupName: group ? academicGroupLabel(group) : null,
        reason,
        reasonNote: reasonNote || null,
      },
    });
  } catch (error) {
    // El grup es pot haver eliminat entre la consulta i l'alta.
    if (groupId && typeof error === "object" && error !== null && "code" in error && error.code === "P2003") {
      return { success: false, error: "No s'ha pogut desar la sol·licitud. Torna a obrir el formulari i comprova el grup." };
    }
    throw error;
  }

  await notifyStudentDeviceRequested(created.id);

  revalidateStudentDevices();
  return { success: true };
}

/**
 * Aprovar aparta l'equip per a l'alumne: queda ASSIGNAT i ja no es pot donar a
 * ningú més. Que se l'endugui és un pas a part, `markStudentDeviceDelivered`,
 * perquè entre una cosa i l'altra poden passar dies.
 */
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
    revalidateStudentDevices();
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
  revalidateStudentDevices();
  return { success: true };
}

/**
 * Retira una sol·licitud abans que l'equip surti del centre.
 *
 * Una de pendent la pot retirar el tutor que l'ha feta o la coordinació. Una
 * d'aprovada —l'equip apartat però encara sense entregar— només la coordinació,
 * per quan l'alumne no el ve a buscar o ja no li cal: l'equip torna a quedar
 * lliure. Un cop entregat ja no s'anul·la, se'n registra la devolució.
 */
export async function cancelStudentDeviceRequest(input: unknown): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = cancelStudentDeviceRequestSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Dades no vàlides" };
  const { id } = parsed.data;

  const request = await db.studentDeviceRequest.findUnique({ where: { id } });
  if (!request) return { success: false, error: "La sol·licitud no existeix" };
  const admin = isAdmin(user.role);
  if (request.tutorId !== user.id && !admin) {
    return { success: false, error: "Aquesta sol·licitud no és teva" };
  }

  if (request.status === "PENDENT") {
    const cancelled = await db.studentDeviceRequest.updateMany({
      where: { id, status: "PENDENT" },
      data: { status: "CANCELLADA" },
    });
    if (cancelled.count === 0) {
      return { success: false, error: "Aquesta sol·licitud ja s'ha resolt" };
    }
  } else if (request.status === "APROVADA") {
    if (!admin) {
      return {
        success: false,
        error: "Aquest equip ja està apartat: parla amb la coordinació TIC per anul·lar-ho",
      };
    }
    try {
      // Com l'aprovació: la sol·licitud i l'estat de l'equip, junts.
      await db.$transaction(async (tx) => {
        const cancelled = await tx.studentDeviceRequest.updateMany({
          where: { id, status: "APROVADA" },
          data: { status: "CANCELLADA" },
        });
        if (cancelled.count === 0) throw new Error(ALREADY_RESOLVED);
        if (request.chromebookId) {
          await syncChromebookStatus(tx, request.chromebookId);
        }
      });
    } catch (error) {
      if (error instanceof Error && error.message === ALREADY_RESOLVED) {
        return { success: false, error: "Algú altre acaba de canviar aquesta sol·licitud" };
      }
      throw error;
    }
  } else if (request.status === "ENTREGADA") {
    return {
      success: false,
      error: "Aquest equip ja s'ha entregat: el que cal és registrar-ne la devolució",
    };
  } else {
    return { success: false, error: "Aquesta sol·licitud ja està tancada" };
  }

  revalidateStudentDevices();
  return { success: true };
}

/**
 * L'alumne ha vingut a buscar l'equip. Aprovar-lo només l'apartava: és ara quan
 * surt del centre. Es desa el moment de registrar-ho i qui ho fa, i no es pot
 * corregir després, perquè és el registre de quan va passar. L'equip ja era
 * ASSIGNAT des de l'aprovació i no canvia.
 */
export async function markStudentDeviceDelivered(input: unknown): Promise<ActionResult> {
  const admin = await requireAdmin();
  const parsed = markStudentDeviceDeliveredSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Dades no vàlides" };
  const { id } = parsed.data;

  const request = await db.studentDeviceRequest.findUnique({ where: { id } });
  if (!request) return { success: false, error: "La sol·licitud no existeix" };
  if (request.status !== "APROVADA") {
    return {
      success: false,
      error:
        request.status === "ENTREGADA"
          ? "Aquest equip ja consta com a entregat"
          : "Aquesta sol·licitud no té cap equip per entregar",
    };
  }

  // La condició d'estat és la que evita dues entregues del mateix préstec si
  // dos coordinadors hi fan clic alhora: la segona no troba res a canviar.
  const delivered = await db.studentDeviceRequest.updateMany({
    where: { id, status: "APROVADA" },
    data: { status: "ENTREGADA", deliveredAt: new Date(), deliveredById: admin.id },
  });
  if (delivered.count === 0) {
    return { success: false, error: "Algú altre acaba de registrar aquesta entrega" };
  }

  revalidateStudentDevices();
  return { success: true };
}

/**
 * L'alumne ha tornat l'equip. Ho registra la coordinació, que és qui el rep a
 * la mà: el tutor pot avisar que ja el té, però qui sap que l'aparell ha
 * tornat de debò és qui el torna a tenir a l'armari. Com l'entrega, desa el
 * moment i qui ho fa, sense possibilitat de canviar-ho.
 *
 * Tanca les dues puntes alhora, com l'aprovació: la sol·licitud passa a
 * RETORNADA i l'equip torna a estar lliure. Si només es fes una de les dues,
 * quedaria un Chromebook a l'armari que l'aplicació dona per assignat.
 */
export async function markStudentDeviceReturned(input: unknown): Promise<ActionResult> {
  const admin = await requireAdmin();
  const parsed = markStudentDeviceReturnedSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Dades no vàlides" };
  const { id } = parsed.data;

  const request = await db.studentDeviceRequest.findUnique({ where: { id } });
  if (!request) return { success: false, error: "La sol·licitud no existeix" };
  if (request.status !== "ENTREGADA") {
    return {
      success: false,
      error:
        request.status === "APROVADA"
          ? "Aquest equip encara no s'ha entregat: si l'alumne/a no el vindrà a buscar, anul·la l'assignació"
          : "Aquest préstec no està actiu",
    };
  }

  try {
    await db.$transaction(async (tx) => {
      const returned = await tx.studentDeviceRequest.updateMany({
        where: { id, status: "ENTREGADA" },
        data: { status: "RETORNADA", returnedAt: new Date(), returnedById: admin.id },
      });
      if (returned.count === 0) throw new Error(ALREADY_RESOLVED);

      // L'estat es recalcula en comptes de posar DISPONIBLE: si l'equip torna
      // amb una incidència oberta, o l'han donat de baixa mentrestant, s'ha de
      // quedar com està.
      if (request.chromebookId) {
        await syncChromebookStatus(tx, request.chromebookId);
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message === ALREADY_RESOLVED) {
      return { success: false, error: "Algú altre acaba de registrar aquesta devolució" };
    }
    throw error;
  }

  revalidateStudentDevices();
  return { success: true };
}
