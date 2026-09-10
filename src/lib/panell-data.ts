import "server-only";

import { db } from "@/lib/db";

/** Inici del curs actual: l'1 de setembre que ja ha passat. */
function currentCourseStart(now: Date) {
  return new Date(now.getFullYear() - (now.getMonth() < 8 ? 1 : 0), 8, 1);
}

function monthKey(date: Date) {
  return date.toLocaleDateString("ca-ES", { month: "short", year: "2-digit" });
}

/** Tot allò que espera una decisió de la coordinació. */
export async function getPendingWork(now: Date = new Date()) {
  const [unassignedIncidents, pendingLoans, overdueLoans, openQueries] = await Promise.all([
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
  ]);

  return { unassignedIncidents, pendingLoans, overdueLoans, openQueries };
}

export type CourseStats = Awaited<ReturnType<typeof getCourseStats>>;

/** Xifres del curs per justificar recursos i veure on es concentren els problemes. */
export async function getCourseStats(now: Date = new Date()) {
  const courseStart = currentCourseStart(now);

  const [resolved, reported] = await Promise.all([
    db.incident.findMany({
      where: { resolvedAt: { not: null, gte: courseStart } },
      select: { createdAt: true, resolvedAt: true },
    }),
    db.incident.findMany({
      where: { createdAt: { gte: courseStart } },
      select: { createdAt: true, space: { select: { name: true } } },
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
