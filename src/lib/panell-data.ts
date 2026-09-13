import "server-only";

import { db } from "@/lib/db";
import { SCHOOL_TIME_ZONE, schoolYearOf, schoolYearRange } from "@/lib/date";

/** Mes i any ("set. 26"), en hora del centre i no del servidor. */
function monthKey(date: Date) {
  return date.toLocaleDateString("ca-ES", {
    month: "short",
    year: "2-digit",
    timeZone: SCHOOL_TIME_ZONE,
  });
}

/** Tot allò que espera una decisió o una estona de la coordinació. */
export async function getPendingWork(now: Date = new Date()) {
  const [
    unassignedIncidents,
    pendingLoans,
    overdueLoans,
    openQueries,
    pendingStudentRequests,
    upcomingAppointments,
  ] = await Promise.all([
    db.incident.findMany({
      where: { assignedToId: null, status: { in: ["OBERTA", "EN_CURS"] } },
      include: { reporter: true },
      orderBy: [{ priority: "desc" }, { createdAt: "asc" }],
      take: 8,
    }),
    db.loanRequest.findMany({
      where: { status: "PENDENT" },
      include: { requester: true, item: true },
      orderBy: { createdAt: "asc" },
      take: 8,
    }),
    db.loanRequest.findMany({
      where: { status: "APROVADA", endDate: { lt: now } },
      include: { requester: true, item: true },
      orderBy: { endDate: "asc" },
    }),
    db.query.findMany({
      where: { status: { in: ["OBERTA", "EN_CURS"] } },
      include: { author: true },
      orderBy: { createdAt: "asc" },
      take: 8,
    }),
    // Sense el nom de l'alumne: la cua diu que hi ha feina, i per decidir cal
    // entrar a /chromebooks igualment. El mateix criteri que el correu d'avís.
    db.studentDeviceRequest.findMany({
      where: { status: "PENDENT" },
      select: {
        id: true,
        groupName: true,
        createdAt: true,
        tutor: { select: { name: true, email: true } },
      },
      orderBy: { createdAt: "asc" },
      take: 8,
    }),
    db.appointment.findMany({
      where: { slot: { endDate: { gt: now } } },
      select: {
        id: true,
        purpose: true,
        user: { select: { name: true, email: true } },
        slot: { select: { startDate: true, openedBy: { select: { name: true, email: true } } } },
      },
      orderBy: { slot: { startDate: "asc" } },
      take: 8,
    }),
  ]);

  return {
    unassignedIncidents,
    pendingLoans,
    overdueLoans,
    openQueries,
    pendingStudentRequests,
    upcomingAppointments,
  };
}

export type CourseStats = Awaited<ReturnType<typeof getCourseStats>>;

/** Xifres del curs per justificar recursos i veure on es concentren els problemes. */
export async function getCourseStats(now: Date = new Date()) {
  // El mateix tall de curs que el filtre d'/incidencies, en hora del centre.
  const courseStart = schoolYearRange(schoolYearOf(now)).start;

  const [resolved, reported] = await Promise.all([
    db.incident.findMany({
      where: { resolvedAt: { not: null, gte: courseStart } },
      select: { createdAt: true, resolvedAt: true },
    }),
    db.incident.findMany({
      where: { createdAt: { gte: courseStart } },
      select: { createdAt: true, space: { select: { name: true } } },
      // Els mesos surten en l'ordre en què apareixen: sense ordenar, el gràfic
      // podia posar octubre abans que setembre.
      orderBy: { createdAt: "asc" },
    }),
  ]);

  const avgResolutionDays =
    resolved.length > 0
      ? resolved.reduce(
          (total, i) => total + (i.resolvedAt!.getTime() - i.createdAt.getTime()) / 86_400_000,
          0,
        ) / resolved.length
      : null;

  const byMonth = new Map<string, number>();
  const bySpace = new Map<string, number>();
  for (const incident of reported) {
    const month = monthKey(incident.createdAt);
    byMonth.set(month, (byMonth.get(month) ?? 0) + 1);
    const space = incident.space?.name ?? "Sense ubicació";
    bySpace.set(space, (bySpace.get(space) ?? 0) + 1);
  }

  return {
    reportedCount: reported.length,
    resolvedCount: resolved.length,
    avgResolutionDays,
    byMonth: [...byMonth.entries()],
    topSpaces: [...bySpace.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5),
  };
}

/** Sol·licituds de Chromebook d'alumnat que ja no són feina viva i porten noms de menors. */
export const CLOSED_STUDENT_REQUEST_STATUSES = ["RETORNADA", "REBUTJADA", "CANCELLADA"] as const;

/**
 * Recordatori de buidar les dades de l'alumnat. Es va decidir fer-ho en acabar
 * el curs, i com que és un botó i no una feina programada, si ningú no hi pensa
 * els noms s'hi queden. El panell ho recorda de juliol a setembre, que és quan
 * toca, si en queda alguna.
 */
export async function getStudentDataReminder(now: Date = new Date()) {
  const month = Number(
    new Intl.DateTimeFormat("en-US", { month: "numeric", timeZone: SCHOOL_TIME_ZONE }).format(now),
  );
  if (month < 7 || month > 9) return null;

  const closed = await db.studentDeviceRequest.count({
    where: { status: { in: [...CLOSED_STUDENT_REQUEST_STATUSES] } },
  });
  return closed > 0 ? { closed } : null;
}
