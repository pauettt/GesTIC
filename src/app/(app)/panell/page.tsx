import type { Route } from "next";
import Link from "next/link";
import {
  AlertTriangleIcon,
  DownloadIcon,
  HandCoinsIcon,
  MapPinIcon,
  MessageCircleQuestionIcon,
  TicketIcon,
} from "lucide-react";

import { formatDate } from "@/lib/date";
import { daysOverdue } from "@/lib/loans";
import { getCourseStats, getPendingWork } from "@/lib/panell-data";
import { incidentPriorityLabels, incidentPriorityVariants } from "@/lib/labels";
import { requireAdmin } from "@/lib/permissions";
import { CourseMetrics } from "@/components/panell/course-metrics";
import { WorkQueue } from "@/components/panell/work-queue";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = { title: "Panell del coordinador" };

const who = (user: { name: string | null; email: string }) => user.name ?? user.email;

export default async function PanellPage() {
  await requireAdmin();
  const [work, stats] = await Promise.all([getPendingWork(), getCourseStats()]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Panell del coordinador</h1>
          <p className="text-muted-foreground">Què necessita la teva atenció avui.</p>
        </div>
        <Button variant="outline" nativeButton={false} render={<Link href="/espais" />}>
          <MapPinIcon className="size-4" />
          Gestiona aules i espais
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <WorkQueue
          title="Incidències sense assignar"
          icon={TicketIcon}
          empty="Totes les incidències obertes tenen responsable."
          items={work.unassignedIncidents.map((incident) => ({
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
          title="Préstecs per aprovar"
          icon={HandCoinsIcon}
          empty="No hi ha sol·licituds pendents."
          items={work.pendingLoans.map((loan) => ({
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
          title="Consultes sense tancar"
          icon={MessageCircleQuestionIcon}
          empty="No hi ha consultes obertes."
          items={work.openQueries.map((query) => ({
            id: query.id,
            href: `/consultes/${query.id}` as Route,
            main: query.title,
            meta: `${who(query.author)} · ${formatDate(query.createdAt)}`,
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
