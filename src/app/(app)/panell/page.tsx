import type { Route } from "next";
import {
  AlertTriangleIcon,
  CalendarCheckIcon,
  CalendarClockIcon,
  DownloadIcon,
  HandCoinsIcon,
  HourglassIcon,
  LaptopIcon,
  MapPinIcon,
  MessageCircleQuestionIcon,
  TicketIcon,
} from "lucide-react";

import { formatDate, formatDateTimeFull, isSameDay } from "@/lib/date";
import { dueLabel } from "@/lib/device-reservations";
import { daysSinceActivity, STALLED_DAYS } from "@/lib/incidents";
import { daysOverdue } from "@/lib/loans";
import { getCourseStats, getPendingWork } from "@/lib/panell-data";
import { incidentPriorityLabels, incidentPriorityVariants } from "@/lib/labels";
import { requireAdmin } from "@/lib/permissions";
import { CourseMetrics } from "@/components/panell/course-metrics";
import { WorkQueue } from "@/components/panell/work-queue";
import { ButtonLink } from "@/components/ui/button-link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = { title: "Panell del coordinador" };

const who = (user: { name: string | null; email: string }) => user.name ?? user.email;

export default async function PanellPage() {
  await requireAdmin();
  const [work, stats] = await Promise.all([getPendingWork(), getCourseStats()]);
  const now = new Date();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Panell del coordinador</h1>
          <p className="text-muted-foreground">Què necessita la teva atenció avui.</p>
        </div>
        <ButtonLink variant="outline" href="/espais">
          <MapPinIcon className="size-4" />
          Gestiona aules i espais
        </ButtonLink>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <WorkQueue
          title="Incidències sense assignar"
          icon={TicketIcon}
          empty="Totes les incidències obertes tenen responsable."
          total={work.unassignedIncidents.total}
          allHref={"/incidencies?vista=sense-responsable" as Route}
          items={work.unassignedIncidents.items.map((incident) => ({
            id: incident.id,
            href: `/incidencies/${incident.id}` as Route,
            main: incident.title,
            meta: `${who(incident.reporter)} · ${formatDate(incident.createdAt)}`,
            badge: {
              label: incidentPriorityLabels[incident.priority],
              variant: incidentPriorityVariants[incident.priority],
            },
          }))}
        />

        <WorkQueue
          title="Incidències aturades"
          icon={HourglassIcon}
          empty={`Cap incidència amb responsable porta ${STALLED_DAYS} dies sense moure's.`}
          total={work.stalledIncidents.total}
          allHref={"/incidencies?vista=aturades" as Route}
          items={work.stalledIncidents.items.map((incident) => ({
            id: incident.id,
            href: `/incidencies/${incident.id}` as Route,
            main: incident.title,
            meta: incident.assignedTo ? `Responsable: ${who(incident.assignedTo)}` : "",
            badge: { label: `${daysSinceActivity(incident)} dies`, variant: "outline" as const },
          }))}
        />

        <WorkQueue
          title="Préstecs per aprovar"
          icon={HandCoinsIcon}
          empty="No hi ha sol·licituds pendents."
          total={work.pendingLoans.total}
          allHref="/inventari"
          items={work.pendingLoans.items.map((loan) => ({
            id: loan.id,
            href: "/inventari" as Route,
            main: `${loan.item.brand} ${loan.item.model}`,
            meta: `${who(loan.requester)} · ${formatDate(loan.startDate)} – ${formatDate(loan.endDate)}`,
            badge: null,
          }))}
        />

        <WorkQueue
          title="Devolucions fora de termini"
          icon={AlertTriangleIcon}
          empty="Cap equip prestat ha passat de data."
          items={work.overdueLoans.map((loan) => ({
            id: loan.id,
            href: "/inventari" as Route,
            main: `${loan.item.brand} ${loan.item.model}`,
            meta: `${who(loan.requester)} · havia de tornar el ${formatDate(loan.endDate)}`,
            badge: { label: `${daysOverdue(loan.endDate)} dies`, variant: "destructive" as const },
          }))}
        />

        <WorkQueue
          title="Equips de carro sense tornar"
          icon={CalendarClockIcon}
          empty="Tots els equips reservats a part han tornat al carro."
          items={work.overdueDevices.map((reservation) => {
            const { chromebook } = reservation;
            const days = Math.max(1, daysOverdue(reservation.endDate, now));
            return {
              id: reservation.id,
              href: (chromebook.cart ? `/chromebooks/${chromebook.cart.id}` : "/chromebooks") as Route,
              main: [chromebook.assetTag, chromebook.cart?.name].filter(Boolean).join(" · "),
              meta: `${who(reservation.user)} · l'havia de tornar ${dueLabel(reservation.endDate, now)}`,
              badge: isSameDay(reservation.endDate, now)
                ? { label: "Avui", variant: "outline" as const }
                : { label: days === 1 ? "1 dia" : `${days} dies`, variant: "destructive" as const },
            };
          })}
        />

        <WorkQueue
          title="Peticions i consultes sense tancar"
          icon={MessageCircleQuestionIcon}
          empty="No n'hi ha cap d'oberta."
          total={work.openQueries.total}
          allHref="/consultes"
          items={work.openQueries.items.map((query) => ({
            id: query.id,
            href: `/consultes/${query.id}` as Route,
            main: query.title,
            meta: `${who(query.author)} · ${formatDate(query.createdAt)}`,
            badge: null,
          }))}
        />

        <WorkQueue
          title="Chromebooks per a l'alumnat"
          icon={LaptopIcon}
          empty="No hi ha sol·licituds pendents ni equips per entregar."
          total={work.pendingStudentRequests.total + work.awaitingStudentDeliveries.total}
          allHref="/alumnat"
          items={[
            ...work.pendingStudentRequests.items.map((request) => ({
              id: request.id,
              href: "/alumnat" as Route,
              main: request.groupName
                ? `Sol·licitud per a un alumne/a de ${request.groupName}`
                : "Sol·licitud per a un alumne/a",
              meta: `${who(request.tutor)} · ${formatDate(request.createdAt)}`,
              badge: null,
            })),
            ...work.awaitingStudentDeliveries.items.map((request) => ({
              id: request.id,
              href: "/alumnat" as Route,
              main: `${request.chromebook?.assetTag ?? "Equip"} per entregar${
                request.groupName ? ` a un alumne/a de ${request.groupName}` : ""
              }`,
              meta: request.respondedAt ? `Aprovat el ${formatDate(request.respondedAt)}` : "Aprovat",
              badge: { label: "Per entregar", variant: "secondary" as const },
            })),
          ]}
        />

        <WorkQueue
          title="Properes cites"
          icon={CalendarCheckIcon}
          empty="No hi ha cap cita demanada."
          total={work.upcomingAppointments.total}
          allHref="/cites"
          items={work.upcomingAppointments.items.map((appointment) => ({
            id: appointment.id,
            href: "/cites" as Route,
            main: `${who(appointment.user)} · ${appointment.purpose}`,
            meta: `${formatDateTimeFull(appointment.slot.startDate)}${
              appointment.slot.openedBy ? ` · amb ${who(appointment.slot.openedBy)}` : ""
            }`,
            badge: null,
          }))}
        />
      </div>

      <CourseMetrics stats={stats} />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Exporta dades</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <a
            href="/api/export/incidencies"
            className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-muted"
          >
            <DownloadIcon className="size-4" />
            Incidències (CSV)
          </a>
          <a
            href="/api/export/inventari"
            className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-muted"
          >
            <DownloadIcon className="size-4" />
            Inventari (CSV)
          </a>
        </CardContent>
      </Card>
    </div>
  );
}
