import type { Route } from "next";
import Link from "next/link";
import { CalendarIcon, ChevronLeftIcon, ChevronRightIcon } from "lucide-react";

import { db } from "@/lib/db";
import {
  addDays,
  formatDateTime,
  formatDayDate,
  formatDayDateLong,
  formatShortDate,
  formatTime,
  formatWeekdayShort,
  isSameDay,
  madridDateKey,
  SCHOOL_TIME_ZONE,
  startOfWeek,
  toDateParam,
  zonedDateTime,
} from "@/lib/date";
import { requireKeyAccess } from "@/lib/permissions";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button-link";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const metadata = { title: "Historial de claus" };

/** Quant de temps ha estat fora, en un format llegible d'un cop d'ull. */
function duration(from: Date, to: Date) {
  const minutes = Math.round((to.getTime() - from.getTime()) / 60_000);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours < 24) return rest ? `${hours} h ${rest} min` : `${hours} h`;
  return `${Math.floor(hours / 24)} d ${hours % 24} h`;
}

export default async function HistorialPage({
  searchParams,
}: PageProps<"/consergeria/historial">) {
  await requireKeyAccess();
  const { clau, carro, professor, setmana, week, dia, day } = await searchParams;

  const now = new Date();
  const currentWeekStart = startOfWeek(now);

  // Comprovem si s'ha demanat un dia concret ("YYYY-MM-DD")
  const requestedDayStr = typeof dia === "string" ? dia : typeof day === "string" ? day : null;
  const parsedDay = requestedDayStr ? new Date(requestedDayStr) : null;
  const validDay = parsedDay && !Number.isNaN(parsedDay.getTime()) ? parsedDay : null;

  let activeDay: Date | null = null;
  let weekStart: Date;

  if (validDay) {
    const dayKey = madridDateKey(validDay);
    activeDay = zonedDateTime(dayKey, "00:00");
    weekStart = startOfWeek(activeDay);
  } else {
    const requestedWeek =
      typeof setmana === "string"
        ? new Date(setmana)
        : typeof week === "string"
          ? new Date(week)
          : null;
    weekStart =
      requestedWeek && !Number.isNaN(requestedWeek.getTime())
        ? startOfWeek(requestedWeek)
        : currentWeekStart;
  }

  const weekEnd = addDays(weekStart, 7);
  const isCurrentWeek = isSameDay(weekStart, currentWeekStart);
  const isCurrentDay = activeDay ? isSameDay(activeDay, now) : false;

  const periodStart = activeDay ?? weekStart;
  const periodEnd = activeDay ? addDays(activeDay, 1) : weekEnd;

  const prevWeek = toDateParam(addDays(weekStart, -7));
  const nextWeek = toDateParam(addDays(weekStart, 7));
  const currentWeekParam = toDateParam(currentWeekStart);

  const prevDay = activeDay ? toDateParam(addDays(activeDay, -1)) : null;
  const nextDay = activeDay ? toDateParam(addDays(activeDay, 1)) : null;
  const todayParam = toDateParam(now);

  const rangeLabel = `${formatShortDate(weekStart)} – ${formatShortDate(addDays(weekStart, 6))}`;

  // Els 7 dies de la setmana per al selector
  const weekDays = [0, 1, 2, 3, 4, 5, 6].map((offset) => {
    const d = addDays(weekStart, offset);
    const key = toDateParam(d);
    return {
      date: d,
      key,
      isSelected: activeDay ? isSameDay(d, activeDay) : false,
      isToday: isSameDay(d, now),
      shortLabel: formatWeekdayShort(d),
      dayNumber: d.toLocaleDateString("ca-ES", {
        day: "numeric",
        timeZone: SCHOOL_TIME_ZONE,
      }),
    };
  });

  // Filtre del període actiu (setmana sencera o dia concret)
  const periodWhere = {
    deliveredAt: { gte: periodStart, lt: periodEnd },
    ...(typeof clau === "string" ? { keyId: clau } : {}),
    ...(typeof carro === "string" ? { key: { cartId: carro } } : {}),
  };

  // Només el professorat que té algun préstec en aquesta setmana o en aquest dia.
  // Els que no han tingut cap préstec no apareixen.
  const affectedTeachers = await db.user.findMany({
    where: {
      keyLoans: {
        some: periodWhere,
      },
    },
    orderBy: { name: "asc" },
    select: { id: true, name: true, email: true },
  });

  const isTeacherActive =
    typeof professor === "string" && affectedTeachers.some((t) => t.id === professor);
  const activeTeacherId = isTeacherActive ? professor : undefined;

  const where = {
    ...periodWhere,
    ...(activeTeacherId ? { borrowerId: activeTeacherId } : {}),
  };

  const [loans, keys] = await Promise.all([
    db.keyLoan.findMany({
      where,
      include: {
        key: { include: { cart: true } },
        borrower: true,
        deliveredBy: true,
        returnedBy: true,
        reservation: true,
      },
      orderBy: { deliveredAt: "desc" },
    }),
    db.key.findMany({ orderBy: { number: "asc" }, include: { cart: true } }),
  ]);

  function href(next: {
    clau?: string;
    professor?: string;
    setmana?: string;
    dia?: string;
  }): Route {
    const params = new URLSearchParams();
    const nextKey = next.clau !== undefined ? next.clau : typeof clau === "string" ? clau : "";
    const isChangingDate = next.setmana !== undefined || next.dia !== undefined;

    // Quan es canvia de dia o de setmana, es reseteja el filtre de professor llevat que s'especifiqui
    const nextTeacher =
      next.professor !== undefined
        ? next.professor
        : isChangingDate
          ? ""
          : (activeTeacherId ?? "");

    const nextDia =
      next.dia !== undefined
        ? next.dia
        : next.setmana !== undefined
          ? ""
          : activeDay
            ? toDateParam(activeDay)
            : "";

    let nextWeek = "";
    if (next.setmana !== undefined) {
      nextWeek = next.setmana;
    } else if (next.dia !== undefined) {
      if (next.dia) {
        const d = new Date(next.dia);
        if (!Number.isNaN(d.getTime())) {
          nextWeek = toDateParam(startOfWeek(d));
        }
      } else {
        nextWeek = toDateParam(weekStart);
      }
    } else if (!isCurrentWeek || activeDay) {
      nextWeek = toDateParam(weekStart);
    }

    if (nextKey) params.set("clau", nextKey);
    if (nextTeacher) params.set("professor", nextTeacher);
    if (nextWeek) params.set("setmana", nextWeek);
    if (nextDia) params.set("dia", nextDia);
    if (typeof carro === "string") params.set("carro", carro);

    const query = params.toString();
    return (query
      ? `/consergeria/historial?${query}`
      : "/consergeria/historial") as Route;
  }

  const filteredCart = typeof carro === "string" ? keys.find((k) => k.cartId === carro)?.cart : null;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/consergeria" className="text-sm text-muted-foreground hover:underline">
          &larr; Consergeria
        </Link>
        <h1 className="mt-2 text-2xl font-semibold">
          {filteredCart ? `Historial de claus: ${filteredCart.name}` : "Historial de claus"}
        </h1>
        <p className="text-muted-foreground">
          Qui s&apos;ha endut cada clau i quan. Una reserva diu qui tenia dret al carro; que se
          n&apos;entregués la clau confirma que se&apos;l va endur de debò.
        </p>
      </div>

      {/* Targeta de navegació: Setmana i Dies */}
      <div className="flex flex-col gap-3 rounded-lg border bg-muted/30 p-3">
        {/* Fila 1: Navegació de setmana */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <ButtonLink
              variant="outline"
              size="sm"
              href={href({ setmana: prevWeek })}
              aria-label="Setmana anterior"
            >
              <ChevronLeftIcon className="size-4" />
              <span className="hidden sm:inline">Setmana anterior</span>
            </ButtonLink>
            <div className="flex items-center gap-2 px-1 text-sm font-semibold">
              <CalendarIcon className="size-4 text-muted-foreground" />
              <span>{rangeLabel}</span>
              {isCurrentWeek && (
                <Badge variant="secondary" className="text-xs">
                  Aquesta setmana
                </Badge>
              )}
            </div>
            <ButtonLink
              variant="outline"
              size="sm"
              href={href({ setmana: nextWeek })}
              aria-label="Setmana següent"
            >
              <span className="hidden sm:inline">Setmana següent</span>
              <ChevronRightIcon className="size-4" />
            </ButtonLink>
          </div>
          {(!isCurrentWeek || activeDay) && (
            <ButtonLink
              variant="outline"
              size="sm"
              href={href({ setmana: currentWeekParam, dia: "" })}
              className="text-xs"
            >
              Torna a aquesta setmana
            </ButtonLink>
          )}
        </div>

        {/* Fila 2: Selector de dies (Dl a Dg) */}
        <div className="flex flex-wrap items-center gap-1.5 border-t pt-2.5">
          <ButtonLink
            size="sm"
            variant={!activeDay ? "default" : "outline"}
            current={!activeDay}
            href={href({ dia: "" })}
            className="text-xs font-medium"
          >
            Tota la setmana
          </ButtonLink>
          {weekDays.map((day) => (
            <ButtonLink
              key={day.key}
              size="sm"
              variant={day.isSelected ? "default" : "outline"}
              current={day.isSelected}
              href={href({ dia: day.key })}
              className={cn(
                "text-xs font-medium",
                day.isToday && !day.isSelected && "border-primary/50 text-foreground font-semibold",
              )}
            >
              <span>{day.shortLabel}</span>
              <span className="ml-1">{day.dayNumber}</span>
              {day.isToday && (
                <span
                  className={cn(
                    "ml-1 rounded px-1 py-0.2 text-[10px] uppercase font-bold",
                    day.isSelected
                      ? "bg-primary-foreground/20 text-primary-foreground"
                      : "bg-primary/10 text-primary",
                  )}
                >
                  avui
                </span>
              )}
            </ButtonLink>
          ))}
        </div>

        {/* Fila 3: Si hi ha un dia seleccionat, navegació de dia concret */}
        {activeDay && (
          <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-2.5">
            <div className="flex items-center gap-2">
              <ButtonLink
                variant="ghost"
                size="sm"
                href={href({ dia: prevDay! })}
                aria-label="Dia anterior"
                className="h-7 px-2 text-xs"
              >
                <ChevronLeftIcon className="mr-1 size-3.5" />
                Dia anterior
              </ButtonLink>
              <div className="flex items-center gap-2 px-1 text-sm font-semibold">
                <span>{formatDayDateLong(activeDay)}</span>
                {isCurrentDay && (
                  <Badge variant="secondary" className="text-xs">
                    Avui
                  </Badge>
                )}
              </div>
              <ButtonLink
                variant="ghost"
                size="sm"
                href={href({ dia: nextDay! })}
                aria-label="Dia següent"
                className="h-7 px-2 text-xs"
              >
                Dia següent
                <ChevronRightIcon className="ml-1 size-3.5" />
              </ButtonLink>
            </div>
            {!isCurrentDay && (
              <ButtonLink
                variant="ghost"
                size="sm"
                href={href({ dia: todayParam })}
                className="h-7 text-xs text-muted-foreground hover:text-foreground"
              >
                Ves a avui
              </ButtonLink>
            )}
          </div>
        )}
      </div>

      {/* Filtres per clau */}
      <div className="flex flex-wrap items-center gap-2">
        <ButtonLink
          size="sm"
          variant={!clau && !activeTeacherId ? "default" : "outline"}
          current={!clau && !activeTeacherId}
          href={href({ clau: "", professor: "" })}
        >
          Tot
        </ButtonLink>
        {keys.map((key) => (
          <ButtonLink
            key={key.id}
            size="sm"
            variant={clau === key.id ? "default" : "outline"}
            current={clau === key.id}
            href={href({ clau: clau === key.id ? "" : key.id })}
          >
            {key.number}
          </ButtonLink>
        ))}
      </div>

      {/* Filtres per professor: només els que han tingut préstec en aquest període */}
      {affectedTeachers.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted-foreground">Professorat:</span>
          {affectedTeachers.map((teacher) => (
            <ButtonLink
              key={teacher.id}
              size="sm"
              variant={activeTeacherId === teacher.id ? "default" : "outline"}
              current={activeTeacherId === teacher.id}
              href={href({ professor: activeTeacherId === teacher.id ? "" : teacher.id })}
            >
              {teacher.name ?? teacher.email}
            </ButtonLink>
          ))}
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border bg-background">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Clau</TableHead>
              <TableHead>Se l&apos;ha endut</TableHead>
              <TableHead>Entregada</TableHead>
              <TableHead>Tornada</TableHead>
              <TableHead>Fora</TableHead>
              <TableHead>Entregada per</TableHead>
              <TableHead>Recollida per</TableHead>
              <TableHead>Reserva</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loans.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="py-10 text-center text-muted-foreground">
                  {activeDay
                    ? "No hi ha cap préstec registrat aquest dia amb aquest filtre."
                    : "No hi ha cap préstec registrat aquesta setmana amb aquest filtre."}
                </TableCell>
              </TableRow>
            )}
            {loans.map((loan) => (
              <TableRow key={loan.id}>
                <TableCell className="font-medium">
                  {loan.key.number}
                  <div className="text-xs text-muted-foreground">
                    {loan.key.cart?.name ?? loan.key.name}
                  </div>
                </TableCell>
                <TableCell>{loan.borrower.name ?? loan.borrower.email}</TableCell>
                <TableCell className="text-muted-foreground">
                  {formatDateTime(loan.deliveredAt)}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {loan.returnedAt ? formatDateTime(loan.returnedAt) : "—"}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {loan.returnedAt ? (
                    duration(loan.deliveredAt, loan.returnedAt)
                  ) : (
                    <Badge variant="destructive">Encara fora</Badge>
                  )}
                </TableCell>
                <TableCell className="text-muted-foreground">{loan.deliveredBy.name}</TableCell>
                <TableCell className="text-muted-foreground">
                  {loan.returnedBy?.name ?? "—"}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {loan.reservation ? (
                    <>
                      {formatTime(loan.reservation.startDate)}–
                      {formatTime(loan.reservation.endDate)}
                    </>
                  ) : (
                    <Badge variant="outline">
                      Sense reserva{loan.reason ? `: ${loan.reason}` : ""}
                    </Badge>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <p className="text-xs text-muted-foreground">
        {loans.length} {loans.length === 1 ? "préstec registrat" : "préstecs registrats"}{" "}
        {activeDay
          ? `el ${formatDayDate(activeDay)}.`
          : isCurrentWeek
            ? "aquesta setmana."
            : `la setmana del ${formatShortDate(weekStart)} al ${formatShortDate(addDays(weekStart, 6))}.`}
      </p>
    </div>
  );
}
