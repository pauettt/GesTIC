import { db } from "@/lib/db";

/** Les que s'ensenyen: prou per veure què no ha arribat i des de quan. */
const SHOWN = 5;

/**
 * Deixa constància d'un correu que no ha sortit. Com `sendEmail`, **no llança
 * mai**: si ni tan sols es pot apuntar, queda al log i l'acció continua.
 */
export async function recordEmailFailure(failure: { subject: string; recipients: number; reason: string }) {
  try {
    await db.emailFailure.create({
      data: {
        subject: failure.subject.slice(0, 300),
        recipients: failure.recipients,
        reason: failure.reason.slice(0, 1000),
      },
    });
  } catch (error) {
    console.error("[email] no s'ha pogut apuntar la fallada:", error);
  }
}

/** Les fallades pendents de revisar: quantes, des de quan i les últimes. */
export async function getEmailFailures() {
  const [total, latest, oldest] = await Promise.all([
    db.emailFailure.count(),
    db.emailFailure.findMany({ orderBy: { createdAt: "desc" }, take: SHOWN }),
    db.emailFailure.findFirst({ orderBy: { createdAt: "asc" }, select: { createdAt: true } }),
  ]);
  return { total, latest, since: oldest?.createdAt ?? null };
}

export type EmailFailures = Awaited<ReturnType<typeof getEmailFailures>>;
