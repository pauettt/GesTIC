import { db } from "@/lib/db";

/**
 * Límit d'accions per usuari i hora. Es compta damunt la mateixa base de
 * dades (no en memòria) perquè a Vercel cada instància tindria el seu propi
 * comptador i el límit no serviria de res.
 *
 * Els límits són generosos per a l'ús normal d'un centre: existeixen per aturar
 * un bucle accidental o algú fent el ximple, no per molestar el professorat.
 * Importa perquè cada incidència, préstec o consulta dispara correus a tota la
 * coordinació, i una allau podria fer marcar el compte de Workspace com a spam.
 * Les contrasenyes es compten al registre d'activitat: una sessió robada no les
 * ha de poder buidar totes d'una tirada.
 */
const WINDOW_MS = 60 * 60 * 1000;

const LIMITS = {
  incident: 10,
  loanRequest: 10,
  query: 10,
  studentDeviceRequest: 10,
  recurringReservation: 10,
  credentialReveal: 100,
} as const;

export type RateLimitedAction = keyof typeof LIMITS;

const MESSAGES: Record<RateLimitedAction, string> = {
  incident: "Has creat massa incidències en poca estona. Espera una mica o parla amb la coordinació TIC.",
  loanRequest: "Has fet massa sol·licituds de préstec seguides. Espera una mica abans de fer-ne una altra.",
  query: "Has obert massa consultes seguides. Espera una mica abans de fer-ne una altra.",
  studentDeviceRequest:
    "Has fet massa sol·licituds de Chromebook seguides. Espera una mica abans de fer-ne una altra.",
  recurringReservation:
    "Has demanat massa reserves fixes seguides. Espera una mica abans de demanar-ne una altra.",
  credentialReveal: "Has consultat moltes contrasenyes seguides. Espera una mica abans de continuar.",
};

/** Retorna un missatge d'error si s'ha superat el límit, o `null` si es pot continuar. */
export async function checkRateLimit(
  action: RateLimitedAction,
  userId: string,
): Promise<string | null> {
  const since = new Date(Date.now() - WINDOW_MS);
  const where = { createdAt: { gte: since } };

  const recent =
    action === "incident"
      ? await db.incident.count({ where: { ...where, reporterId: userId } })
      : action === "loanRequest"
        ? await db.loanRequest.count({ where: { ...where, requesterId: userId } })
        : action === "studentDeviceRequest"
          ? await db.studentDeviceRequest.count({ where: { ...where, tutorId: userId } })
          : action === "recurringReservation"
            ? await db.recurringReservation.count({ where: { ...where, userId } })
            : action === "credentialReveal"
              ? await db.auditEvent.count({ where: { ...where, actorId: userId, action: "credential.reveal" } })
              : await db.query.count({ where: { ...where, authorId: userId } });

  return recent >= LIMITS[action] ? MESSAGES[action] : null;
}
