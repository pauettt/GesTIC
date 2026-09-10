import Link from "next/link";
import { HistoryIcon } from "lucide-react";

import { formatDate } from "@/lib/date";
import {
  incidentPriorityLabels,
  incidentPriorityVariants,
  incidentStatusLabels,
  incidentStatusVariants,
  loanRequestStatusLabels,
  loanRequestStatusVariants,
} from "@/lib/labels";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Incident, LoanRequest, User } from "@prisma/client";

const returnedLate = (endDate: Date, returnedAt: Date | null) =>
  Boolean(returnedAt && returnedAt > endDate);

/** Tots els préstecs de l'equip al llarg de la seva vida (només coordinació). */
export function ItemLoanHistory({ loans }: { loans: (LoanRequest & { requester: User })[] }) {
  return (
    <div>
      <h2 className="mb-3 text-lg font-semibold">Historial de préstecs</h2>
      <div className="overflow-x-auto rounded-lg border bg-background">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Professor/a</TableHead>
              <TableHead>Període sol·licitat</TableHead>
              <TableHead>Retornat</TableHead>
              <TableHead>Motiu</TableHead>
              <TableHead>Estat</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loans.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                  Aquest equip no s&apos;ha prestat mai.
                </TableCell>
              </TableRow>
            )}
            {loans.map((loan) => {
              const late = returnedLate(loan.endDate, loan.returnedAt);
              return (
                <TableRow key={loan.id}>
                  <TableCell className="font-medium">
                    {loan.requester.name ?? loan.requester.email}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(loan.startDate)} – {formatDate(loan.endDate)}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {loan.returnedAt ? (
                      <span className={late ? "text-destructive" : undefined}>
                        {formatDate(loan.returnedAt)}
                        {late ? " (fora de termini)" : ""}
                      </span>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{loan.purpose ?? "—"}</TableCell>
                  <TableCell>
                    <Badge variant={loanRequestStatusVariants[loan.status]}>
                      {loanRequestStatusLabels[loan.status]}
                    </Badge>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

export function ItemIncidentHistory({
  itemId,
  incidents,
  showReporter,
}: {
  itemId: string;
  incidents: (Incident & { reporter: User })[];
  /** El professorat només veu les seves, i sense la columna de qui la va reportar. */
  showReporter: boolean;
}) {
  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">
          {showReporter ? "Historial d'incidències" : "Les meves incidències d'aquest equip"}
        </h2>
        <Link
          href={`/incidencies?inventoryItemId=${itemId}`}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:underline"
        >
          <HistoryIcon className="size-3.5" />
          Obre a Incidències
        </Link>
      </div>
      <div className="overflow-x-auto rounded-lg border bg-background">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Títol</TableHead>
              {showReporter && <TableHead>Reportada per</TableHead>}
              <TableHead>Data</TableHead>
              <TableHead>Prioritat</TableHead>
              <TableHead>Estat</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {incidents.length === 0 && (
              <TableRow>
                <TableCell colSpan={showReporter ? 5 : 4} className="py-10 text-center text-muted-foreground">
                  Cap incidència registrada.
                </TableCell>
              </TableRow>
            )}
            {incidents.map((incident) => (
              <TableRow key={incident.id}>
                <TableCell className="font-medium">
                  <Link href={`/incidencies/${incident.id}`} className="hover:underline">
                    {incident.title}
                  </Link>
                </TableCell>
                {showReporter && (
                  <TableCell className="text-muted-foreground">
                    {incident.reporter.name ?? incident.reporter.email}
                  </TableCell>
                )}
                <TableCell className="text-muted-foreground">
                  {formatDate(incident.createdAt)}
                </TableCell>
                <TableCell>
                  <Badge variant={incidentPriorityVariants[incident.priority]}>
                    {incidentPriorityLabels[incident.priority]}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={incidentStatusVariants[incident.status]}>
                    {incidentStatusLabels[incident.status]}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

/** Vista del professorat: quan està ocupat (sense noms) i els seus propis préstecs. */
export function ItemAvailability({
  upcoming,
  mine,
}: {
  upcoming: LoanRequest[];
  mine: LoanRequest[];
}) {
  return (
    <div className="grid gap-6 sm:grid-cols-2">
      <div>
        <h2 className="mb-3 text-lg font-semibold">Disponibilitat</h2>
        <div className="rounded-lg border bg-background p-4 text-sm">
          {upcoming.length === 0 ? (
            <p className="text-muted-foreground">Lliure: no hi ha cap préstec previst.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {upcoming.map((loan) => (
                <li key={loan.id} className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">
                    {formatDate(loan.startDate)} – {formatDate(loan.endDate)}
                  </span>
                  <Badge variant="outline">Ocupat</Badge>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div>
        <h2 className="mb-3 text-lg font-semibold">Els meus préstecs</h2>
        <div className="rounded-lg border bg-background p-4 text-sm">
          {mine.length === 0 ? (
            <p className="text-muted-foreground">Encara no has demanat aquest equip.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {mine.map((loan) => (
                <li key={loan.id} className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">
                    {formatDate(loan.startDate)} – {formatDate(loan.endDate)}
                  </span>
                  <Badge variant={loanRequestStatusVariants[loan.status]}>
                    {loanRequestStatusLabels[loan.status]}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
