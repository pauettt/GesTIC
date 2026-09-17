"use server";

import { revalidatePath } from "next/cache";

import { db } from "@/lib/db";
import { ACTIVE_STUDENT_REQUEST_STATUSES, syncChromebookStatus } from "@/lib/chromebook-status";
import { zonedDateTime } from "@/lib/date";
import { getPeriodById, isPastPeriod, isSchoolDay } from "@/lib/schedule";
import { isAdmin, requireAdmin, requireUser } from "@/lib/permissions";
import {
  addChromebookNoteSchema,
  cancelReservationSchema,
  createReservationSchema,
  deleteCartSchema,
  deleteChromebookNoteSchema,
  deleteChromebookSchema,
  setChromebookAvailabilitySchema,
  setChromebookRetiredSchema,
  upsertCartSchema,
  upsertChromebookSchema,
  upsertStudentChromebookSchema,
} from "@/lib/validations/chromebooks";

export type ActionResult = { success: true } | { success: false; error: string };

/** On surt un equip: el d'un carro, a la pàgina del carro; el del pool, al préstec a l'alumnat. */
function devicePage(cartId: string | null) {
  return cartId ? `/chromebooks/${cartId}` : "/alumnat";
}

export async function upsertCart(input: unknown): Promise<ActionResult> {
  await requireAdmin();
  const parsed = upsertCartSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Dades no vàlides" };
  }
  const { id, name, serialNumber, spaceId, imageUrl } = parsed.data;
  const payload = {
    name,
    serialNumber: serialNumber || null,
    spaceId: spaceId || null,
    imageUrl: imageUrl || null,
  };

  try {
    if (id) {
      await db.cart.update({ where: { id }, data: payload });
    } else {
      await db.cart.create({ data: payload });
    }
  } catch {
    return { success: false, error: "Ja existeix un carro amb aquest nom o número de sèrie" };
  }

  revalidatePath("/chromebooks");
  return { success: true };
}

export async function deleteCart(input: unknown): Promise<ActionResult> {
  await requireAdmin();
  const parsed = deleteCartSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Dades no vàlides" };

  // Els Chromebooks només es gestionen des de la fitxa del seu carro, així que
  // esborrar-ne un amb equips a dins els deixaria sense cap pantalla on
  // aparèixer: desapareixerien del sistema sense avisar. Hi compten també els
  // donats de baixa, que segueixen al carro amb el seu historial.
  const chromebooks = await db.chromebook.count({ where: { cartId: parsed.data.id } });
  if (chromebooks > 0) {
    return {
      success: false,
      error: `Aquest carro encara té ${chromebooks} ${chromebooks === 1 ? "dispositiu" : "dispositius"}, comptant els donats de baixa. Mou-los a un altre carro o esborra'ls abans d'esborrar-lo.`,
    };
  }

  await db.cart.delete({ where: { id: parsed.data.id } });
  revalidatePath("/chromebooks");
  return { success: true };
}

export async function upsertChromebook(input: unknown): Promise<ActionResult> {
  await requireAdmin();
  const parsed = upsertChromebookSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Dades no vàlides" };
  }
  const { id, cartId, assetTag, deviceType, serialNumber, brand, model } = parsed.data;
  const payload = {
    assetTag,
    deviceType,
    serialNumber: serialNumber || null,
    brand: brand || null,
    model: model || null,
    cartId,
  };

  // El carro ha d'existir: en una alta és on va a parar l'equip, i en una
  // edició canviar-lo és la manera de moure l'equip a un altre carro.
  const cart = await db.cart.findUnique({ where: { id: cartId }, select: { id: true } });
  if (!cart) return { success: false, error: "Aquest carro ja no existeix" };

  let previousCartId: string | null = null;
  try {
    if (id) {
      // Els equips del pool de préstec a l'alumnat no es toquen des d'aquí:
      // aquest formulari és el del carro i els hi acabaria ficant.
      const existing = await db.chromebook.findUnique({ where: { id } });
      if (!existing) return { success: false, error: "El dispositiu no existeix" };
      if (existing.isStudentLoanable) {
        return { success: false, error: "Aquest equip és del préstec a l'alumnat" };
      }
      previousCartId = existing.cartId;
      await db.chromebook.update({ where: { id }, data: payload });
    } else {
      await db.chromebook.create({ data: payload });
    }
  } catch {
    return { success: false, error: "Ja existeix un dispositiu amb aquest identificador o número de sèrie" };
  }

  revalidatePath(`/chromebooks/${cartId}`);
  if (previousCartId && previousCartId !== cartId) {
    revalidatePath(`/chromebooks/${previousCartId}`);
  }
  revalidatePath("/chromebooks");
  return { success: true };
}

/**
 * Alta i edició dels equips del pool de préstec individual a l'alumnat. Va a
 * part de `upsertChromebook` perquè aquells viuen sempre dins d'un carro i
 * aquests no en tenen cap: barrejar-ho en una sola acció voldria dir un
 * `cartId` que de vegades hi és i de vegades no, i acabar decidint a cada línia
 * de quin dels dos casos parlem.
 */
