import type { Route } from "next";
import Link from "next/link";

import { db } from "@/lib/db";
import { formatDateTime, formatTime } from "@/lib/date";
import { requireKeyAccess } from "@/lib/permissions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  const { clau, carro, professor } = await searchParams;

  const where = {
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
        reservation: true,
      },
      orderBy: { deliveredAt: "desc" },
      take: 300,
    }),
    db.key.findMany({ orderBy: { number: "asc" }, include: { cart: true } }),
    db.user.findMany({
      where: { keyLoans: { some: {} } },
      orderBy: { name: "asc" },
      select: { id: true, name: true, email: true },
    }),
  ]);

  function href(next: { clau?: string; professor?: string }): Route {
    const params = new URLSearchParams();
    const nextKey = next.clau !== undefined ? next.clau : typeof clau === "string" ? clau : "";
    const nextTeacher =
      next.professor !== undefined ? next.professor : typeof professor === "string" ? professor : "";
    if (nextKey) params.set("clau", nextKey);
    if (nextTeacher) params.set("professor", nextTeacher);
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

      <div className="flex flex-wrap items-center gap-2">
        <Button
          size="sm"
          variant={!clau && !professor ? "default" : "outline"}
          nativeButton={false}
          render={<Link href={href({ clau: "", professor: "" })} />}
        >
          Tot
        </Button>
        {keys.map((key) => (
          <Button
            key={key.id}
            size="sm"
            variant={clau === key.id ? "default" : "outline"}
            nativeButton={false}
            render={<Link href={href({ clau: key.id })} />}
          >
            {key.number}
          </Button>
        ))}
      </div>

      {teachers.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted-foreground">Professorat:</span>
          {teachers.map((teacher) => (
            <Button
              key={teacher.id}
              size="sm"
              variant={professor === teacher.id ? "default" : "outline"}
              nativeButton={false}
              render={<Link href={href({ professor: teacher.id })} />}
            >
              {teacher.name ?? teacher.email}
            </Button>
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
              <TableHead>Reserva</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loans.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                  Encara no hi ha cap préstec registrat amb aquest filtre.
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

      {loans.length === 300 && (
        <p className="text-sm text-muted-foreground">
          Es mostren els 300 préstecs més recents. Filtra per clau o per professor/a per acotar-ho.
        </p>
      )}
    </div>
  );
}
