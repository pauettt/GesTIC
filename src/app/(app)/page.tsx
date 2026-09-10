import type { Route } from "next";
import Link from "next/link";
import {
  BookOpenIcon,
  GraduationCapIcon,
  HandCoinsIcon,
  HelpCircleIcon,
  LaptopIcon,
  MessageCircleQuestionIcon,
  PackageIcon,
  PlusIcon,
  TicketIcon,
} from "lucide-react";

import { db } from "@/lib/db";
import { formatDate } from "@/lib/date";
import { isAdmin, requireUser } from "@/lib/permissions";
import { incidentStatusLabels, incidentStatusVariants } from "@/lib/labels";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const MODULE_CARDS: Array<{
  href: Route;
  title: string;
  description: string;
  icon: typeof TicketIcon;
}> = [
  {
    href: "/incidencies",
    title: "Incidències TIC",
    description: "Reporta i fes seguiment de problemes amb equips del centre.",
    icon: TicketIcon,
  },
  {
    href: "/inventari",
    title: "Inventari i préstecs",
    description: "Consulta l'equipament del centre i demana material en préstec.",
    icon: PackageIcon,
  },
  {
    href: "/chromebooks",
    title: "Chromebooks",
    description: "Reserva carros de Chromebooks i consulta'n l'estat.",
    icon: LaptopIcon,
  },
  {
    href: "/formacio",
    title: "Formació",
    description: "Sessions de formació TIC per al professorat.",
    icon: GraduationCapIcon,
  },
  {
    href: "/consultes",
    title: "Consultes",
    description: "Pregunta directament a la coordinació TIC i fes-ne seguiment.",
    icon: MessageCircleQuestionIcon,
  },
  {
    href: "/dubtes",
    title: "Dubtes freqüents",
    description: "Respostes ràpides a les preguntes més habituals.",
    icon: HelpCircleIcon,
  },
  {
    href: "/tutorials",
    title: "Tutorials",
    description: "Instruccions pas a pas per a eines i equips del centre.",
    icon: BookOpenIcon,
  },
];

export const metadata = { title: "Inici" };

export default async function HomePage() {
  const user = await requireUser();
  const coordinator = isAdmin(user.role);

  // El que li passa a aquesta persona ara mateix: les seves incidències obertes
  // i el material que té en préstec.
  const [myIncidents, myLoans] = await Promise.all([
    db.incident.findMany({
      where: { reporterId: user.id, status: { in: ["OBERTA", "EN_CURS"] } },
      orderBy: { createdAt: "desc" },
      take: 4,
    }),
    db.loanRequest.findMany({
      where: { requesterId: user.id, status: { in: ["PENDENT", "APROVADA"] } },
      include: { item: true },
      orderBy: { startDate: "asc" },
      take: 4,
    }),
  ]);

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">
            Hola, {user.name?.split(" ")[0] ?? "benvingut/da"}
          </h1>
          <p className="text-muted-foreground">
            {coordinator
              ? "Consulta el panell per veure què necessita la teva atenció."
              : "Què necessites avui?"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button nativeButton={false} render={<Link href="/incidencies/nova" />}>
            <PlusIcon className="size-4" />
            Nova incidència
          </Button>
          <Button variant="outline" nativeButton={false} render={<Link href="/chromebooks" />}>
            <LaptopIcon className="size-4" />
            Reservar un carro
          </Button>
          <Button variant="outline" nativeButton={false} render={<Link href="/inventari" />}>
            <HandCoinsIcon className="size-4" />
            Demanar material
          </Button>
        </div>
      </div>

      {(myIncidents.length > 0 || myLoans.length > 0) && (
        <div className="grid gap-4 sm:grid-cols-2">
          {myIncidents.length > 0 && (
            <Card>
              <CardHeader className="border-b">
                <CardTitle className="text-base">Les meves incidències obertes</CardTitle>
              </CardHeader>
              <ul className="flex flex-col divide-y px-(--card-spacing)">
                {myIncidents.map((incident) => (
                  <li key={incident.id}>
                    <Link
                      href={`/incidencies/${incident.id}` as Route}
                      className="-mx-2 flex items-center justify-between gap-3 rounded-md px-2 py-2 hover:bg-muted"
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium">{incident.title}</span>
                        <span className="block text-xs text-muted-foreground">
                          {formatDate(incident.createdAt)}
                        </span>
                      </span>
                      <Badge variant={incidentStatusVariants[incident.status]}>
                        {incidentStatusLabels[incident.status]}
                      </Badge>
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {myLoans.length > 0 && (
            <Card>
              <CardHeader className="border-b">
                <CardTitle className="text-base">El meu material en préstec</CardTitle>
              </CardHeader>
              <ul className="flex flex-col divide-y px-(--card-spacing)">
                {myLoans.map((loan) => (
                  <li key={loan.id} className="flex items-center justify-between gap-3 py-2">
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium">
                        {loan.item.brand} {loan.item.model}
                      </span>
                      <span className="block text-xs text-muted-foreground">
                        Fins al {formatDate(loan.endDate)}
                      </span>
                    </span>
                    <Badge variant={loan.status === "APROVADA" ? "secondary" : "default"}>
                      {loan.status === "APROVADA" ? "El tens tu" : "Pendent"}
                    </Badge>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {MODULE_CARDS.map((item) => {
          const Icon = item.icon;
          return (
            <Link key={item.href} href={item.href}>
              <Card className="h-full transition-colors hover:border-primary/50 hover:bg-muted/40">
                <CardHeader>
                  <Icon className="size-6 text-primary" />
                  <CardTitle className="mt-2">{item.title}</CardTitle>
                  <CardDescription>{item.description}</CardDescription>
                </CardHeader>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