export async function upsertStudentChromebook(input: unknown): Promise<ActionResult> {
  await requireAdmin();
  const parsed = upsertStudentChromebookSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Dades no vàlides" };
  }
  const { id, assetTag, serialNumber, brand, model } = parsed.data;
  const payload = {
    assetTag,
    serialNumber,
    brand: brand || null,
    model: model || null,
  };

  try {
    if (id) {
      const existing = await db.chromebook.findUnique({ where: { id } });
      if (!existing) return { success: false, error: "El dispositiu no existeix" };
      // La simètrica de la d'abans: des d'aquí no es pot treure d'un carro un
      // equip d'aula i convertir-lo en equip de préstec sense adonar-se'n.
      if (!existing.isStudentLoanable) {
        return { success: false, error: "Aquest equip és d'un carro d'aula" };
      }
      await db.chromebook.update({ where: { id }, data: payload });
    } else {
      await db.chromebook.create({ data: { ...payload, isStudentLoanable: true } });
    }
  } catch {
    return { success: false, error: "Ja existeix un dispositiu amb aquest identificador o número de sèrie" };
  }

  revalidatePath("/alumnat");
  return { success: true };
}

/** Compta si l'equip és d'un alumne ara mateix: apartat per entregar o ja a casa seva. */
async function isAssignedToStudent(chromebookId: string) {
  const active = await db.studentDeviceRequest.count({
    where: { chromebookId, status: { in: ACTIVE_STUDENT_REQUEST_STATUSES } },
  });
  return active > 0;
}

export async function deleteChromebook(input: unknown): Promise<ActionResult> {
  await requireAdmin();
  const parsed = deleteChromebookSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Dades no vàlides" };

  const existing = await db.chromebook.findUnique({ where: { id: parsed.data.id } });
  if (!existing) return { success: false, error: "El dispositiu no existeix" };
  // Un equip assignat és a casa d'un alumne: esborrar-lo deixaria el préstec
  // penjant i ningú sabria quin aparell s'ha de reclamar. Es mira la
  // sol·licitud i no l'estat, perquè amb una incidència oberta l'equip surt com
  // a EN_INCIDENCIA però l'alumne el continua tenint.
  if (await isAssignedToStudent(existing.id)) {
    return {
      success: false,
      error: "Aquest equip està assignat a un alumne: primer cal registrar-ne la devolució",
    };
  }

  const chromebook = await db.chromebook.delete({ where: { id: parsed.data.id } });
  revalidatePath(devicePage(chromebook.cartId));
  return { success: true };
}

/**
 * Dona de baixa un Chromebook o el torna a activar. Retirar-lo en comptes
 * d'esborrar-lo conserva les notes i l'historial d'incidències, que és el que
 * justifica demanar-ne un de nou.
 *
 * Tornar-lo a activar no el deixa sempre DISPONIBLE: l'estat es recalcula, i si
 * té alguna incidència oberta torna com a EN_INCIDENCIA.
 */
export async function setChromebookRetired(input: unknown): Promise<ActionResult> {
  await requireAdmin();
  const parsed = setChromebookRetiredSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Dades no vàlides" };
  const { id, retired } = parsed.data;

  const chromebook = await db.chromebook.findUnique({ where: { id } });
  if (!chromebook) return { success: false, error: "El dispositiu no existeix" };

  if (retired) {
    if (await isAssignedToStudent(id)) {
      return {
        success: false,
        error: "Aquest equip està assignat a un alumne: primer cal registrar-ne la devolució",
      };
    }
    await db.chromebook.update({ where: { id }, data: { status: "BAIXA", unavailableReason: null } });
  } else if (chromebook.status === "BAIXA") {
    await db.$transaction(async (tx) => {
      await tx.chromebook.update({ where: { id }, data: { status: "DISPONIBLE" } });
      await syncChromebookStatus(tx, id);
    });
  }

  revalidatePath(devicePage(chromebook.cartId));
  return { success: true };
}

/**
 * Marca un Chromebook com a no disponible, amb el motiu, o el torna a posar en
 * servei. És per a qualsevol raó que no passi per una incidència (falta el
 * carregador, la bateria no aguanta...): surt en vermell, no compta com a
 * disponible i només ho torna a ser quan la coordinació ho canvia. Cada canvi
 * queda a les notes de l'equip, amb qui l'ha fet i quan.
 */
