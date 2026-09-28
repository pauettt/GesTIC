import type { IncidentStatus, Prisma } from "@prisma/client";

import { OPEN_INCIDENT_STATUSES } from "@/lib/chromebook-status";

/** Dies sense cap canvi ni comentari a partir dels quals una incidència és aturada. */
export const STALLED_DAYS = 7;

const DAY_MS = 86_400_000;

/**
 * Les vistes de feina de la coordinació, compartides pel panell i per la llista
 * d'incidències: el «Veure-les totes» del panell ha de portar exactament a les
 * mateixes que compta.
 */
export type IncidentView = "sense-responsable" | "aturades";

export const incidentViewLabels: Record<IncidentView, string> = {
  "sense-responsable": "sense responsable",
  aturades: `aturades (${STALLED_DAYS} dies o més sense cap canvi ni comentari)`,
};

export function parseIncidentView(value: unknown): IncidentView | null {
  return value === "sense-responsable" || value === "aturades" ? value : null;
}

export function incidentViewWhere(view: IncidentView, now: Date = new Date()): Prisma.IncidentWhereInput {
  if (view === "sense-responsable") {
    return { assignedToId: null, status: { in: ["OBERTA", "EN_CURS"] } };
  }
  // Amb responsable: les que no en tenen ja surten a la seva cua. Canviar-ne
  // l'estat, la prioritat o el responsable compta com a moviment, i també un
  // comentari de qualsevol, que és on es veu la feina del dia a dia.
  const cutoff = new Date(now.getTime() - STALLED_DAYS * DAY_MS);
  return {
    assignedToId: { not: null },
    status: { in: ["OBERTA", "EN_CURS"] },
    updatedAt: { lt: cutoff },
    comments: { none: { createdAt: { gte: cutoff } } },
  };
}

/**
 * Les incidències que ensenya una fitxa petita, com la d'un dispositiu del
 * carro: totes les obertes, que són la feina d'ara, i les `closedLimit`
 * tancades més recents. Han d'arribar de la més nova a la més antiga; la resta
 * són a Incidències.
 */
export function recentIncidents<T extends { status: IncidentStatus }>(incidents: T[], closedLimit = 3): T[] {
  const isOpen = (incident: T) => OPEN_INCIDENT_STATUSES.includes(incident.status);
  return [...incidents.filter(isOpen), ...incidents.filter((incident) => !isOpen(incident)).slice(0, closedLimit)];
}

/** Dies sencers des de l'últim moviment: el canvi o el comentari més recent. */
export function daysSinceActivity(
  incident: { updatedAt: Date; comments: { createdAt: Date }[] },
  now: Date = new Date(),
) {
  const last = Math.max(incident.updatedAt.getTime(), ...incident.comments.map((c) => c.createdAt.getTime()));
  return Math.floor((now.getTime() - last) / DAY_MS);
}
