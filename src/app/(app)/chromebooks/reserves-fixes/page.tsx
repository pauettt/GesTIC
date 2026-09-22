import type { RecurringReservationStatus } from "@prisma/client";
import Link from "next/link";

import { db } from "@/lib/db";
import { formatDate } from "@/lib/date";
import { isAdmin, requireUser } from "@/lib/permissions";
import { courseEndLabel, occurrences, recurringCourse, shortDay, slotLabel } from "@/lib/recurring-reservations";
import { CancelRecurringButton, DecideRecurringButtons } from "@/components/chromebooks/recurring-reservations";
import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = { title: "Reserves fixes" };

const who = (user: { name: string | null; email: string }) => user.name ?? user.email;

const statusBadges: Record<RecurringReservationStatus, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  PENDENT: { label: "Pendent d'aprovar", variant: "default" },
  APROVADA: { label: "Aprovada", variant: "secondary" },
  REBUTJADA: { label: "No aprovada", variant: "destructive" },
  CANCELLADA: { label: "Anul·lada", variant: "outline" },
};

const recurringInclude = {
  user: { select: { name: true, email: true } },
  cart: { select: { id: true, name: true } },
} as const;

/** Les setmanes que queden que ja té reservades algú altre: en aprovar-la, es respectaran. */
async function weeksTakenByOthers(recurring: {
  cartId: string;
  userId: string;
  weekday: number;
  periodId: number;
  schoolYear: string;
}) {
  const weeks = occurrences(recurring.weekday, recurring.periodId, recurring.schoolYear);
  const booked = await db.reservation.findMany({
    where: {
      cartId: recurring.cartId,
      status: "CONFIRMADA",
      userId: { not: recurring.userId },
      startDate: { in: weeks.map((week) => week.startDate) },
    },
    select: { startDate: true },
  });
  const taken = new Set(booked.map((reservation) => reservation.startDate.getTime()));
  return weeks.filter((week) => taken.has(week.startDate.getTime())).map((week) => shortDay(week.dateKey));
}

/**
 * Les reserves fixes de carros: la coordinació hi decideix les pendents i hi
 * veu totes les aprovades del curs; el professorat, les seves. Es demanen des de
 * la pàgina de cada carro.
 */
