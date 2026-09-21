import "server-only";

import type { Prisma } from "@prisma/client";

import { db } from "@/lib/db";
import { incidentViewWhere } from "@/lib/incidents";
import { SCHOOL_TIME_ZONE, schoolYearOf, schoolYearRange } from "@/lib/date";

/** Mes i any ("set. 26"), en hora del centre i no del servidor. */
function monthKey(date: Date) {
  return date.toLocaleDateString("ca-ES", {
    month: "short",
    year: "2-digit",
    timeZone: SCHOOL_TIME_ZONE,
  });
}

/** Quants elements de cada cua es mostren al panell; la resta, a la seva pàgina. */
export const QUEUE_LIMIT = 8;

/** Els primers d'una cua i quants n'hi ha en total: el comptador ha de dir la veritat. */
async function queue<T>(items: Promise<T[]>, total: Promise<number>) {
  const [list, count] = await Promise.all([items, total]);
  return { items: list, total: count };
}

/** Tot allò que espera una decisió o una estona de la coordinació. */
export async function getPendingWork(now: Date = new Date()) {
  const unassignedWhere = incidentViewWhere("sense-responsable", now);
  const stalledWhere = incidentViewWhere("aturades", now);
  const pendingLoansWhere = { status: "PENDENT" } as const;
  const openQueriesWhere = { status: { in: ["OBERTA", "EN_CURS"] } } satisfies Prisma.QueryWhereInput;
  const pendingStudentWhere = { status: "PENDENT" } as const;
  const awaitingStudentWhere = { status: "APROVADA" } as const;
  const upcomingWhere = { slot: { endDate: { gt: now } } } satisfies Prisma.AppointmentWhereInput;

  const [
    unassignedIncidents,
    stalledIncidents,
    pendingLoans,
    overdueLoans,
    openQueries,
    pendingStudentRequests,
    awaitingStudentDeliveries,
    upcomingAppointments,
  ] = await Promise.all([
    queue(
      db.incident.findMany({
        where: unassignedWhere,
        include: { reporter: true },
        orderBy: [{ priority: "desc" }, { createdAt: "asc" }],
        take: QUEUE_LIMIT,
      }),
      db.incident.count({ where: unassignedWhere }),
    ),
    // Les que fa més temps que ningú no toca, primer.
    queue(
      db.incident.findMany({
        where: stalledWhere,
        select: {
          id: true,
          title: true,
          updatedAt: true,
          assignedTo: { select: { name: true, email: true } },
          comments: { select: { createdAt: true }, orderBy: { createdAt: "desc" }, take: 1 },
        },
        orderBy: { updatedAt: "asc" },
        take: QUEUE_LIMIT,
      }),
      db.incident.count({ where: stalledWhere }),
    ),
    queue(
      db.loanRequest.findMany({
        where: pendingLoansWhere,
        include: { requester: true, item: true },
        orderBy: { createdAt: "asc" },
        take: QUEUE_LIMIT,
      }),
      db.loanRequest.count({ where: pendingLoansWhere }),
    ),
    // Sense límit: cada devolució endarrerida és feina, no n'hi ha d'haver cap d'amagada.
    db.loanRequest.findMany({
      where: { status: "APROVADA", endDate: { lt: now } },
      include: { requester: true, item: true },
      orderBy: { endDate: "asc" },
    }),
    queue(
      db.query.findMany({
        where: openQueriesWhere,
        include: { author: true },
        orderBy: { createdAt: "asc" },
        take: QUEUE_LIMIT,
      }),
      db.query.count({ where: openQueriesWhere }),
    ),
    // Sense el nom de l'alumne: la cua diu que hi ha feina, i per decidir cal
    // entrar a /alumnat igualment. El mateix criteri que el correu d'avís.
    queue(
      db.studentDeviceRequest.findMany({
        where: pendingStudentWhere,
        select: {
          id: true,
          groupName: true,
          createdAt: true,
          tutor: { select: { name: true, email: true } },
        },
        orderBy: { createdAt: "asc" },
        take: QUEUE_LIMIT,
      }),
      db.studentDeviceRequest.count({ where: pendingStudentWhere }),
    ),
    // Equips aprovats que ningú no ha vingut a buscar: mentre no s'entreguen,
    // estan apartats i no els pot fer servir cap altre alumne.
    queue(
      db.studentDeviceRequest.findMany({
        where: awaitingStudentWhere,
        select: {
          id: true,
          groupName: true,
          respondedAt: true,
          chromebook: { select: { assetTag: true } },
        },
        orderBy: { respondedAt: "asc" },
        take: QUEUE_LIMIT,
      }),
      db.studentDeviceRequest.count({ where: awaitingStudentWhere }),
    ),
    queue(
      db.appointment.findMany({
        where: upcomingWhere,
        select: {
          id: true,
          purpose: true,
          user: { select: { name: true, email: true } },
          slot: { select: { startDate: true, openedBy: { select: { name: true, email: true } } } },
        },
        orderBy: { slot: { startDate: "asc" } },
        take: QUEUE_LIMIT,
      }),
      db.appointment.count({ where: upcomingWhere }),
    ),
  ]);

  return {
    unassignedIncidents,
    stalledIncidents,
    pendingLoans,
    overdueLoans,
    openQueries,
    pendingStudentRequests,
    awaitingStudentDeliveries,
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
