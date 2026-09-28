import type { Route } from "next";
import Link from "next/link";
import Form from "next/form";
import { PlusIcon, TicketIcon, UserIcon } from "lucide-react";

import { db } from "@/lib/db";
import { deviceTypeLabels } from "@/lib/devices";
import { formatDate, schoolYearOf, schoolYearRange, schoolYearsBetween } from "@/lib/date";
import { incidentViewLabels, incidentViewWhere, parseIncidentView } from "@/lib/incidents";
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
import { INCIDENT_PAGE_SIZE, incidentPage, incidentSearchQuery, incidentSearchWhere } from "@/lib/incident-list";
import { IncidentMobileList } from "@/components/incidents/incident-mobile-list";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button-link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { IncidentStatus, Prisma } from "@prisma/client";

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
  const { status, inventoryItemId, chromebookId, cartId, assignada, curs, vista, q, pagina } = await searchParams;
  // Les cues del panell: «Veure-les totes» hi porta amb el mateix criteri que compta.
  const view = isAdmin(user.role) ? parseIncidentView(vista) : null;
  const statusFilter = STATUS_FILTERS.find((filter) => filter.value === status)?.value ?? "TOTES";
  const query = incidentSearchQuery(q);
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

  // El professorat només veu les seves incidències, hi hagi filtre d'objecte o
  // no: si això depengués del filtre, n'hi hauria prou amb un ?cartId=… a la URL
  // per llegir les incidències de la resta de companys.
  const visibleToUser = isAdmin(user.role) ? {} : { reporterId: user.id };

  const currentSchoolYear = schoolYearOf(new Date());
  // L'historial d'un objecte ha de mostrar-ho tot: acotar-lo a un curs buidaria
  // justament allò que el fa útil (veure que un equip falla any rere any). Les
  // vistes del panell tampoc: una avaria de juny aturada és feina d'ara.
  const allYears = Boolean(objectFilter || view);
  const schoolYear = allYears
    ? "TOTS"
    : typeof curs === "string" && (curs === "TOTS" || /^\d{4}-\d{4}$/.test(curs))
      ? curs
      : currentSchoolYear;
  const schoolYearWhere =
    schoolYear === "TOTS"
      ? {}
      : {
          createdAt: {
            gte: schoolYearRange(schoolYear).start,
            lt: schoolYearRange(schoolYear).end,
          },
        };

  // Les restriccions de visibilitat i les vistes se sumen a la cerca: cap OR
  // de text ni filtre d'estat pot ampliar el conjunt autoritzat.
  const where: Prisma.IncidentWhereInput = {
    AND: [
      objectFilter ?? {},
      visibleToUser,
      schoolYearWhere,
      onlyMine ? { assignedToId: user.id } : {},
      view ? incidentViewWhere(view) : {},
      statusFilter !== "TOTES" ? { status: statusFilter } : {},
      incidentSearchWhere(query),
    ],
  };
  const [total, oldest, openBefore] = await Promise.all([
    db.incident.count({ where }),
    db.incident.findFirst({
      where: visibleToUser,
      orderBy: { createdAt: "asc" },
      select: { createdAt: true },
    }),
    // Una avaria de juny segueix avariada al setembre. Si el filtre per curs
    // se les empassés en silenci, el canvi de curs faria desaparèixer feina
    // pendent de la vista sense que ningú se n'adonés.
    schoolYear === "TOTS"
      ? Promise.resolve(0)
      : db.incident.count({
          where: {
            ...visibleToUser,
            ...(onlyMine ? { assignedToId: user.id } : {}),
            ...incidentSearchWhere(query),
            status: { in: ["OBERTA", "EN_CURS"] },
            createdAt: { lt: schoolYearRange(schoolYear).start },
          },
        }),
  ]);

  const { page, pages, skip } = incidentPage(pagina, total);
  const incidents = await db.incident.findMany({
    where,
    include: {
      reporter: true,
      assignedTo: true,
      inventoryItem: true,
      chromebook: { include: { cart: true } },
      cart: true,
      space: true,
    },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }, { id: "asc" }],
    skip,
    take: INCIDENT_PAGE_SIZE,
  });

  const schoolYears = oldest ? schoolYearsBetween(oldest.createdAt) : [currentSchoolYear];

  function filterHref(next: { status?: string; mine?: boolean; curs?: string; q?: string; page?: number }): Route {
    const params = new URLSearchParams();
    const nextStatus = next.status !== undefined ? next.status : statusFilter;
    const nextMine = next.mine !== undefined ? next.mine : onlyMine;
    const nextCurs = next.curs !== undefined ? next.curs : schoolYear;
    // Dins l'historial d'un objecte, els filtres miren les d'aquell objecte: sense
    // això, triar «Oberta» portava a les de tot el centre sense avisar.
    if (objectFilter) {
      const [key, value] = Object.entries(objectFilter)[0];
      params.set(key, value);
    }
    if (view) params.set("vista", view);
    if (nextStatus && nextStatus !== "TOTES") params.set("status", nextStatus);
    if (nextMine) params.set("assignada", "jo");
    // L'historial d'un objecte i les vistes ja són de tots els cursos: no cal dir-ho a la URL.
    if (!allYears && nextCurs !== currentSchoolYear) params.set("curs", nextCurs);
    const nextQuery = next.q !== undefined ? next.q : query;
    if (nextQuery) params.set("q", nextQuery);
    if (next.page && next.page > 1) params.set("pagina", String(next.page));
    const search = params.toString();
    return (search ? `/incidencies?${search}` : "/incidencies") as Route;
  }

  const returnHref = filterHref({ page });
  const searchFilters = new URLSearchParams(filterHref({ q: "" }).split("?")[1]);
  const detailHref = (id: string) =>
    `/incidencies/${id}?${new URLSearchParams({ retorn: returnHref })}` as Route;

  // El nom surt de l'objecte i no de la primera incidència: amb un filtre d'estat
  // que no en deixa cap, el títol ha de continuar dient de quin equip és.
  const historyLabel = objectFilter ? await objectLabel(objectFilter) : null;

  function targetLabel(incident: (typeof incidents)[number]) {
    const base = incident.inventoryItem
      ? `${incident.inventoryItem.brand} ${incident.inventoryItem.model}`
      : incident.chromebook
        ? `${deviceTypeLabels[incident.chromebook.deviceType]} ${incident.chromebook.assetTag}`
        : incident.cart
          ? `Carro ${incident.cart.name}`
          : (incident.space?.name ?? incidentTargetTypeLabels[incident.targetType]);
    return incident.category ? `${base} · ${incidentCategoryLabels[incident.category]}` : base;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-xl border border-amber-500/30 bg-amber-500/15 text-amber-600 dark:border-amber-400/30 dark:bg-amber-400/20 dark:text-amber-400 shadow-2xs">
            <TicketIcon className="size-5.5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              {historyLabel ? `Historial: ${historyLabel}` : "Incidències TIC"}
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
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
        </div>
        <ButtonLink href="/incidencies/nova" className="shadow-xs font-medium">
          <PlusIcon className="size-4" />
          Nova incidència
        </ButtonLink>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {STATUS_FILTERS.map((filter) => (
          <ButtonLink
            key={filter.value}
            size="sm"
            variant={statusFilter === filter.value ? "default" : "outline"}
            current={statusFilter === filter.value}
            href={filterHref({ status: filter.value })}
          >
            {filter.label}
          </ButtonLink>
        ))}
        {isAdmin(user.role) && (
          <>
            <span className="mx-1 h-5 w-px bg-border" />
            <ButtonLink
              size="sm"
              variant={onlyMine ? "default" : "outline"}
              current={onlyMine}
              href={filterHref({ mine: !onlyMine })}
            >
              <UserIcon className="size-4" />
              Les meves
            </ButtonLink>
          </>
        )}

        {!allYears && (schoolYears.length > 1 || schoolYear !== currentSchoolYear) && (
          <>
            <span className="mx-1 h-5 w-px bg-border" />
            {schoolYears.map((year) => (
              <ButtonLink
                key={year}
                size="sm"
                variant={schoolYear === year ? "default" : "outline"}
                current={schoolYear === year}
                href={filterHref({ curs: year })}
              >
                {year === currentSchoolYear ? `Curs ${year}` : year}
              </ButtonLink>
            ))}
            <ButtonLink
              size="sm"
              variant={schoolYear === "TOTS" ? "default" : "outline"}
              current={schoolYear === "TOTS"}
              href={filterHref({ curs: "TOTS" })}
            >
              Tots els cursos
            </ButtonLink>
          </>
        )}
      </div>

      <Form action="/incidencies" className="flex flex-wrap items-end gap-2" role="search">
        {Array.from(searchFilters).map(([name, value]) => (
          <input key={name} type="hidden" name={name} value={value} />
        ))}
        <div className="w-full sm:max-w-md">
          <label htmlFor="incident-search" className="mb-1.5 block text-sm font-medium">
            Cerca incidències
          </label>
          <Input
            key={query}
            id="incident-search"
            name="q"
            type="search"
            defaultValue={query}
            maxLength={200}
            placeholder="Títol, descripció, equip o aula…"
            className="h-10"
          />
        </div>
        <Button type="submit" className="h-10">Cerca</Button>
        {query && <ButtonLink href={filterHref({ q: "" })} variant="ghost" className="h-10">Neteja la cerca</ButtonLink>}
      </Form>

      {view && (
        <p className="rounded-lg border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
          Només les incidències {incidentViewLabels[view]}.{" "}
          <Link href="/incidencies" className="font-medium text-foreground hover:underline">
            Veure totes les incidències
          </Link>
        </p>
      )}

      {openBefore > 0 && (
        <p className="text-sm text-muted-foreground">
          Hi ha {openBefore} {openBefore === 1 ? "incidència oberta" : "incidències obertes"} de
          cursos anteriors que aquest filtre no mostra.{" "}
          <Link href={filterHref({ curs: "TOTS", status: "TOTES" })} className="underline">
            Veure-les
          </Link>
        </p>
      )}

      <p className="text-sm text-muted-foreground" role="status">
        {total === 0
          ? "No hi ha cap incidència amb aquest filtre."
          : `${skip + 1}–${skip + incidents.length} de ${total} ${total === 1 ? "incidència" : "incidències"}`}
      </p>
      <IncidentMobileList
        admin={isAdmin(user.role)}
        items={incidents.map((incident) => ({
          id: incident.id,
          title: incident.title,
          targetLabel: targetLabel(incident),
          status: incident.status,
          priority: incident.priority,
          createdAt: incident.createdAt,
          reporterLabel: incident.reporter.name ?? incident.reporter.email,
          assigneeLabel: incident.assignedTo ? (incident.assignedTo.name ?? incident.assignedTo.email) : null,
          notifies: incident.reporterId !== user.id,
          href: detailHref(incident.id),
        }))}
      />
      <div className="hidden overflow-x-auto rounded-lg border bg-background md:block">
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
            {incidents.map((incident) => (
              <TableRow key={incident.id}>
                <TableCell className="font-medium">
                  <Link href={detailHref(incident.id)} className="rounded-sm hover:underline focus-visible:outline-2 focus-visible:outline-ring">
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
      {pages > 1 && (
        <nav aria-label="Paginació d'incidències" className="flex flex-wrap items-center justify-between gap-3">
          <span className="text-sm text-muted-foreground">Pàgina {page} de {pages}</span>
          <div className="flex gap-2">
            {page > 1 && <ButtonLink href={filterHref({ page: page - 1 })} variant="outline" className="h-10">Anterior</ButtonLink>}
            {page < pages && <ButtonLink href={filterHref({ page: page + 1 })} variant="outline" className="h-10">Següent</ButtonLink>}
          </div>
        </nav>
      )}
    </div>
  );
}

async function objectLabel(
  filter: { inventoryItemId: string } | { chromebookId: string } | { cartId: string },
) {
  if ("inventoryItemId" in filter) {
    const item = await db.inventoryItem.findUnique({
      where: { id: filter.inventoryItemId },
      select: { brand: true, model: true },
    });
    return item ? `${item.brand} ${item.model}` : "aquest objecte";
  }
  if ("chromebookId" in filter) {
    const chromebook = await db.chromebook.findUnique({
      where: { id: filter.chromebookId },
      select: { deviceType: true, assetTag: true, cart: { select: { name: true } } },
    });
    return chromebook
      ? `${deviceTypeLabels[chromebook.deviceType]} ${chromebook.assetTag} (carro ${chromebook.cart?.name ?? "—"})`
      : "aquest objecte";
  }
  const cart = await db.cart.findUnique({ where: { id: filter.cartId }, select: { name: true } });
  return cart ? `Carro ${cart.name}` : "aquest objecte";
}
