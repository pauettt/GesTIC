"use server";

import { revalidatePath } from "next/cache";

import { db } from "@/lib/db";
import { zonedDateTime } from "@/lib/date";
import { getPeriodById, isPastPeriod } from "@/lib/schedule";
import { isAdmin, requireAdmin, requireUser } from "@/lib/permissions";
import {
  addChromebookNoteSchema,
  cancelReservationSchema,
  createReservationSchema,
  deleteCartSchema,
  deleteChromebookNoteSchema,
  deleteChromebookSchema,
  upsertCartSchema,
  upsertChromebookSchema,
  upsertStudentChromebookSchema,
} from "@/lib/validations/chromebooks";

export type ActionResult = { success: true } | { success: false; error: string };

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
  // aparèixer: desapareixerien del sistema sense avisar.
  const chromebooks = await db.chromebook.count({ where: { cartId: parsed.data.id } });
  if (chromebooks > 0) {
    return {
      success: false,
      error: `Aquest carro encara té ${chromebooks} Chromebook${chromebooks === 1 ? "" : "s"}. Mou-los a un altre carro o dona'ls de baixa abans d'esborrar-lo.`,
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
  const { id, cartId, assetTag, serialNumber, brand, model } = parsed.data;
  const payload = {
    assetTag,
    serialNumber: serialNumber || null,
    brand: brand || null,
    model: model || null,
  };

  try {
    if (id) {
      // Els equips del pool de préstec a l'alumnat no es toquen des d'aquí:
      // aquest formulari és el del carro i els hi acabaria ficant.
      const existing = await db.chromebook.findUnique({ where: { id } });
      if (existing?.isStudentLoanable) {
        return { success: false, error: "Aquest Chromebook és del pool de préstec a l'alumnat" };
      }
      await db.chromebook.update({ where: { id }, data: payload });
    } else {
      await db.chromebook.create({ data: { ...payload, cartId } });
    }
  } catch {
    return { success: false, error: "Ja existeix un Chromebook amb aquest identificador o número de sèrie" };
  }

  revalidatePath(`/chromebooks/${cartId}`);
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
      if (!existing) return { success: false, error: "El Chromebook no existeix" };
      // La simètrica de la d'abans: des d'aquí no es pot treure d'un carro un
      // equip d'aula i convertir-lo en equip de préstec sense adonar-se'n.
      if (!existing.isStudentLoanable) {
        return { success: false, error: "Aquest Chromebook és d'un carro d'aula" };
      }
      await db.chromebook.update({ where: { id }, data: payload });
    } else {
      await db.chromebook.create({ data: { ...payload, isStudentLoanable: true } });
    }
  } catch {
    return { success: false, error: "Ja existeix un Chromebook amb aquest identificador o número de sèrie" };
  }

  revalidatePath("/chromebooks");
  return { success: true };
}

export async function deleteChromebook(input: unknown): Promise<ActionResult> {
  await requireAdmin();
  const parsed = deleteChromebookSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Dades no vàlides" };

  const existing = await db.chromebook.findUnique({ where: { id: parsed.data.id } });
  if (!existing) return { success: false, error: "El Chromebook no existeix" };
  // Un equip assignat és a casa d'un alumne: esborrar-lo deixaria el préstec
  // penjant i ningú sabria quin aparell s'ha de reclamar.
  if (existing.status === "ASSIGNAT") {
    return {
      success: false,
      error: "Aquest Chromebook està assignat a un alumne: primer cal registrar-ne la devolució",
    };
  }

  const chromebook = await db.chromebook.delete({ where: { id: parsed.data.id } });
  revalidatePath(chromebook.cartId ? `/chromebooks/${chromebook.cartId}` : "/chromebooks");
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
  if (!chromebook) return { success: false, error: "El Chromebook no existeix" };

  await db.chromebookNote.create({ data: { chromebookId, authorId: user.id, body } });

  revalidatePath(chromebook.cartId ? `/chromebooks/${chromebook.cartId}` : "/chromebooks");
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
  revalidatePath(note.chromebook.cartId ? `/chromebooks/${note.chromebook.cartId}` : "/chromebooks");
  return { success: true };
}

export async function createReservation(input: unknown): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = createReservationSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Dades no vàlides" };
  }
  const { cartId, purpose, date, periodIds } = parsed.data;

  const periods = periodIds.map((id) => {
    const period = getPeriodById(id);
    if (!period) throw new Error("Sessió no vàlida");
    return { startDate: zonedDateTime(date, period.start), endDate: zonedDateTime(date, period.end) };
  });

  // Una sessió que JA HA ACABAT no es pot reservar. Les que estan en curs sí:
  // el cas real és necessitar el carro ara mateix, a mitja classe.
  if (periods.some(({ endDate }) => isPastPeriod(endDate))) {
    return { success: false, error: "No es poden reservar sessions que ja han passat" };
  }

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

  await db.reservation.update({ where: { id: parsed.data.id }, data: { status: "CANCELLADA" } });
  revalidatePath(`/chromebooks/${reservation.cartId}`);
  revalidatePath("/chromebooks");
  return { success: true };
}
