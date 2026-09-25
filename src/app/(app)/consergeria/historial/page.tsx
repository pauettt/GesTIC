import type { Route } from "next";
import Link from "next/link";
import { CalendarIcon, ChevronLeftIcon, ChevronRightIcon } from "lucide-react";

import { db } from "@/lib/db";
import {
  addDays,
  formatDateTime,
  formatShortDate,
  formatTime,
  isSameDay,
  startOfWeek,
  toDateParam,
} from "@/lib/date";
import { requireKeyAccess } from "@/lib/permissions";
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
  const { clau, carro, professor, setmana, week } = await searchParams;

  const now = new Date();
  const currentWeekStart = startOfWeek(now);
  const requestedWeek =
    typeof setmana === "string"
      ? new Date(setmana)
      : typeof week === "string"
        ? new Date(week)
        : null;
  const weekStart =
    requestedWeek && !Number.isNaN(requestedWeek.getTime())
      ? startOfWeek(requestedWeek)
      : currentWeekStart;
  const weekEnd = addDays(weekStart, 7);
  const isCurrentWeek = isSameDay(weekStart, currentWeekStart);

  const prevWeek = toDateParam(addDays(weekStart, -7));
  const nextWeek = toDateParam(addDays(weekStart, 7));
  const currentWeekParam = toDateParam(currentWeekStart);

  const rangeLabel = `${formatShortDate(weekStart)} – ${formatShortDate(addDays(weekStart, 6))}`;

  const where = {
    deliveredAt: { gte: weekStart, lt: weekEnd },
    ...(typeof clau === "string" ? { keyId: clau } : {}),
    ...(typeof carro === "string" ? { key: { cartId: carro } } : {}),
    ...(typeof professor === "string" ? { borrowerId: professor } : {}),
  };

  const [loans, keys, teachers] = await Promise.all([
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
    db.user.findMany({
      where: { keyLoans: { some: {} } },
      orderBy: { name: "asc" },
      select: { id: true, name: true, email: true },
    }),
  ]);

  function href(next: { clau?: string; professor?: string; setmana?: string }): Route {
    const params = new URLSearchParams();
    const nextKey = next.clau !== undefined ? next.clau : typeof clau === "string" ? clau : "";
    const nextTeacher =
      next.professor !== undefined ? next.professor : typeof professor === "string" ? professor : "";
    const nextWeek =
      next.setmana !== undefined
        ? next.setmana
        : typeof setmana === "string"
          ? setmana
          : typeof week === "string"
            ? week
            : !isCurrentWeek
              ? toDateParam(weekStart)
              : "";
    if (nextKey) params.set("clau", nextKey);
    if (nextTeacher) params.set("professor", nextTeacher);
    if (nextWeek) params.set("setmana", nextWeek);
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

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-muted/30 p-2.5">
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
        {!isCurrentWeek && (
          <ButtonLink
            variant="outline"
            size="sm"
            href={href({ setmana: currentWeekParam })}
            className="text-xs"
          >
            Torna a aquesta setmana
          </ButtonLink>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <ButtonLink
          size="sm"
          variant={!clau && !professor ? "default" : "outline"}
          current={!clau && !professor}
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
            href={href({ clau: key.id })}
          >
            {key.number}
          </ButtonLink>
        ))}
      </div>

      {teachers.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted-foreground">Professorat:</span>
          {teachers.map((teacher) => (
            <ButtonLink
              key={teacher.id}
              size="sm"
              variant={professor === teacher.id ? "default" : "outline"}
              current={professor === teacher.id}
              href={href({ professor: teacher.id })}
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
                  No hi ha cap préstec registrat aquesta setmana amb aquest filtre.
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
        {loans.length} {loans.length === 1 ? "préstec registrat" : "préstecs registrats"} aquesta setmana.
      </p>
    </div>
  );
}
