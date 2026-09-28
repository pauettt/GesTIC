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
  RepeatIcon,
  TicketIcon,
} from "lucide-react";

import { formatDate, formatDateTimeFull, isSameDay, madridDateKey } from "@/lib/date";
import { dueLabel } from "@/lib/device-reservations";
import { slotLabel } from "@/lib/recurring-reservations";
import { daysSinceActivity, STALLED_DAYS } from "@/lib/incidents";
import { daysOverdue } from "@/lib/loans";
import { getEmailFailures } from "@/lib/email-failures";
import { getHolidays } from "@/lib/holidays-data";
import { getCourseStats, getPendingWork } from "@/lib/panell-data";
import { incidentPriorityLabels, incidentPriorityVariants } from "@/lib/labels";
import { requireAdmin } from "@/lib/permissions";
import { EmailFailuresAlert } from "@/components/admin/email-failures-alert";
import { HolidaysDialog } from "@/components/holidays/holidays-dialog";
import { CourseMetrics } from "@/components/panell/course-metrics";
import { WorkQueue } from "@/components/panell/work-queue";
import { ButtonLink } from "@/components/ui/button-link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = { title: "Panell del coordinador" };

const who = (user: { name: string | null; email: string }) => user.name ?? user.email;

export default async function PanellPage() {
  await requireAdmin();
  const [work, stats, emailFailures, holidays] = await Promise.all([
    getPendingWork(),
    getCourseStats(),
    getEmailFailures(),
    getHolidays(),
  ]);
  const now = new Date();
  const today = madridDateKey(now);
  const upcomingHolidays = holidays.filter((holiday) => holiday.endDate >= today);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Panell del coordinador</h1>
          <p className="text-muted-foreground">Què necessita la teva atenció avui.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <HolidaysDialog holidays={upcomingHolidays} />
          <ButtonLink variant="outline" href="/espais">
            <MapPinIcon className="size-4" />
            Gestiona aules i espais
          </ButtonLink>
        </div>
      </div>

      <EmailFailuresAlert failures={emailFailures} />

      <div className="grid gap-4 lg:grid-cols-2">
        <WorkQueue
          title="Incidències sense assignar"
          icon={TicketIcon}
          iconClassName="text-amber-600 dark:text-amber-400"
          accentBorder="border-t-4 border-t-amber-500"
          headerBg="bg-amber-500/5 dark:bg-amber-500/10"
          countVariant={work.unassignedIncidents.total > 0 ? "warning" : "secondary"}
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
          iconClassName="text-orange-600 dark:text-orange-400"
          accentBorder="border-t-4 border-t-orange-500"
          headerBg="bg-orange-500/5 dark:bg-orange-500/10"
          countVariant={work.stalledIncidents.total > 0 ? "warning" : "secondary"}
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
          iconClassName="text-indigo-600 dark:text-indigo-400"
          accentBorder="border-t-4 border-t-indigo-500"
          headerBg="bg-indigo-500/5 dark:bg-indigo-500/10"
          countVariant={work.pendingLoans.total > 0 ? "default" : "secondary"}
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
          iconClassName="text-red-600 dark:text-red-400"
          accentBorder="border-t-4 border-t-red-500"
          headerBg="bg-red-500/5 dark:bg-red-500/10"
          countVariant={work.overdueLoans.length > 0 ? "destructive" : "secondary"}
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
          iconClassName="text-rose-600 dark:text-rose-400"
          accentBorder="border-t-4 border-t-rose-500"
          headerBg="bg-rose-500/5 dark:bg-rose-500/10"
          countVariant={work.overdueDevices.length > 0 ? "destructive" : "secondary"}
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
          title="Reserves fixes per aprovar"
          icon={RepeatIcon}
          iconClassName="text-sky-600 dark:text-sky-400"
          accentBorder="border-t-4 border-t-sky-500"
          headerBg="bg-sky-500/5 dark:bg-sky-500/10"
          countVariant={work.pendingRecurring.total > 0 ? "info" : "secondary"}
          empty="No hi ha cap reserva fixa pendent."
          total={work.pendingRecurring.total}
          allHref="/chromebooks/reserves-fixes"
          items={work.pendingRecurring.items.map((recurring) => ({
            id: recurring.id,
            href: "/chromebooks/reserves-fixes" as Route,
            main: `${recurring.cart.name} · ${slotLabel(recurring.weekday, recurring.periodId)}`,
            meta: `${who(recurring.user)} · ${formatDate(recurring.createdAt)}`,
            badge: null,
          }))}
        />

        <WorkQueue
          title="Peticions i consultes sense tancar"
          icon={MessageCircleQuestionIcon}
          iconClassName="text-teal-600 dark:text-teal-400"
          accentBorder="border-t-4 border-t-teal-500"
          headerBg="bg-teal-500/5 dark:bg-teal-500/10"
          countVariant={work.openQueries.total > 0 ? "default" : "secondary"}
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
          iconClassName="text-emerald-600 dark:text-emerald-400"
          accentBorder="border-t-4 border-t-emerald-500"
          headerBg="bg-emerald-500/5 dark:bg-emerald-500/10"
          countVariant={work.pendingStudentRequests.total + work.awaitingStudentDeliveries.total > 0 ? "success" : "secondary"}
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
              badge: { label: "Per entregar", variant: "info" as const },
            })),
          ]}
        />

        <WorkQueue
          title="Properes cites"
          icon={CalendarCheckIcon}
          iconClassName="text-purple-600 dark:text-purple-400"
          accentBorder="border-t-4 border-t-purple-500"
          headerBg="bg-purple-500/5 dark:bg-purple-500/10"
          empty="No hi ha cap cita demanada."
          total={work.upcomingAppointments.total}
          allHref="/cites"
          items={work.upcomingAppointments.items.map((appointment) => ({
            id: appointment.id,
            href: "/cites" as Route,
            main: `${who(appointment.user)} · ${appointment.purpose}`,
            meta: `${formatDateTimeFull(appointment.slot.startDate)}${
              appointment.slot.coordinator ? ` · amb ${who(appointment.slot.coordinator)}` : ""
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
