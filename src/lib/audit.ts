import "server-only";

import { db } from "@/lib/db";

/** Accions que es registren. Codis estables per filtrar; el que es llegeix és el resum. */
export type AuditAction =
  | "user.role"
  | "user.tutor"
  | "user.access"
  | "incident.delete"
  | "student-request.delete"
  // Buidar les sol·licituds tancades d'alumnat. Ja no es fa des del 2026-09-14,
  // quan es va decidir guardar-les, però les entrades antigues s'han de llegir.
  | "student-requests.purge"
  | "student-requests.anonymize"
  | "test-data.purge"
  // Cada vegada que algú mostra, copia o obre per editar una contrasenya: qui,
  // quina i per a què. Mai la contrasenya.
  | "credential.reveal"
  | "credential.change"
  | "credential.import";

export const auditActionLabels: Record<AuditAction, string> = {
  "user.role": "Permisos",
  "user.tutor": "Tutoria",
  "user.access": "Accés",
  "incident.delete": "Incidència esborrada",
  "student-request.delete": "Sol·licitud d'alumnat esborrada",
  "student-requests.purge": "Dades de l'alumnat",
  "student-requests.anonymize": "Anonimització d'alumnat",
  "test-data.purge": "Dades de prova",
  "credential.reveal": "Contrasenya consultada",
  "credential.change": "Contrasenyes",
  "credential.import": "Importació de contrasenyes",
};

/**
 * Deixa constància d'una acció de govern al registre d'activitat.
 *
 * **No llança mai**: l'acció que es registra ja s'ha fet i no s'ha de fer
 * fallar perquè no s'hagi pogut apuntar. L'error queda al log del servidor.
 * El resum no ha de portar mai dades de l'alumnat: el registre dura més que les
 * dades que descriu.
 */
export async function recordAudit(actorId: string | null, action: AuditAction, summary: string) {
  try {
    await db.auditEvent.create({ data: { actorId, action, summary } });
  } catch (error) {
    console.error(`[registre] no s'ha pogut apuntar «${action}»:`, error);
  }
}

/** Com es nomena una persona al registre: amb el correu, que és el que no canvia. */
export function auditName(user: { name: string | null; email: string }) {
  return user.name ? `${user.name} (${user.email})` : user.email;
}
