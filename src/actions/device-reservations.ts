"use server";

import { revalidatePath } from "next/cache";
import type { ChromebookStatus } from "@prisma/client";

import { db } from "@/lib/db";
import { canAccessCart, CART_ACCESS_DENIED } from "@/lib/cart-access";
import { zonedDateTime } from "@/lib/date";
import { bookingSpanLabel, isHeld, isOverdue, occupyingWhere, sessionSpan } from "@/lib/device-reservations";
import { isAdmin, requireUser } from "@/lib/permissions";
import { isPastPeriod, isSchoolDay } from "@/lib/schedule";
import { createDeviceReservationSchema, deviceReservationIdSchema } from "@/lib/validations/chromebooks";

export type ActionResult = { success: true } | { success: false; error: string };

/** Per què no es pot reservar un equip que ara no funciona. */
const UNRESERVABLE: Partial<Record<ChromebookStatus, string>> = {
  EN_INCIDENCIA: "Aquest equip té una incidència oberta: tria'n un altre",
  NO_DISPONIBLE: "La coordinació ha tret aquest equip de servei: tria'n un altre",
  BAIXA: "Aquest equip està donat de baixa",
  ASSIGNAT: "Aquest equip el té un alumne en préstec",
};

/** Un motiu per no reservar que ha de veure qui ho prova, dins la transacció. */
class ReservationRefused extends Error {}

function revalidateCart(cartId: string | null) {
  if (cartId) revalidatePath(`/chromebooks/${cartId}`);
  revalidatePath("/chromebooks");
  revalidatePath("/");
}

/**
 * Reserva un equip sol d'un carro, de la sessió `fromPeriodId` a la
 * `toPeriodId` d'un dia. Des que comença la primera, surt com a no disponible
 * amb el nom de qui l'ha reservat, fins que el torna.
 *
 * No es pot si l'equip no funciona, si algú altre el té reservat en alguna
 * d'aquestes sessions (o encara no l'ha tornat), ni si el carro sencer és
 * reservat per una altra persona: aquella hora els equips són a la seva classe.
 * Al revés sí: qui reserva el carro després ja veu quants equips hi faltaran.
 */
export async function createDeviceReservation(input: unknown): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = createDeviceReservationSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Dades no vàlides" };
  }
  const { chromebookId, date, fromPeriodId, toPeriodId, purpose } = parsed.data;

  if (!isSchoolDay(date)) {
    return { success: false, error: "Només es pot reservar de dilluns a divendres" };
  }
  const span = sessionSpan(date, fromPeriodId, toPeriodId);
  if (!span) return { success: false, error: "L'última sessió no pot ser abans de la primera" };
  // Com al carro, la sessió en curs sí que es pot reservar: el cas real és
  // necessitar l'equip ara mateix, a mitja classe.
  if (isPastPeriod(zonedDateTime(date, span.first.end))) {
    return { success: false, error: "La primera sessió ja ha passat" };
  }

  const chromebook = await db.chromebook.findUnique({
    where: { id: chromebookId },
    select: { cartId: true, isStudentLoanable: true },
  });
  if (!chromebook) return { success: false, error: "Aquest equip ja no existeix" };
  // Els del préstec a l'alumnat no són de cap carro i es demanen per a tot el curs, a /alumnat.
  if (!chromebook.cartId || chromebook.isStudentLoanable) {
    return { success: false, error: "Només es poden reservar els equips dels carros" };
  }
  const cartId = chromebook.cartId;
  const now = new Date();

  try {
    await db.$transaction(async (tx) => {
      // Bloqueja el carro fins al final. Dues reserves del mateix equip alhora
      // s'esperen i la segona ja veu la primera; una reserva del carro sencer
      // que s'estigui desant també, perquè la seva clau forana hi posa un
      // bloqueig que aquest no deixa passar.
      await tx.$queryRaw`SELECT "id" FROM "Cart" WHERE "id" = ${cartId} FOR UPDATE`;

      const device = await tx.chromebook.findUnique({
        where: { id: chromebookId },
        select: { status: true, cartId: true, cart: { select: { isVisibleToTeachers: true } } },
      });
      if (!device || device.cartId !== cartId) {
        throw new ReservationRefused("Aquest equip acaba de canviar de carro: torna-ho a provar");
      }
      if (!device.cart || !canAccessCart(user.role, device.cart)) {
        throw new ReservationRefused(CART_ACCESS_DENIED);
      }
      const unreservable = UNRESERVABLE[device.status];
      if (unreservable) throw new ReservationRefused(unreservable);

      const taken = await tx.deviceReservation.findFirst({
        where: { chromebookId, ...occupyingWhere(span.startDate, span.endDate, now) },
        select: { userId: true, startDate: true, endDate: true, user: { select: { name: true, email: true } } },
        orderBy: { startDate: "asc" },
      });
      if (taken) {
        const mine = taken.userId === user.id;
        const who = taken.user.name ?? taken.user.email;
        throw new ReservationRefused(
          isOverdue(taken, now)
            ? mine
              ? "Encara no l'has tornat de la reserva anterior"
              : `${who} encara no l'ha tornat`
            : mine
              ? `Ja el tens reservat: ${bookingSpanLabel(taken)}`
              : `Ja el té reservat ${who}: ${bookingSpanLabel(taken)}`,
        );
      }

      const cartBooking = await tx.reservation.findFirst({
        where: {
          cartId,
          status: "CONFIRMADA",
          userId: { not: user.id },
          startDate: { lt: span.endDate },
          endDate: { gt: span.startDate },
        },
        select: { startDate: true, endDate: true, user: { select: { name: true, email: true } } },
        orderBy: { startDate: "asc" },
      });
      if (cartBooking) {
        throw new ReservationRefused(
          `El carro sencer és de ${cartBooking.user.name ?? cartBooking.user.email} a la ${bookingSpanLabel(cartBooking)}: aquella hora els equips són a la seva classe`,
        );
      }

      await tx.deviceReservation.create({
        data: {
          chromebookId,
          userId: user.id,
          startDate: span.startDate,
          endDate: span.endDate,
          purpose: purpose || null,
        },
      });
    });
  } catch (error) {
    if (error instanceof ReservationRefused) return { success: false, error: error.message };
    console.error("[reserva d'equip] no s'ha pogut desar:", error);
    return { success: false, error: "No s'ha pogut desar la reserva. Torna-ho a provar." };
  }

  revalidateCart(cartId);
  return { success: true };
}