export default async function RecurringReservationsPage() {
  const user = await requireUser();
  const admin = isAdmin(user.role);
  const course = recurringCourse();

  const [pending, approved, mine] = await Promise.all([
    admin
      ? db.recurringReservation.findMany({
          where: { status: "PENDENT" },
          include: recurringInclude,
          orderBy: { createdAt: "asc" },
        })
      : Promise.resolve([]),
    admin
      ? db.recurringReservation.findMany({
          where: { status: "APROVADA", schoolYear: course.schoolYear },
          include: recurringInclude,
          orderBy: [{ cart: { name: "asc" } }, { weekday: "asc" }, { periodId: "asc" }],
        })
      : Promise.resolve([]),
    admin
      ? Promise.resolve([])
      : db.recurringReservation.findMany({
          where: { userId: user.id, schoolYear: course.schoolYear },
          include: recurringInclude,
          orderBy: { createdAt: "desc" },
        }),
  ]);
  const pendingWithConflicts = await Promise.all(
    pending.map(async (recurring) => ({
      recurring,
      skipped: await weeksTakenByOthers(recurring),
      // Si ja és fixa d'algú altre, no es pot aprovar: cal dir-ho abans de provar-ho.
      takenBy: approved.find(
        (other) =>
          other.cartId === recurring.cartId &&
          other.weekday === recurring.weekday &&
          other.periodId === recurring.periodId &&
          other.schoolYear === recurring.schoolYear,
      ),
    })),
  );

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <div>
        <Link href="/chromebooks" className="text-sm text-muted-foreground hover:underline">
          &larr; Carros
        </Link>
        <h1 className="mt-2 text-2xl font-semibold">Reserves fixes</h1>
        <p className="text-muted-foreground">
          Un carro el mateix dia i la mateixa sessió cada setmana, fins al {courseEndLabel(course.schoolYear)}. Es
          demanen des de la pàgina de cada carro, amb el motiu, i les aprova la coordinació TIC.
        </p>
      </div>

      {admin && (
        <Card>
          <CardHeader className="border-b">
            <CardTitle className="text-base">Per aprovar</CardTitle>
          </CardHeader>
          {pendingWithConflicts.length === 0 ? (
            <p className="px-(--card-spacing) text-sm text-muted-foreground">No n&apos;hi ha cap de pendent.</p>
          ) : (
            <ul className="flex flex-col divide-y px-(--card-spacing)">
              {pendingWithConflicts.map(({ recurring, skipped, takenBy }) => (
                <li key={recurring.id} className="flex flex-wrap items-start justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="font-medium">
                      <Link href={`/chromebooks/${recurring.cart.id}`} className="hover:underline">
                        {recurring.cart.name}
                      </Link>{" "}
                      · {slotLabel(recurring.weekday, recurring.periodId)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {who(recurring.user)} · demanada el {formatDate(recurring.createdAt)} · curs {recurring.schoolYear}
                    </p>
                    <p className="text-sm">{recurring.purpose}</p>
                    {takenBy ? (
                      <p className="text-sm text-destructive">
                        Aquesta sessió ja és fixa de {who(takenBy.user)}: no es pot aprovar.
                      </p>
                    ) : (
                      skipped.length > 0 && (
                        <p className="text-sm text-amber-700 dark:text-amber-400">
                          {skipped.length === 1 ? "1 setmana ja la té" : `${skipped.length} setmanes ja les té`} algú
                          altre i es respectarà{skipped.length === 1 ? "" : "n"}: {skipped.join(", ")}.
                        </p>
                      )
                    )}
                  </div>
                  <DecideRecurringButtons id={recurring.id} skipped={skipped} />
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}

      {admin && (
        <Card>
          <CardHeader className="border-b">
            <CardTitle className="text-base">Aprovades del curs {course.schoolYear}</CardTitle>
            <CardDescription>Cada setmana es pot alliberar sola des de la graella del carro.</CardDescription>
          </CardHeader>
          {approved.length === 0 ? (
            <p className="px-(--card-spacing) text-sm text-muted-foreground">Encara no n&apos;hi ha cap.</p>
          ) : (
            <ul className="flex flex-col divide-y px-(--card-spacing)">
              {approved.map((recurring) => (
                <li key={recurring.id} className="flex flex-wrap items-start justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="font-medium">
                      <Link href={`/chromebooks/${recurring.cart.id}`} className="hover:underline">
                        {recurring.cart.name}
                      </Link>{" "}
                      · {slotLabel(recurring.weekday, recurring.periodId)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {who(recurring.user)} · {recurring.purpose}
                    </p>
                  </div>
                  <CancelRecurringButton id={recurring.id} approved mine={recurring.userId === user.id} />
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}

      {!admin && (
        <Card>
          <CardHeader className="border-b">
            <CardTitle className="text-base">Les teves reserves fixes del curs {course.schoolYear}</CardTitle>
          </CardHeader>
          {mine.length === 0 ? (
            <p className="px-(--card-spacing) text-sm text-muted-foreground">
              No n&apos;has demanat cap. Entra a un carro i prem «Demana una reserva fixa».
            </p>
          ) : (
            <ul className="flex flex-col divide-y px-(--card-spacing)">
              {mine.map((recurring) => (
                <li key={recurring.id} className="flex flex-wrap items-start justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-2 font-medium">
                      <span>
                        <Link href={`/chromebooks/${recurring.cart.id}`} className="hover:underline">
                          {recurring.cart.name}
                        </Link>{" "}
                        · {slotLabel(recurring.weekday, recurring.periodId)}
                      </span>
                      <Badge variant={statusBadges[recurring.status].variant}>
                        {statusBadges[recurring.status].label}
                      </Badge>
                    </p>
                    <p className="text-sm text-muted-foreground">{recurring.purpose}</p>
                    {recurring.responseNote && (
                      <p className="text-sm">Nota de la coordinació: {recurring.responseNote}</p>
                    )}
                  </div>
                  {(recurring.status === "PENDENT" || recurring.status === "APROVADA") && (
                    <CancelRecurringButton id={recurring.id} approved={recurring.status === "APROVADA"} mine />
                  )}
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}
    </div>
  );
}
