"use server";

import { revalidatePath } from "next/cache";
import { del } from "@vercel/blob";

import { getTestDataSummary } from "@/lib/admin-data";
import { recordAudit } from "@/lib/audit";
import { syncChromebookStatus } from "@/lib/chromebook-status";
import { db } from "@/lib/db";
import { buildTestEmail, sendEmail } from "@/lib/email";
import { requireSuperAdmin } from "@/lib/permissions";
import { formatCounts, isTestAccountEmail } from "@/lib/test-data";
import { getBaseUrl } from "@/lib/url";
import { anonymizeStudentDeviceRequestsSchema } from "@/lib/validations/student-devices";

export type ActionResult = { success: true } | { success: false; error: string };

/**
 * Correu de prova a qui el demana. Comprova que el servidor pot enviar els
 * avisos sense haver de crear una incidència de mentida.
 */
export async function sendTestEmail(): Promise<ActionResult> {
  const user = await requireSuperAdmin();
  if (!user.email || isTestAccountEmail(user.email)) {
    return { success: false, error: "Entra amb el teu compte del centre per rebre el correu de prova" };
  }

  const baseUrl = await getBaseUrl();
  const result = await sendEmail({
    to: user.email,
    ...buildTestEmail({ name: user.name ?? user.email, url: baseUrl }),
  });
  if (!result.sent) return { success: false, error: `No s'ha pogut enviar: ${result.reason}` };
  return { success: true };
}

/**
 * Esborra els comptes de prova (`@local.test`, els del dev login) i tot el que
 * en penja: incidències amb les seves fotos, préstecs, reserves, claus, cites,
 * consultes… Va néixer quan desenvolupament i producció compartien base de
 * dades i s'hi anaven quedant. Des que local té la seva, a producció no n'hi
 * hauria d'haver cap: es manté per si mai se n'hi cola algun.
 *
 * Només toca comptes amb aquesta adreça, que cap persona real del centre no pot
 * tenir. El que no penja de cap compte —conserges, claus, equips o aules
 * d'exemple— s'esborra des de la seva pantalla.
 */
export async function purgeTestData(): Promise<ActionResult> {
  const superAdmin = await requireSuperAdmin();
  // Amb un compte de prova t'esborraries a tu mateix a mitja operació.
  if (!superAdmin.email || isTestAccountEmail(superAdmin.email)) {
    return { success: false, error: "Fes-ho amb el teu compte del centre, no amb un compte de prova" };
  }

  const summary = await getTestDataSummary();
  if (summary.accounts.length === 0) return { success: true };
  const userIds = summary.accounts.map((account) => account.id);

  // Les fotos del blob store no marxen soles. Si no es poden esborrar, no
  // s'esborra res: així es pot tornar a provar sense deixar fitxers orfes.
  const attachments = await db.incidentAttachment.findMany({
    where: { incident: { reporterId: { in: userIds } } },
    select: { url: true },
  });
  if (attachments.length > 0) {
    try {
      await del(attachments.map((attachment) => attachment.url));
    } catch (error) {
      console.error("[administració] no s'han pogut esborrar les fotos de prova:", error);
      return {
        success: false,
        error: "No s'han pogut esborrar les fotos de les incidències de prova. No s'ha esborrat res.",
      };
    }
  }

  // Abans d'esborrar: quins equips poden canviar d'estat (tenen incidències o
  // préstecs d'aquests comptes) i quines hores de cita van obrir que ningú de
  // debò no ha agafat. Un cop esborrats els usuaris ja no es podria saber.
  const [incidentDevices, assignedDevices, openedSlots] = await Promise.all([
    db.incident.findMany({
      where: { reporterId: { in: userIds }, chromebookId: { not: null } },
      select: { chromebookId: true },
    }),
    db.studentDeviceRequest.findMany({
      where: { tutorId: { in: userIds }, chromebookId: { not: null } },
      select: { chromebookId: true },
    }),
    db.appointmentSlot.findMany({
      where: { openedById: { in: userIds } },
      select: { id: true, appointment: { select: { userId: true } } },
    }),
  ]);
  const emptySlotIds = openedSlots
    .filter((slot) => !slot.appointment || userIds.includes(slot.appointment.userId))
    .map((slot) => slot.id);

  // La resta cau en cascada amb l'usuari (vegeu les relacions a schema.prisma).
  await db.$transaction([
    db.appointmentSlot.deleteMany({ where: { id: { in: emptySlotIds } } }),
    db.user.deleteMany({ where: { id: { in: userIds } } }),
  ]);

  const chromebookIds = new Set(
    [...incidentDevices, ...assignedDevices]
      .map((row) => row.chromebookId)
      .filter((id): id is string => id !== null),
  );
  for (const chromebookId of chromebookIds) {
    await syncChromebookStatus(db, chromebookId);
  }

  const details = formatCounts(summary.items);
  await recordAudit(
    superAdmin.id,
    "test-data.purge",
    `Esborrats ${summary.accounts.length} comptes de prova${details ? ` amb ${details}` : ""}`,
  );
  revalidatePath("/administracio");
  revalidatePath("/usuaris");
  return { success: true };
}

/**
 * Anonimitza les sol·licituds de dispositius d'alumnat antigues i tancades
 * (RETORNADA, REBUTJADA o CANCELLADA) creades abans d'una data límit (RGPD / dret a la supressió).
 * Conserva el registre de l'equip i de la data per a l'historial del maquinari,
 * però elimina les dades personals del menor (nom, cognoms i observacions).
 */
export async function anonymizeStudentDeviceRequests(input: unknown): Promise<ActionResult> {
  const superAdmin = await requireSuperAdmin();
  const parsed = anonymizeStudentDeviceRequestsSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Dades no vàlides" };
  }
  const date = new Date(parsed.data.beforeDate);
  if (Number.isNaN(date.getTime())) {
    return { success: false, error: "La data no és vàlida" };
  }

  const updated = await db.studentDeviceRequest.updateMany({
    where: {
      createdAt: { lt: date },
      status: { in: ["RETORNADA", "REBUTJADA", "CANCELLADA"] },
    },
    data: {
      studentFirstName: "Alumne",
      studentLastName: "Anonimitzat",
      reasonNote: null,
      responseNote: null,
    },
  });

  await recordAudit(
    superAdmin.id,
    "student-requests.anonymize",
    `Anonimitzades ${updated.count} sol·licituds d'alumnat anteriors a ${parsed.data.beforeDate}`,
  );

  revalidatePath("/alumnat");
  revalidatePath("/administracio");
  return { success: true };
}
