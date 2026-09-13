import type { Route } from "next";
import Link from "next/link";
import {
  BookOpenIcon,
  CalendarCheckIcon,
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
import { formatDate, formatDateTime, formatDateTimeFull } from "@/lib/date";
import { isAdmin, requireUser } from "@/lib/permissions";
import { incidentStatusLabels, incidentStatusVariants } from "@/lib/labels";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button-link";
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
    href: "/cites",
    title: "Cites",
    description: "Demana hora amb la coordinació TIC per al que necessitis.",
    icon: CalendarCheckIcon,
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
  const now = new Date();

  // El que li passa a aquesta persona ara mateix: les seves incidències obertes,
  // el material i les claus que té, les cites que li queden i, si és tutor/a,
  // com van els Chromebooks que ha demanat per a l'alumnat.
  const [myIncidents, myLoans, myKeys, myAppointments, pendingStudentRequests, assignedStudentDevices] =
    await Promise.all([
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
      // Consergeria reclama les claus per correu: qui el rep ha de poder veure
      // aquí quina clau té i des de quan.
      db.keyLoan.findMany({
        where: { borrowerId: user.id, returnedAt: null },
        include: { key: { select: { number: true, name: true } } },
        orderBy: { deliveredAt: "asc" },
      }),
      db.appointment.findMany({
        where: { userId: user.id, slot: { endDate: { gt: now } } },
        select: { id: true, purpose: true, slot: { select: { startDate: true } } },
        orderBy: { slot: { startDate: "asc" } },
        take: 4,
      }),
      user.isTutor
        ? db.studentDeviceRequest.count({ where: { tutorId: user.id, status: "PENDENT" } })
        : Promise.resolve(0),
      user.isTutor
        ? db.studentDeviceRequest.count({ where: { tutorId: user.id, status: "APROVADA" } })
        : Promise.resolve(0),
    ]);

  const hasStudentDevices = pendingStudentRequests + assignedStudentDevices > 0;
  const hasSomethingOpen =
    myIncidents.length > 0 ||
    myLoans.length > 0 ||
    myKeys.length > 0 ||
    myAppointments.length > 0 ||
    hasStudentDevices;

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
          <ButtonLink href="/incidencies/nova">
            <PlusIcon className="size-4" />
            Nova incidència
          </ButtonLink>
          <ButtonLink variant="outline" href="/chromebooks">
            <LaptopIcon className="size-4" />
            Reservar un carro
          </ButtonLink>
          <ButtonLink variant="outline" href="/inventari">
            <HandCoinsIcon className="size-4" />
            Demanar material
          </ButtonLink>
        </div>
      </div>

      {hasSomethingOpen && (
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

          {myKeys.length > 0 && (
            <Card>
              <CardHeader className="border-b">
                <CardTitle className="text-base">Claus que tens</CardTitle>
                <CardDescription>Torna-les al taulell de consergeria quan acabis.</CardDescription>
              </CardHeader>
              <ul className="flex flex-col divide-y px-(--card-spacing)">
                {myKeys.map((loan) => (
                  <li key={loan.id} className="py-2">
                    <span className="block truncate text-sm font-medium">
                      {loan.key.number} — {loan.key.name}
                    </span>
                    <span className="block text-xs text-muted-foreground">
                      Des del {formatDateTime(loan.deliveredAt)}
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {myAppointments.length > 0 && (
            <Card>
              <CardHeader className="border-b">
                <CardTitle className="text-base">Les meves cites</CardTitle>
              </CardHeader>
              <ul className="flex flex-col divide-y px-(--card-spacing)">
                {myAppointments.map((appointment) => (
                  <li key={appointment.id}>
                    <Link
                      href="/cites"
                      className="-mx-2 block rounded-md px-2 py-2 hover:bg-muted"
                    >
                      <span className="block truncate text-sm font-medium">{appointment.purpose}</span>
                      <span className="block text-xs text-muted-foreground">
                        {formatDateTimeFull(appointment.slot.startDate)}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {hasStudentDevices && (
            <Card>
              <CardHeader className="border-b">
                <CardTitle className="text-base">Chromebooks per a l&apos;alumnat</CardTitle>
              </CardHeader>
              <Link
                href="/chromebooks"
                className="mx-(--card-spacing) -mt-2 mb-1 flex flex-col gap-0.5 rounded-md px-2 py-2 text-sm hover:bg-muted"
              >
                {pendingStudentRequests > 0 && (
                  <span>
                    {pendingStudentRequests}{" "}
                    {pendingStudentRequests === 1
                      ? "sol·licitud pendent de resposta"
                      : "sol·licituds pendents de resposta"}
                  </span>
                )}
                {assignedStudentDevices > 0 && (
                  <span>
                    {assignedStudentDevices}{" "}
                    {assignedStudentDevices === 1
                      ? "equip assignat al teu alumnat"
                      : "equips assignats al teu alumnat"}
                  </span>
                )}
              </Link>
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
