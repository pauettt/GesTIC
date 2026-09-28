import type { IncidentPriority, IncidentStatus } from "@prisma/client";
import type { Route } from "next";
import Link from "next/link";

import { formatDate } from "@/lib/date";
import {
  incidentPriorityLabels,
  incidentPriorityVariants,
  incidentStatusLabels,
  incidentStatusVariants,
} from "@/lib/labels";
import {
  IncidentPrioritySelect,
  IncidentStatusSelect,
} from "@/components/incidents/incident-badge-selects";
import { Badge } from "@/components/ui/badge";

export type MobileIncidentItem = {
  id: string;
  title: string;
  targetLabel: string;
  status: IncidentStatus;
  priority: IncidentPriority;
  createdAt: Date;
  reporterLabel: string;
  assigneeLabel: string | null;
  notifies: boolean;
  href: Route;
};

export function IncidentMobileList({
  items,
  admin,
}: {
  items: MobileIncidentItem[];
  admin: boolean;
}) {
  return (
    <ul className="space-y-3 md:hidden" aria-label="Incidències">
      {items.map((incident) => (
        <li key={incident.id} className="min-w-0 rounded-lg border bg-background p-4">
          <Link
            href={incident.href}
            className="flex min-h-11 items-center rounded-sm font-medium leading-snug text-foreground underline-offset-4 hover:text-primary hover:underline focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <span className="min-w-0 [overflow-wrap:anywhere]">{incident.title}</span>
          </Link>
          <div className="mt-1 space-y-1 text-sm text-muted-foreground">
            <p className="[overflow-wrap:anywhere]">
              <span className="sr-only">Equip: </span>
              {incident.targetLabel}
            </p>
            <p>
              <span className="sr-only">Data de creació: </span>
              <time dateTime={incident.createdAt.toISOString()}>
                {formatDate(incident.createdAt)}
              </time>
            </p>
          </div>

          {admin && (
            <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
              <div className="min-w-0">
                <dt className="text-xs text-muted-foreground">Professor/a</dt>
                <dd className="mt-1 [overflow-wrap:anywhere]">{incident.reporterLabel}</dd>
              </div>
              <div className="min-w-0">
                <dt className="text-xs text-muted-foreground">Assignada a</dt>
                <dd className="mt-1 [overflow-wrap:anywhere]">
                  {incident.assigneeLabel ?? "Sense assignar"}
                </dd>
              </div>
            </dl>
          )}

          <dl className="mt-3 flex flex-wrap gap-x-6 gap-y-3 border-t pt-3 [&_[data-slot=select-trigger]]:min-h-11 [&_[data-slot=select-trigger]]:rounded-lg [&_[data-slot=select-trigger]]:px-3">
            <div>
              <dt className="mb-1 text-xs text-muted-foreground">Estat</dt>
              <dd>
                {admin ? (
                  <IncidentStatusSelect
                    incidentId={incident.id}
                    status={incident.status}
                    reporterName={incident.reporterLabel}
                    notifies={incident.notifies}
                  />
                ) : (
                  <Badge variant={incidentStatusVariants[incident.status]}>
                    {incidentStatusLabels[incident.status]}
                  </Badge>
                )}
              </dd>
            </div>
            <div>
              <dt className="mb-1 text-xs text-muted-foreground">Prioritat</dt>
              <dd>
                {admin ? (
                  <IncidentPrioritySelect incidentId={incident.id} priority={incident.priority} />
                ) : (
                  <Badge variant={incidentPriorityVariants[incident.priority]}>
                    {incidentPriorityLabels[incident.priority]}
                  </Badge>
                )}
              </dd>
            </div>
          </dl>
        </li>
      ))}
    </ul>
  );
}
