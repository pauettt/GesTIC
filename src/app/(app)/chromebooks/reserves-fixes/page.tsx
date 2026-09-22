import Link from "next/link";

import { db } from "@/lib/db";
import { formatDate, madridDateKey } from "@/lib/date";
import { recurringReservationStatusLabels, recurringReservationStatusVariants } from "@/lib/labels";
import { isAdmin, requireUser } from "@/lib/permissions";
import {
  courseDays,
  courseEndLabel,
  occurrences,
  recurringCourse,
  shortDay,
  slotLabel,
} from "@/lib/recurring-reservations";
import { RecurringHistory, type RecurringHistoryRow } from "@/components/chromebooks/recurring-history";
import { CancelRecurringButton, DecideRecurringButtons } from "@/components/chromebooks/recurring-reservations";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = { title: "Reserves fixes" };

const who = (user: { name: string | null; email: string }) => user.name ?? user.email;

const recurringInclude = {
  user: { select: { name: true, email: true } },
  cart: { select: { id: true, name: true } },
  respondedBy: { select: { name: true, email: true } },
  cancelledBy: { select: { name: true, email: true } },
} as const;

/**
 * Quantes setmanes de cada reserva fixa ja s'han fet, quantes queden i quantes
 * s'han alliberat, soles o en anul·lar-la sencera.
 */
async function weeksOf(ids: string[], now: Date) {
  const reservations = await db.reservation.findMany({
    where: { recurringId: { in: ids } },
    select: { recurringId: true, status: true, endDate: true },
  });
  const weeks = new Map<string, RecurringHistoryRow["weeks"]>();
  for (const reservation of reservations) {
    if (!reservation.recurringId) continue;
    const counts = weeks.get(reservation.recurringId) ?? { done: 0, upcoming: 0, freed: 0 };
    if (reservation.status === "CANCELLADA") counts.freed += 1;
    else if (reservation.endDate < now) counts.done += 1;
    else counts.upcoming += 1;
    weeks.set(reservation.recurringId, counts);
  }
  return weeks;
}

/** «12 setmanes fetes, 26 per venir». */
function weekCountLabel(counts: RecurringHistoryRow["weeks"] | undefined) {
  const { done, upcoming } = counts ?? { done: 0, upcoming: 0 };
  return `${done} ${done === 1 ? "setmana feta" : "setmanes fetes"}, ${upcoming} per venir`;
}

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
 * Les reserves fixes de carros: la coordinació hi decideix les pendents i en té
 * l'historial sencer, des d'on anul·la les aprovades quan vol; el professorat hi
 * veu les seves i les pot retirar o anul·lar. Es demanen des de la pàgina de
 * cada carro.
 */
export default async function RecurringReservationsPage() {
  const user = await requireUser();
  const admin = isAdmin(user.role);
  const now = new Date();
  const course = recurringCourse(now);

  const [pending, decided, mine] = await Promise.all([
    admin
      ? db.recurringReservation.findMany({
          where: { status: "PENDENT" },
          include: recurringInclude,
          orderBy: { createdAt: "asc" },
        })
      : Promise.resolve([]),
    // L'historial: totes les decidides, de tots els cursos. No se n'esborra cap.
    admin
      ? db.recurringReservation.findMany({
          where: { status: { not: "PENDENT" } },
          include: recurringInclude,
          orderBy: { createdAt: "desc" },
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
  const approved = decided.filter((recurring) => recurring.status === "APROVADA");
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
  const weeks = await weeksOf([...decided, ...mine].map((recurring) => recurring.id), now);
  const today = madridDateKey(now);
  const history: RecurringHistoryRow[] = decided.map((recurring) => {
    const counts = weeks.get(recurring.id) ?? { done: 0, upcoming: 0, freed: 0 };
    return {
      id: recurring.id,
      cartId: recurring.cart.id,
      cartName: recurring.cart.name,
      slot: slotLabel(recurring.weekday, recurring.periodId),
      who: who(recurring.user),
      purpose: recurring.purpose,
      status: recurring.status,
      schoolYear: recurring.schoolYear,
      createdAt: recurring.createdAt,
      respondedAt: recurring.respondedAt,
      respondedByName: recurring.respondedBy ? who(recurring.respondedBy) : null,
      responseNote: recurring.responseNote,
      cancelledAt: recurring.cancelledAt,
      cancelledByName: recurring.cancelledBy ? who(recurring.cancelledBy) : null,
      weeks: counts,
      // Un cop passat el 30 de juny, ja no hi ha res a anul·lar.
      cancellable: recurring.status === "APROVADA" && courseDays(recurring.schoolYear).lastDay >= today,
      mine: recurring.userId === user.id,
    };
  });

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

      {admin && <RecurringHistory rows={history} currentSchoolYear={course.schoolYear} />}

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
                      <Badge variant={recurringReservationStatusVariants[recurring.status]}>
                        {recurringReservationStatusLabels[recurring.status]}
                      </Badge>
                    </p>
                    <p className="text-sm text-muted-foreground">{recurring.purpose}</p>
                    {recurring.responseNote && (
                      <p className="text-sm">Nota de la coordinació: {recurring.responseNote}</p>
                    )}
                    {recurring.status === "APROVADA" && (
                      <p className="text-xs text-muted-foreground">
                        {weekCountLabel(weeks.get(recurring.id))}
                      </p>
                    )}
                    {recurring.status === "CANCELLADA" && recurring.cancelledAt && (
                      <p className="text-xs text-muted-foreground">
                        {recurring.respondedAt ? "Anul·lada" : "Retirada"} el {formatDate(recurring.cancelledAt)}
                        {recurring.cancelledBy && recurring.cancelledById !== user.id
                          ? ` per ${who(recurring.cancelledBy)}, de la coordinació TIC`
                          : ""}
                      </p>
                    )}
                  </div>
                  {(recurring.status === "PENDENT" ||
                    (recurring.status === "APROVADA" && courseDays(recurring.schoolYear).lastDay >= today)) && (
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
