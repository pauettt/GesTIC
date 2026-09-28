import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { db } from "@/lib/db";
import { formatDateTime, isSameDay } from "@/lib/date";
import {
  bookingSpanLabel,
  currentHolder,
  dayLabel,
  holderReason,
  isHeld,
  isOverdue,
  shownStatus,
} from "@/lib/device-reservations";
import { deviceTypeLabels } from "@/lib/devices";
import { chromebookStatusLabels, chromebookStatusVariants } from "@/lib/labels";
import { requireAdmin } from "@/lib/permissions";
import { ChromebookNotes } from "@/components/chromebooks/chromebook-square";
import { DeviceIcon } from "@/components/chromebooks/device-icon";
import { ItemIncidentHistory } from "@/components/inventory/item-histories";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { ReservationStatus } from "@prisma/client";

export const metadata = { title: "Fitxa del dispositiu" };

type Person = { name: string | null; email: string };

const who = (person: Person) => person.name ?? person.email;

function DataRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm">{value}</span>
    </div>
  );
}

/**
 * On és una reserva de l'equip. Tornat fora de termini vol dir un altre dia:
 * dins el mateix dia no avisa ningú, i el recordatori surt l'endemà.
 */
function reservationState(
  reservation: { status: ReservationStatus; startDate: Date; endDate: Date; returnedAt: Date | null },
  now: Date,
): { label: string; variant: "secondary" | "outline" | "destructive"; late?: boolean } {
  if (reservation.status === "CANCELLADA") return { label: "Cancel·lada", variant: "outline" };
  if (reservation.status === "COMPLETADA") {
    const late =
      reservation.returnedAt !== null &&
      reservation.returnedAt > reservation.endDate &&
      !isSameDay(reservation.returnedAt, reservation.endDate);
    return { label: "Tornat", variant: "secondary", late };
  }
  if (!isHeld(reservation, now)) return { label: "Prevista", variant: "outline" };
  return isOverdue(reservation, now)
    ? { label: "Sense tornar", variant: "destructive" }
    : { label: "En ús", variant: "secondary" };
}

/**
 * La fitxa d'un equip d'un carro, com la d'un equip d'inventari: les seves dades,
 * les incidències, qui l'ha reservat sol i les notes. Les accions ràpides
 * (disponible, reservar, editar, donar de baixa) són a la finestreta de la
 * graella del carro. Només per a la coordinació: el professorat veu l'estat de
 * cada equip al carro, però no qui hi ha obert incidències.
 */
export default async function DeviceRecordPage({ params }: PageProps<"/chromebooks/equips/[id]">) {
  await requireAdmin();
  const { id } = await params;

  const person = { select: { name: true, email: true } } as const;
  const device = await db.chromebook.findUnique({
    where: { id },
    include: {
      cart: { select: { id: true, name: true } },
      notes: { include: { author: person }, orderBy: { createdAt: "desc" } },
      incidents: {
        select: { id: true, title: true, createdAt: true, priority: true, status: true, reporter: person },
        orderBy: { createdAt: "desc" },
      },
      reservations: {
        include: { user: person, returnedBy: person },
        orderBy: { startDate: "desc" },
      },
    },
  });
  if (!device) notFound();
  // Els del préstec a l'alumnat tenen la seva fitxa, amb qui els ha tingut.
  if (device.isStudentLoanable) redirect(`/alumnat/${device.id}`);

  const now = new Date();
  const holder = currentHolder(device.reservations.filter((reservation) => reservation.status === "CONFIRMADA"), now);
  const shown = shownStatus(device.status, holder);
  const model = [device.brand, device.model].filter(Boolean).join(" ");
  const reason = holder && device.status === "DISPONIBLE" ? holderReason(holder, now) : device.unavailableReason;

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <div>
        {device.cart ? (
          <Link href={`/chromebooks/${device.cart.id}`} className="text-sm text-muted-foreground hover:underline">
            &larr; {device.cart.name}
          </Link>
        ) : (
          <Link href="/chromebooks" className="text-sm text-muted-foreground hover:underline">
            &larr; Tots els carros
          </Link>
        )}

        <div className="mt-3 flex flex-col gap-5 rounded-lg border bg-background p-5 sm:flex-row">
          <div className="flex size-24 shrink-0 items-center justify-center rounded-lg border bg-muted">
            <DeviceIcon type={device.deviceType} className="size-10 text-muted-foreground" />
          </div>

          <div className="flex min-w-0 flex-1 flex-col gap-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h1 className="text-2xl font-semibold">{device.assetTag}</h1>
                <p className="text-muted-foreground">
                  {[deviceTypeLabels[device.deviceType], model].filter(Boolean).join(" · ")}
                </p>
              </div>
              <Badge variant={chromebookStatusVariants[shown]}>{chromebookStatusLabels[shown]}</Badge>
            </div>

            <div className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3">
              <DataRow
                label="Carro"
                value={
                  device.cart ? (
                    <Link href={`/chromebooks/${device.cart.id}`} className="hover:underline">
                      {device.cart.name}
                    </Link>
                  ) : (
                    "Fora del carro"
                  )
                }
              />
              <DataRow label="Núm. de sèrie" value={device.serialNumber ?? "—"} />
              {reason && <DataRow label="Motiu" value={reason} />}
            </div>
          </div>
        </div>
      </div>

      <ItemIncidentHistory
        historyHref={`/incidencies?chromebookId=${device.id}`}
        incidents={device.incidents}
        showReporter
      />

      <section>
        <h2 className="mb-3 text-lg font-semibold">Historial de reserves</h2>
        <p className="mb-3 text-sm text-muted-foreground">
          Les vegades que algú l&apos;ha reservat sol, fora de les reserves del carro sencer.
        </p>
        <div className="overflow-x-auto rounded-lg border bg-background">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Professor/a</TableHead>
                <TableHead>Quan</TableHead>
                <TableHead>Retornat</TableHead>
                <TableHead>Motiu</TableHead>
                <TableHead>Estat</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {device.reservations.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                    Ningú no l&apos;ha reservat sol.
                  </TableCell>
                </TableRow>
              )}
              {device.reservations.map((reservation) => {
                const state = reservationState(reservation, now);
                return (
                  <TableRow key={reservation.id}>
                    <TableCell className="font-medium">{who(reservation.user)}</TableCell>
                    <TableCell className="text-muted-foreground">
                      <span className="whitespace-nowrap">{dayLabel(reservation.startDate)}</span>
                      <span className="block text-xs">{bookingSpanLabel(reservation)}</span>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {reservation.returnedAt ? (
                        <>
                          <span className={state.late ? "text-destructive" : undefined}>
                            {formatDateTime(reservation.returnedAt)}
                            {state.late ? " (fora de termini)" : ""}
                          </span>
                          {reservation.returnedBy && (
                            <span className="block text-xs">per {who(reservation.returnedBy)}</span>
                          )}
                        </>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{reservation.purpose ?? "—"}</TableCell>
                    <TableCell>
                      <Badge variant={state.variant}>{state.label}</Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </section>

      <section className="rounded-lg border bg-background p-4">
        <ChromebookNotes chromebookId={device.id} notes={device.notes} />
      </section>
    </div>
  );
}