export async function setChromebookAvailability(input: unknown): Promise<ActionResult> {
  const user = await requireAdmin();
  const parsed = setChromebookAvailabilitySchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Dades no vàlides" };
  }
  const { id, available } = parsed.data;
  const reason = (parsed.data.reason ?? "").trim();

  const chromebook = await db.chromebook.findUnique({ where: { id } });
  if (!chromebook) return { success: false, error: "El dispositiu no existeix" };

  if (!available) {
    if (chromebook.status === "BAIXA") {
      return { success: false, error: "Aquest dispositiu està donat de baixa" };
    }
    if (await isAssignedToStudent(id)) {
      return {
        success: false,
        error: "Aquest equip està assignat a un alumne: primer cal registrar-ne la devolució",
      };
    }
    await db.$transaction([
      db.chromebook.update({ where: { id }, data: { status: "NO_DISPONIBLE", unavailableReason: reason } }),
      db.chromebookNote.create({ data: { chromebookId: id, authorId: user.id, body: `No disponible: ${reason}` } }),
    ]);
  } else if (chromebook.status === "NO_DISPONIBLE") {
    // Com en reactivar una baixa: l'estat es recalcula, i si mentrestant s'hi ha
    // obert una incidència, torna com a EN_INCIDENCIA.
    await db.$transaction(async (tx) => {
      await tx.chromebook.update({ where: { id }, data: { status: "DISPONIBLE", unavailableReason: null } });
      await syncChromebookStatus(tx, id);
      await tx.chromebookNote.create({
        data: { chromebookId: id, authorId: user.id, body: "Torna a estar disponible" },
      });
    });
  }

  revalidatePath(devicePage(chromebook.cartId));
  if (chromebook.cartId) revalidatePath("/chromebooks");
  return { success: true };
}

export async function addChromebookNote(input: unknown): Promise<ActionResult> {
  const user = await requireAdmin();
  const parsed = addChromebookNoteSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Dades no vàlides" };
  }
  const { chromebookId, body } = parsed.data;

  const chromebook = await db.chromebook.findUnique({ where: { id: chromebookId } });
  if (!chromebook) return { success: false, error: "El dispositiu no existeix" };

  await db.chromebookNote.create({ data: { chromebookId, authorId: user.id, body } });

  revalidatePath(devicePage(chromebook.cartId));
  return { success: true };
}

export async function deleteChromebookNote(input: unknown): Promise<ActionResult> {
  await requireAdmin();
  const parsed = deleteChromebookNoteSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Dades no vàlides" };

  const note = await db.chromebookNote.delete({
    where: { id: parsed.data.id },
    include: { chromebook: true },
  });
  revalidatePath(devicePage(note.chromebook.cartId));
  return { success: true };
}

export async function createReservation(input: unknown): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = createReservationSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Dades no vàlides" };
  }
  const { cartId, purpose, date, periodIds } = parsed.data;

  if (!isSchoolDay(date)) {
    return { success: false, error: "Només es pot reservar de dilluns a divendres" };
  }

  const periods: { startDate: Date; endDate: Date }[] = [];
  for (const periodId of periodIds) {
    const period = getPeriodById(periodId);
    if (!period) return { success: false, error: "Aquesta sessió no existeix a l'horari del centre" };
    periods.push({
      startDate: zonedDateTime(date, period.start),
      endDate: zonedDateTime(date, period.end),
    });
  }

  // Una sessió que JA HA ACABAT no es pot reservar. Les que estan en curs sí:
  // el cas real és necessitar el carro ara mateix, a mitja classe.
  if (periods.some(({ endDate }) => isPastPeriod(endDate))) {
    return { success: false, error: "No es poden reservar sessions que ja han passat" };
  }

  const cart = await db.cart.findUnique({ where: { id: cartId }, select: { id: true } });
  if (!cart) return { success: false, error: "Aquest carro ja no existeix" };

  try {
    await db.$transaction(async (tx) => {
      for (const { startDate, endDate } of periods) {
        const overlapping = await tx.reservation.findFirst({
          where: {
            cartId,
            status: "CONFIRMADA",
            startDate: { lt: endDate },
            endDate: { gt: startDate },
          },
        });
        if (overlapping) {
          throw new Error("Alguna de les sessions seleccionades ja està reservada");
        }
        await tx.reservation.create({
          data: { cartId, userId: user.id, startDate, endDate, purpose: purpose || null },
        });
      }
    });
  } catch (error) {
    // P2002 = l'índex únic parcial ha aturat una reserva simultània que havia
    // superat la comprovació de solapament. És la xarxa de seguretat real.
    if (typeof error === "object" && error !== null && "code" in error && error.code === "P2002") {
      return { success: false, error: "Algú acaba de reservar aquesta sessió. Torna a provar-ho." };
    }
    return {
      success: false,
      error: error instanceof Error ? error.message : "No s'ha pogut confirmar la reserva",
    };
  }

  revalidatePath(`/chromebooks/${cartId}`);
  revalidatePath("/chromebooks");
  return { success: true };
}

export async function cancelReservation(input: unknown): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = cancelReservationSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Dades no vàlides" };

  const reservation = await db.reservation.findUnique({ where: { id: parsed.data.id } });
  if (!reservation) return { success: false, error: "La reserva no existeix" };
  if (!isAdmin(user.role) && reservation.userId !== user.id) {
    return { success: false, error: "No pots cancel·lar aquesta reserva" };
  }
  if (reservation.status !== "CONFIRMADA") {
    return { success: false, error: "Aquesta reserva ja no està confirmada" };
  }

  await db.reservation.update({ where: { id: parsed.data.id }, data: { status: "CANCELLADA" } });
  revalidatePath(`/chromebooks/${reservation.cartId}`);
  revalidatePath("/chromebooks");
  return { success: true };
}