/** La reserva oberta, si qui ho demana la pot tocar: qui l'ha feta o la coordinació. */
async function ownReservation(input: unknown) {
  const user = await requireUser();
  const parsed = deviceReservationIdSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "Dades no vàlides" };

  const reservation = await db.deviceReservation.findUnique({
    where: { id: parsed.data.id },
    include: { chromebook: { select: { cartId: true } } },
  });
  if (!reservation) return { ok: false as const, error: "La reserva no existeix" };
  if (!isAdmin(user.role) && reservation.userId !== user.id) {
    return { ok: false as const, error: "Aquesta reserva no és teva" };
  }
  if (reservation.status !== "CONFIRMADA") {
    return {
      ok: false as const,
      error:
        reservation.status === "COMPLETADA" ? "Aquest equip ja consta com a tornat" : "Aquesta reserva ja està cancel·lada",
    };
  }
  return { ok: true as const, user, reservation };
}

/** Anul·la una reserva que encara no ha començat: l'equip no ha sortit del carro. */
export async function cancelDeviceReservation(input: unknown): Promise<ActionResult> {
  const found = await ownReservation(input);
  if (!found.ok) return { success: false, error: found.error };
  const { reservation } = found;

  if (isHeld(reservation)) {
    return { success: false, error: "Aquesta reserva ja ha començat: quan l'equip torni al carro, marca'l com a tornat" };
  }

  // Només si encara està confirmada: si mentrestant algú l'ha tocat, no es trepitja.
  await db.deviceReservation.updateMany({
    where: { id: reservation.id, status: "CONFIRMADA" },
    data: { status: "CANCELLADA" },
  });
  revalidateCart(reservation.chromebook.cartId);
  return { success: true };
}

/**
 * L'equip torna al carro: deixa de sortir com a no disponible i s'acaben els
 * avisos. Ho marca qui el tenia o la coordinació, i queda qui i quan.
 */
export async function returnReservedDevice(input: unknown): Promise<ActionResult> {
  const found = await ownReservation(input);
  if (!found.ok) return { success: false, error: found.error };
  const { user, reservation } = found;

  if (!isHeld(reservation)) {
    return { success: false, error: "Aquesta reserva encara no ha començat: si ja no el necessites, cancel·la-la" };
  }

  await db.deviceReservation.updateMany({
    where: { id: reservation.id, status: "CONFIRMADA" },
    data: { status: "COMPLETADA", returnedAt: new Date(), returnedById: user.id },
  });
  revalidateCart(reservation.chromebook.cartId);
  revalidatePath("/panell");
  return { success: true };
}
