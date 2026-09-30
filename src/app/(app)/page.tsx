import type { Route } from "next";
import Link from "next/link";
import {
  BackpackIcon,
  CalendarCheckIcon,
  HandCoinsIcon,
  HelpCircleIcon,
  LaptopIcon,
  MessageCircleQuestionIcon,
  PackageIcon,
  PlusIcon,
  SquarePlayIcon,
  TicketIcon,
} from "lucide-react";

import { db } from "@/lib/db";
import {
  formatDate,
  formatDateTime,
  formatDateTimeFull,
  formatTime,
  startOfWeek,
  toDateParam,
} from "@/lib/date";
import {
  bookingSpanLabel,
  dayLabel,
  dueLabel,
  openDeviceReservations,
  reservationView,
} from "@/lib/device-reservations";
import { deviceTypeLabels } from "@/lib/devices";
import { getPendingCounts } from "@/lib/panell-data";
import { isAdmin, requireUser } from "@/lib/permissions";
import { incidentStatusLabels, incidentStatusVariants } from "@/lib/labels";
import { DeviceReservationAction } from "@/components/chromebooks/device-reservations";
import { PendingSummary } from "@/components/panell/pending-summary";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button-link";
import { cn } from "@/lib/utils";
import { inventoryItemName } from "@/lib/inventory-item-name";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const MODULE_CARDS: Array<{
  href: Route;
  title: string;
  description: string;
  icon: typeof TicketIcon;
  iconBoxClasses: string;
  accentBorder: string;
  /** El que en veu el professorat, quan la seva pantalla no és la de la coordinació. */
  professor?: { title: string; description: string };
  /** Només per a tutors/es: la resta del professorat no hi pot fer res. */
  tutorsOnly?: boolean;
}> = [
  {
    href: "/incidencies",
    title: "Incidències TIC",
    description: "Reporta i fes seguiment de problemes amb equips del centre.",
    icon: TicketIcon,
    accentBorder: "border-t-2 border-t-amber-500",
    iconBoxClasses:
      "border-amber-500/30 bg-amber-500/15 text-amber-600 dark:border-amber-400/30 dark:bg-amber-400/20 dark:text-amber-400",
  },
  {
    href: "/inventari",
    title: "Inventari i préstecs",
    description: "Consulta l'equipament del centre i demana material en préstec.",
    icon: PackageIcon,
    accentBorder: "border-t-2 border-t-indigo-500",
    iconBoxClasses:
      "border-indigo-500/30 bg-indigo-500/15 text-indigo-600 dark:border-indigo-400/30 dark:bg-indigo-400/20 dark:text-indigo-400",
    professor: {
      title: "Préstec de material",
      description: "Demana material del centre en préstec i segueix com van les teves sol·licituds.",
    },
  },
  {
    href: "/chromebooks",
    title: "Carros",
    description: "Reserva carros de Chromebooks, portàtils o iPads i consulta'n l'estat.",
    icon: LaptopIcon,
    accentBorder: "border-t-2 border-t-sky-500",
    iconBoxClasses:
      "border-sky-500/30 bg-sky-500/15 text-sky-600 dark:border-sky-400/30 dark:bg-sky-400/20 dark:text-sky-400",
  },
  {
    href: "/alumnat",
    title: "Préstec a l'alumnat",
    description: "Demana un Chromebook per a un alumne/a del teu grup per a tot el curs.",
    icon: BackpackIcon,
    accentBorder: "border-t-2 border-t-emerald-500",
    iconBoxClasses:
      "border-emerald-500/30 bg-emerald-500/15 text-emerald-600 dark:border-emerald-400/30 dark:bg-emerald-400/20 dark:text-emerald-400",
    tutorsOnly: true,
  },
  {
    href: "/cites",
    title: "Cites",
    description: "Demana hora amb la coordinació TIC per al que necessitis.",
    icon: CalendarCheckIcon,
    accentBorder: "border-t-2 border-t-purple-500",
    iconBoxClasses:
      "border-purple-500/30 bg-purple-500/15 text-purple-600 dark:border-purple-400/30 dark:bg-purple-400/20 dark:text-purple-400",
  },
  {
    href: "/consultes",
    title: "Peticions i consultes",
    description: "Demana o pregunta directament a la coordinació TIC i fes-ne seguiment.",
    icon: MessageCircleQuestionIcon,
    accentBorder: "border-t-2 border-t-teal-500",
    iconBoxClasses:
      "border-teal-500/30 bg-teal-500/15 text-teal-600 dark:border-teal-400/30 dark:bg-teal-400/20 dark:text-teal-400",
  },
  {
    href: "/dubtes",
    title: "Dubtes freqüents",
    description: "Respostes ràpides a les preguntes més habituals.",
    icon: HelpCircleIcon,
    accentBorder: "border-t-2 border-t-orange-500",
    iconBoxClasses:
      "border-orange-500/30 bg-orange-500/15 text-orange-600 dark:border-orange-400/30 dark:bg-orange-400/20 dark:text-orange-400",
  },
  {
    href: "/tutorials",
    title: "Tutorials",
    description: "Vídeos curts per fer servir les eines i els equips del centre.",
    icon: SquarePlayIcon,
    accentBorder: "border-t-2 border-t-rose-500",
    iconBoxClasses:
      "border-rose-500/30 bg-rose-500/15 text-rose-600 dark:border-rose-400/30 dark:bg-rose-400/20 dark:text-rose-400",
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
  const [
    myIncidents,
    myLoans,
    myKeys,
    myAppointments,
    myReservations,
    myDeviceReservations,
    pendingStudentRequests,
    toCollectStudentDevices,
    deliveredStudentDevices,
    pendingCounts,
  ] =
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
        select: {
          id: true,
          purpose: true,
          slot: { select: { startDate: true, coordinator: { select: { name: true, email: true } } } },
        },
        orderBy: { slot: { startDate: "asc" } },
        take: 4,
      }),
      // Les que encara no s'han acabat: la d'ara mateix també, per saber quin carro toca.
      db.reservation.findMany({
        where: { userId: user.id, status: "CONFIRMADA", endDate: { gt: now } },
        select: {
          id: true,
          startDate: true,
          endDate: true,
          cart: { select: { id: true, name: true } },
        },
        orderBy: { startDate: "asc" },
        take: 4,
      }),
      // Equips sols reservats: els que ja té, fins que els torni, i els que vindran.
      db.deviceReservation.findMany({
        where: { userId: user.id, status: "CONFIRMADA" },
        select: {
          ...openDeviceReservations.select,
          chromebook: {
            select: { assetTag: true, deviceType: true, cart: { select: { id: true, name: true } } },
          },
        },
        orderBy: { startDate: "asc" },
        take: 6,
      }),
      user.isTutor
        ? db.studentDeviceRequest.count({ where: { tutorId: user.id, status: "PENDENT" } })
        : Promise.resolve(0),
      user.isTutor
        ? db.studentDeviceRequest.count({ where: { tutorId: user.id, status: "APROVADA" } })
        : Promise.resolve(0),
      user.isTutor
        ? db.studentDeviceRequest.count({ where: { tutorId: user.id, status: "ENTREGADA" } })
        : Promise.resolve(0),
      coordinator ? getPendingCounts(now) : Promise.resolve(null),
    ]);

  const hasStudentDevices =
    pendingStudentRequests + toCollectStudentDevices + deliveredStudentDevices > 0;
  const hasSomethingOpen =
    myIncidents.length > 0 ||
    myLoans.length > 0 ||
    myKeys.length > 0 ||
    myAppointments.length > 0 ||
    myReservations.length > 0 ||
    myDeviceReservations.length > 0 ||
    hasStudentDevices;

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-5 sm:p-6 shadow-xs">
        <div className="relative z-10 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold tracking-wide text-primary">
                Portal TIC del Centre
              </span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Hola, {user.name?.split(" ")[0] ?? "benvingut/da"} 👋
            </h1>
            <p className="max-w-xl text-sm text-muted-foreground">
              Què necessites avui? Pots reportar incidències, reservar carros de dispositius o demanar material en préstec.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 pt-1 md:pt-0">
            <ButtonLink href="/incidencies/nova" className="shadow-xs font-medium">
              <PlusIcon className="size-4" />
              Nova incidència
            </ButtonLink>
            <ButtonLink
              variant="outline"
              href="/chromebooks"
              className="border-sky-500/30 bg-card font-medium text-sky-700 hover:bg-sky-50 dark:text-sky-300 dark:hover:bg-sky-950/30 shadow-2xs"
            >
              <LaptopIcon className="size-4" />
              Reservar un carro
            </ButtonLink>
            <ButtonLink
              variant="outline"
              href="/inventari"
              className="border-indigo-500/30 bg-card font-medium text-indigo-700 hover:bg-indigo-50 dark:text-indigo-300 dark:hover:bg-indigo-950/30 shadow-2xs"
            >
              <HandCoinsIcon className="size-4" />
              Demanar material
            </ButtonLink>
          </div>
        </div>
      </div>

      {pendingCounts && <PendingSummary counts={pendingCounts} />}

      {hasSomethingOpen && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold tracking-tight text-foreground">Les meves gestions actives</h2>
            <Badge variant="secondary" className="text-xs font-medium">En curs</Badge>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {myIncidents.length > 0 && (
              <Card className="border-t-4 border-t-amber-500 shadow-xs">
                <CardHeader className="border-b bg-amber-500/5 dark:bg-amber-500/10">
                  <CardTitle className="flex items-center gap-2 text-base font-semibold text-amber-950 dark:text-amber-100">
                    <TicketIcon className="size-4 text-amber-600 dark:text-amber-400" />
                    <span>Les meves incidències obertes</span>
                  </CardTitle>
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
              <Card className="border-t-4 border-t-indigo-500 shadow-xs">
                <CardHeader className="border-b bg-indigo-500/5 dark:bg-indigo-500/10">
                  <CardTitle className="flex items-center gap-2 text-base font-semibold text-indigo-950 dark:text-indigo-100">
                    <PackageIcon className="size-4 text-indigo-600 dark:text-indigo-400" />
                    <span>El meu material en préstec</span>
                  </CardTitle>
                </CardHeader>
                <ul className="flex flex-col divide-y px-(--card-spacing)">
                  {myLoans.map((loan) => (
                    <li key={loan.id} className="flex items-center justify-between gap-3 py-2">
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium">
                          {inventoryItemName(loan.item)}
                        </span>
                        <span className="block text-xs text-muted-foreground">
                          Fins al {formatDate(loan.endDate)}
                        </span>
                      </span>
                      <Badge variant={loan.status === "APROVADA" ? "success" : "warning"}>
                        {loan.status === "APROVADA" ? "El tens tu" : "Pendent"}
                      </Badge>
                    </li>
                  ))}
                </ul>
              </Card>
            )}

            {myKeys.length > 0 && (
              <Card className="border-t-4 border-t-amber-600 shadow-xs">
                <CardHeader className="border-b bg-amber-500/5 dark:bg-amber-500/10">
                  <CardTitle className="text-base font-semibold text-amber-950 dark:text-amber-100">
                    Claus que tens
                  </CardTitle>
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

            {myReservations.length > 0 && (
              <Card className="border-t-4 border-t-sky-500 shadow-xs">
                <CardHeader className="border-b bg-sky-500/5 dark:bg-sky-500/10">
                  <CardTitle className="flex items-center gap-2 text-base font-semibold text-sky-950 dark:text-sky-100">
                    <LaptopIcon className="size-4 text-sky-600 dark:text-sky-400" />
                    <span>Les meves reserves de carros</span>
                  </CardTitle>
                </CardHeader>
                <ul className="flex flex-col divide-y px-(--card-spacing)">
                  {myReservations.map((reservation) => (
                    <li key={reservation.id}>
                      <Link
                        href={
                          `/chromebooks/${reservation.cart.id}?week=${toDateParam(startOfWeek(reservation.startDate))}` as Route
                        }
                        className="-mx-2 block rounded-md px-2 py-2 hover:bg-muted"
                      >
                        <span className="block truncate text-sm font-medium">{reservation.cart.name}</span>
                        <span className="block text-xs text-muted-foreground">
                          {formatDateTimeFull(reservation.startDate)} – {formatTime(reservation.endDate)}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </Card>
            )}

            {myDeviceReservations.length > 0 && (
              <Card className="border-t-4 border-t-cyan-500 shadow-xs">
                <CardHeader className="border-b bg-cyan-500/5 dark:bg-cyan-500/10">
                  <CardTitle className="text-base font-semibold text-cyan-950 dark:text-cyan-100">
                    Els equips que tens reservats
                  </CardTitle>
                  <CardDescription>Quan el tornis al carro, marca&apos;l com a tornat.</CardDescription>
                </CardHeader>
                <ul className="flex flex-col divide-y px-(--card-spacing)">
                  {myDeviceReservations.map(({ chromebook, ...row }) => {
                    const view = reservationView(row, { id: user.id, admin: false }, now);
                    return (
                      <li key={view.id} className="flex items-center justify-between gap-3 py-2">
                        <Link
                          href={(chromebook.cart ? `/chromebooks/${chromebook.cart.id}` : "/chromebooks") as Route}
                          className="min-w-0 hover:underline"
                        >
                          <span className="block truncate text-sm font-medium">
                            {deviceTypeLabels[chromebook.deviceType]} {chromebook.assetTag}
                            {chromebook.cart && ` · ${chromebook.cart.name}`}
                          </span>
                          <span
                            className={
                              view.overdue ? "block text-xs text-destructive" : "block text-xs text-muted-foreground"
                            }
                          >
                            {view.held
                              ? view.overdue
                                ? `L'havies de tornar ${dueLabel(view.endDate, now)}`
                                : `El tens tu, fins ${dueLabel(view.endDate, now)}`
                              : `${dayLabel(view.startDate)} · ${bookingSpanLabel(view)}`}
                          </span>
                        </Link>
                        <DeviceReservationAction reservation={view} />
                      </li>
                    );
                  })}
                </ul>
              </Card>
            )}

            {myAppointments.length > 0 && (
              <Card className="border-t-4 border-t-purple-500 shadow-xs">
                <CardHeader className="border-b bg-purple-500/5 dark:bg-purple-500/10">
                  <CardTitle className="flex items-center gap-2 text-base font-semibold text-purple-950 dark:text-purple-100">
                    <CalendarCheckIcon className="size-4 text-purple-600 dark:text-purple-400" />
                    <span>Les meves cites</span>
                  </CardTitle>
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
                          {appointment.slot.coordinator
                            ? ` · amb ${appointment.slot.coordinator.name ?? appointment.slot.coordinator.email}`
                            : ""}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </Card>
            )}

            {hasStudentDevices && (
              <Card className="border-t-4 border-t-emerald-500 shadow-xs">
                <CardHeader className="border-b bg-emerald-500/5 dark:bg-emerald-500/10">
                  <CardTitle className="flex items-center gap-2 text-base font-semibold text-emerald-950 dark:text-emerald-100">
                    <BackpackIcon className="size-4 text-emerald-600 dark:text-emerald-400" />
                    <span>Chromebooks per a l&apos;alumnat</span>
                  </CardTitle>
                </CardHeader>
                <Link
                  href="/alumnat"
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
                  {toCollectStudentDevices > 0 && (
                    <span>
                      {toCollectStudentDevices}{" "}
                      {toCollectStudentDevices === 1
                        ? "equip aprovat per recollir"
                        : "equips aprovats per recollir"}
                    </span>
                  )}
                  {deliveredStudentDevices > 0 && (
                    <span>
                      {deliveredStudentDevices}{" "}
                      {deliveredStudentDevices === 1
                        ? "equip a casa del teu alumnat"
                        : "equips a casa del teu alumnat"}
                    </span>
                  )}
                </Link>
              </Card>
            )}
          </div>
        </div>
      )}

      <div className="space-y-3">
        <div>
          <h2 className="text-base font-semibold tracking-tight text-foreground">Mòduls i serveis</h2>
          <p className="text-xs text-muted-foreground">Accedeix a totes les eines de gestió i coordinació TIC.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {MODULE_CARDS.filter((item) => !item.tutorsOnly || user.isTutor).map((item) => {
            const Icon = item.icon;
            const { title, description } = !coordinator && item.professor ? item.professor : item;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="group rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                <Card
                  className={cn(
                    "flex h-full flex-col transition-shadow duration-200 group-hover:shadow-sm motion-reduce:transition-none",
                    item.accentBorder,
                  )}
                >
                  <CardHeader className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <div
                        className={cn(
                          "flex size-10 items-center justify-center rounded-xl border",
                          item.iconBoxClasses,
                        )}
                      >
                        <Icon className="size-5" aria-hidden="true" />
                      </div>
                      <span aria-hidden="true" className="text-muted-foreground/60 transition-colors group-hover:text-primary group-focus-visible:text-primary">
                        →
                      </span>
                    </div>
                    <div>
                      <CardTitle className="text-base font-semibold transition-colors group-hover:text-primary group-focus-visible:text-primary">
                        {title}
                      </CardTitle>
                      <CardDescription className="mt-1 text-sm leading-relaxed text-muted-foreground">
                        {description}
                      </CardDescription>
                    </div>
                  </CardHeader>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
