import type { Route } from "next";
import Link from "next/link";
import { PlusIcon, UserIcon } from "lucide-react";

import { db } from "@/lib/db";
import { formatDate } from "@/lib/date";
import { isAdmin, requireUser } from "@/lib/permissions";
import {
  incidentCategoryLabels,
  incidentPriorityLabels,
  incidentPriorityVariants,
  incidentStatusLabels,
  incidentStatusVariants,
  incidentTargetTypeLabels,
} from "@/lib/labels";
import {
  IncidentPrioritySelect,
  IncidentStatusSelect,
} from "@/components/incidents/incident-badge-selects";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { IncidentStatus } from "@prisma/client";

const STATUS_FILTERS: { value: IncidentStatus | "TOTES"; label: string }[] = [
  { value: "TOTES", label: "Totes" },
  { value: "OBERTA", label: "Obertes" },
  { value: "EN_CURS", label: "En curs" },
  { value: "RESOLTA", label: "Resoltes" },
  { value: "TANCADA", label: "Tancades" },
];

export const metadata = { title: "Incidències TIC" };

export default async function IncidenciesPage({
  searchParams,
}: PageProps<"/incidencies">) {
  const user = await requireUser();
  const { status, inventoryItemId, chromebookId, cartId, assignada } = await searchParams;
  const statusFilter = typeof status === "string" ? status : "TOTES";
  // Amb tres coordinadors, "les meves" és la vista de treball habitual.
  const onlyMine = assignada === "jo" && isAdmin(user.role);
  const objectFilter =
    typeof inventoryItemId === "string"
      ? { inventoryItemId }
      : typeof chromebookId === "string"
        ? { chromebookId }
        : typeof cartId === "string"
          ? { cartId }
          : null;

  const incidents = await db.incident.findMany({
    where: {
      ...(objectFilter ?? {}),
      // El professorat només veu les seves incidències, hi hagi filtre d'objecte
      // o no: si això depengués del filtre, n'hi hauria prou amb un ?cartId=…
      // a la URL per llegir les incidències de la resta de companys.
      ...(isAdmin(user.role) ? {} : { reporterId: user.id }),
      ...(onlyMine ? { assignedToId: user.id } : {}),
      ...(statusFilter !== "TOTES" ? { status: statusFilter as IncidentStatus } : {}),
    },
    include: {
      reporter: true,
      assignedTo: true,
      inventoryItem: true,
      chromebook: { include: { cart: true } },
      cart: true,
      space: true,
    },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
  });

  function filterHref(next: { status?: string; mine?: boolean }): Route {
    const params = new URLSearchParams();
    const nextStatus = next.status !== undefined ? next.status : statusFilter;
    const nextMine = next.mine !== undefined ? next.mine : onlyMine;
    if (nextStatus && nextStatus !== "TOTES") params.set("status", nextStatus);
    if (nextMine) params.set("assignada", "jo");
    const query = params.toString();
    return (query ? `/incidencies?${query}` : "/incidencies") as Route;
  }

  const historyLabel = objectFilter
    ? (incidents[0]
        ? targetLabelStandalone(incidents[0])
        : "aquest objecte")
    : null;

  function targetLabelStandalone(incident: (typeof incidents)[number]) {
    return incident.inventoryItem
      ? `${incident.inventoryItem.brand} ${incident.inventoryItem.model}`
      : incident.chromebook
        ? `Chromebook ${incident.chromebook.assetTag} (carro ${incident.chromebook.cart?.name ?? "—"})`
        : incident.cart
          ? `Carro ${incident.cart.name}`
          : "aquest objecte";
  }

  function targetLabel(incident: (typeof incidents)[number]) {
    const base = incident.inventoryItem
      ? `${incident.inventoryItem.brand} ${incident.inventoryItem.model}`
      : incident.chromebook
        ? `Chromebook ${incident.chromebook.assetTag}`
        : incident.cart
          ? `Carro ${incident.cart.name}`
          : (incident.space?.name ?? incidentTargetTypeLabels[incident.targetType]);
    return incident.category ? `${base} · ${incidentCategoryLabels[incident.category]}` : base;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">
            {historyLabel ? `Historial: ${historyLabel}` : "Incidències TIC"}
          </h1>
          <p className="text-muted-foreground">
            {historyLabel ? (
              <>
                {isAdmin(user.role)
                  ? "Totes les incidències registrades per aquest objecte."
                  : "Les incidències que has reportat sobre aquest objecte."}{" "}
                <Link href="/incidencies" className="underline">
                  Veure totes les incidències
                </Link>
              </>
            ) : isAdmin(user.role) ? (
              "Totes les incidències reportades al centre."
            ) : (
              "Les incidències que has reportat."
            )}
          </p>
        </div>
        <Button nativeButton={false} render={<Link href="/incidencies/nova" />}>
          <PlusIcon className="size-4" />
          Nova incidència
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {STATUS_FILTERS.map((filter) => (
          <Button
            key={filter.value}
            size="sm"
            variant={statusFilter === filter.value ? "default" : "outline"}
            nativeButton={false}
            render={<Link href={filterHref({ status: filter.value })} />}
          >
            {filter.label}
          </Button>
        ))}
        {isAdmin(user.role) && (
          <>
            <span className="mx-1 h-5 w-px bg-border" />
            <Button
              size="sm"
              variant={onlyMine ? "default" : "outline"}
              nativeButton={false}
              render={<Link href={filterHref({ mine: !onlyMine })} />}
            >
              <UserIcon className="size-4" />
              Les meves
            </Button>
          </>
        )}
      </div>

      <div className="overflow-x-auto rounded-lg border bg-background">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Títol</TableHead>
              <TableHead>Equip</TableHead>
              {isAdmin(user.role) && <TableHead>Professor/a</TableHead>}
              {isAdmin(user.role) && <TableHead>Assignada a</TableHead>}
              <TableHead>Prioritat</TableHead>
              <TableHead>Estat</TableHead>
              <TableHead>Data</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {incidents.length === 0 && (
              <TableRow>
                <TableCell colSpan={isAdmin(user.role) ? 7 : 5} className="py-10 text-center text-muted-foreground">
                  No hi ha cap incidència amb aquest filtre.
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
                <TableCell className="text-muted-foreground">{targetLabel(incident)}</TableCell>
                {isAdmin(user.role) && (
                  <TableCell className="text-muted-foreground">
                    {incident.reporter.name ?? incident.reporter.email}
                  </TableCell>
                )}
                {isAdmin(user.role) && (
                  <TableCell className="text-muted-foreground">
                    {incident.assignedTo
                      ? (incident.assignedTo.name ?? incident.assignedTo.email)
                      : "—"}
                  </TableCell>
                )}
                <TableCell>
                  {isAdmin(user.role) ? (
                    <IncidentPrioritySelect incidentId={incident.id} priority={incident.priority} />
                  ) : (
                    <Badge variant={incidentPriorityVariants[incident.priority]}>
                      {incidentPriorityLabels[incident.priority]}
                    </Badge>
                  )}
                </TableCell>
                <TableCell>
                  {isAdmin(user.role) ? (
                    <IncidentStatusSelect
                      incidentId={incident.id}
                      status={incident.status}
                      reporterName={incident.reporter.name ?? incident.reporter.email}
                      notifies={incident.reporterId !== user.id}
                    />
                  ) : (
                    <Badge variant={incidentStatusVariants[incident.status]}>
                      {incidentStatusLabels[incident.status]}
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {formatDate(incident.createdAt)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
