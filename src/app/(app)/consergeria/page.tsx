import Link from "next/link";
import { KeyRoundIcon, SettingsIcon } from "lucide-react";

import { db } from "@/lib/db";
import { formatDateTime, formatTime, madridDateKey } from "@/lib/date";
import { dueAt, KEY_GRACE_MINUTES } from "@/lib/keys";
import { requireKeyAccess } from "@/lib/permissions";
import { DeliverKeyDialog } from "@/components/keys/deliver-key-dialog";
import { RemindKeyButton, ReturnKeyButton } from "@/components/keys/key-loan-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const metadata = { title: "Consergeria" };

export default async function ConsergeriaPage() {
  await requireKeyAccess();

  const now = new Date();
  const today = madridDateKey(now);

  const [reservations, openLoans, keys, concierges, teachers] = await Promise.all([
    db.reservation.findMany({
      where: { status: "CONFIRMADA" },
      include: { cart: { include: { keys: true } }, user: true },
      orderBy: { startDate: "asc" },
    }),
    db.keyLoan.findMany({
      where: { returnedAt: null },
      include: {
        key: { include: { cart: true } },
        borrower: true,
        deliveredBy: true,
        remindedBy: true,
        reservation: true,
      },
      orderBy: { deliveredAt: "asc" },
    }),
    db.key.findMany({
      include: { _count: { select: { loans: { where: { returnedAt: null } } } } },
      orderBy: { number: "asc" },
    }),
    db.concierge.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
    db.user.findMany({ where: { role: "PROFESSOR" }, orderBy: { name: "asc" } }),
  ]);

  const todayReservations = reservations.filter((r) => madridDateKey(r.startDate) === today);

  // Una clau ja entregada no s'ha de tornar a oferir per a la mateixa reserva.
  const deliveredReservationIds = new Set(
    openLoans.map((loan) => loan.reservationId).filter(Boolean),
  );

  /**
   * Quan compta com a no tornada. Amb reserva, 10 minuts després del final del
   * bloc d'hores seguides. Sense reserva no hi ha cap hora de referència, així
   * que es marca quan s'ha quedat fora d'un dia per l'altre.
   */
  function isLate(loan: (typeof openLoans)[number]) {
    if (loan.reservation) {
      const sameDay = reservations
        .filter(
          (r) =>
            r.cartId === loan.reservation!.cartId &&
            r.userId === loan.reservation!.userId &&
            madridDateKey(r.startDate) === madridDateKey(loan.reservation!.startDate),
        )
        .map((r) => ({ startDate: r.startDate, endDate: r.endDate }));
      return now > dueAt(loan.reservation, sameDay);
    }
    return madridDateKey(loan.deliveredAt) !== today;
  }

  const keyOptions = keys.map((key) => ({
    id: key.id,
    name: key.name,
    number: key.number,
    available: key.copies - key._count.loans,
  }));
  const teacherOptions = teachers.map((t) => ({ id: t.id, name: t.name ?? t.email }));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Consergeria</h1>
          <p className="text-muted-foreground">Control de les claus del centre.</p>
        </div>
        <div className="flex gap-2">
          <DeliverKeyDialog
            concierges={concierges}
            keys={keyOptions}
            teachers={teacherOptions}
            trigger={
              <Button variant="outline">
                <KeyRoundIcon className="size-4" />
                Entrega sense reserva
              </Button>
            }
          />
          <Button nativeButton={false} render={<Link href="/consergeria/claus" />}>
            <SettingsIcon className="size-4" />
            Gestiona les claus
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Claus fora</CardTitle>
          <CardDescription>
            Les que encara no han tornat al taulell. En vermell, les que ja haurien d&apos;haver
            tornat ({KEY_GRACE_MINUTES} minuts després de l&apos;última hora reservada).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Clau</TableHead>
                  <TableHead>La té</TableHead>
                  <TableHead>Des de</TableHead>
                  <TableHead>Entregada per</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {openLoans.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                      Totes les claus són al taulell.
                    </TableCell>
                  </TableRow>
                )}
                {openLoans.map((loan) => {
                  const late = isLate(loan);
                  return (
                    <TableRow key={loan.id} className={late ? "bg-destructive/5" : undefined}>
                      <TableCell className="font-medium">
                        {loan.key.number} — {loan.key.name}
                        {late && (
                          <Badge variant="destructive" className="ml-2">
                            Per tornar
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>{loan.borrower.name ?? loan.borrower.email}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDateTime(loan.deliveredAt)}
                        {!loan.reservation && (
                          <span className="ml-2 text-xs">
                            · sense reserva{loan.reason ? ` (${loan.reason})` : ""}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {loan.deliveredBy.name}
                        {loan.remindedAt && loan.remindedBy && (
                          <div className="text-xs">
                            Avisat per {loan.remindedBy.name} a les {formatTime(loan.remindedAt)}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-2">
                          {late && (
                            <RemindKeyButton
                              loanId={loan.id}
                              concierges={concierges}
                              borrowerName={loan.borrower.name ?? loan.borrower.email}
                            />
                          )}
                          <ReturnKeyButton loanId={loan.id} />
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Reserves d&apos;avui</CardTitle>
          <CardDescription>
            Qui baixarà a buscar un carro, a quina hora i quin. Sense reserva no es dona la clau.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Hora</TableHead>
                  <TableHead>Carro</TableHead>
                  <TableHead>Professor/a</TableHead>
                  <TableHead>Clau</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {todayReservations.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                      Avui no hi ha cap carro reservat.
                    </TableCell>
                  </TableRow>
                )}
                {todayReservations.map((reservation) => {
                  const cartKey = reservation.cart.keys[0];
                  const delivered = deliveredReservationIds.has(reservation.id);
                  const past = reservation.endDate < now;
                  return (
                    <TableRow key={reservation.id} className={past ? "opacity-60" : undefined}>
                      <TableCell className="font-medium">
                        {formatTime(reservation.startDate)}–{formatTime(reservation.endDate)}
                      </TableCell>
                      <TableCell>{reservation.cart.name}</TableCell>
                      <TableCell>{reservation.user.name ?? reservation.user.email}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {cartKey ? `${cartKey.number} — ${cartKey.name}` : "Sense clau associada"}
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end">
                          {delivered ? (
                            <Badge variant="secondary">Entregada</Badge>
                          ) : cartKey ? (
                            <DeliverKeyDialog
                              concierges={concierges}
                              keyId={cartKey.id}
                              borrowerId={reservation.userId}
                              borrowerName={reservation.user.name ?? reservation.user.email}
                              reservationId={reservation.id}
                            />
                          ) : null}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
