"use server";

import { revalidatePath } from "next/cache";

import { planCartImport, planChromebookImport } from "@/lib/chromebook-import";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/permissions";
import { importCartChromebooksSchema, importChromebooksSchema } from "@/lib/validations/chromebook-import";

export type ImportChromebooksResult =
  | { success: true; spaces: number; carts: number; chromebooks: number; skipped: number }
  | { success: false; error: string };

/**
 * Importació de carros i Chromebooks. El pla es torna a calcular aquí amb les
 * dades d'ara, i no es fa servir el que ha vist el navegador: si mentrestant
 * algú ha creat un carro o un equip, no es duplica. Tot va en una transacció:
 * o s'importa sencer o no s'importa res.
 */
export async function importChromebooks(input: unknown): Promise<ImportChromebooksResult> {
  await requireAdmin();
  const parsed = importChromebooksSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Dades no vàlides" };
  }
  const { rows, headerRow, mapping, withoutCart, defaultDeviceType } = parsed.data;

  const [spaces, carts, chromebooks] = await Promise.all([
    db.space.findMany({ select: { id: true, name: true, number: true } }),
    db.cart.findMany({ select: { id: true, name: true } }),
    db.chromebook.findMany({ select: { assetTag: true, serialNumber: true } }),
  ]);
  const plan = planChromebookImport(
    rows,
    { headerRow, mapping, withoutCart, defaultDeviceType },
    {
      spaces,
      cartNames: carts.map((cart) => cart.name),
      assetTags: chromebooks.map((chromebook) => chromebook.assetTag),
      serialNumbers: chromebooks.flatMap((chromebook) => (chromebook.serialNumber ? [chromebook.serialNumber] : [])),
    },
  );
  if (plan.chromebooks.length === 0) {
    return { success: false, error: "No hi ha cap dispositiu nou per importar" };
  }

  try {
    const created = await db.$transaction(
      async (tx) => {
        const spaceIds = new Map(spaces.map((space) => [space.name, space.id]));
        for (const space of plan.newSpaces) {
          spaceIds.set(space.name, (await tx.space.create({ data: space })).id);
        }

        const cartIds = new Map(carts.map((cart) => [cart.name, cart.id]));
        let newCarts = 0;
        for (const cart of plan.carts) {
          if (cart.exists || cart.chromebooks === 0) continue;
          const spaceId = cart.spaceName ? (spaceIds.get(cart.spaceName) ?? null) : null;
          cartIds.set(cart.name, (await tx.cart.create({ data: { name: cart.name, spaceId } })).id);
          newCarts += 1;
        }

        await tx.chromebook.createMany({
          data: plan.chromebooks.map((chromebook) => ({
            assetTag: chromebook.assetTag,
            deviceType: chromebook.deviceType,
            serialNumber: chromebook.serialNumber,
            brand: chromebook.brand,
            model: chromebook.model,
            cartId: chromebook.cartName ? cartIds.get(chromebook.cartName) : null,
            isStudentLoanable: chromebook.cartName === null,
          })),
        });

        return { spaces: plan.newSpaces.length, carts: newCarts };
      },
      { timeout: 60_000 },
    );

    revalidatePath("/chromebooks");
    revalidatePath("/alumnat");
    revalidatePath("/espais");
    return {
      success: true,
      spaces: created.spaces,
      carts: created.carts,
      chromebooks: plan.chromebooks.length,
      skipped: plan.duplicates.length + plan.errors.length,
    };
  } catch (error) {
    // P2002: algú ha creat el mateix carro, aula o equip mentre es revisava el full.
    if (typeof error === "object" && error !== null && "code" in error && error.code === "P2002") {
      return {
        success: false,
        error: "Algú ha afegit carros o equips mentrestant i ara n'hi hauria de repetits. Torna a triar el fitxer.",
      };
    }
    throw error;
  }
}

export type ImportCartChromebooksResult =
  | { success: true; chromebooks: number; skipped: number }
  | { success: false; error: string };

/**
 * Els dispositius d'un carro, des de la pàgina del carro. Com la importació
 * general, el pla es torna a calcular aquí amb les dades d'ara i s'importa
 * sencer o res; i si mentrestant algú ha creat un equip igual, l'índex únic de
 * l'etiqueta i del número de sèrie ho atura.
 */
export async function importCartChromebooks(input: unknown): Promise<ImportCartChromebooksResult> {
  await requireAdmin();
  const parsed = importCartChromebooksSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Dades no vàlides" };
  }
  const { cartId, rows, headerRow, mapping, defaultDeviceType } = parsed.data;

  const [cart, chromebooks] = await Promise.all([
    db.cart.findUnique({ where: { id: cartId }, select: { id: true } }),
    db.chromebook.findMany({ select: { assetTag: true, serialNumber: true } }),
  ]);
  if (!cart) return { success: false, error: "Aquest carro ja no existeix" };

  const plan = planCartImport(
    rows,
    { headerRow, mapping, defaultDeviceType },
    {
      assetTags: chromebooks.map((chromebook) => chromebook.assetTag),
      serialNumbers: chromebooks.flatMap((chromebook) => (chromebook.serialNumber ? [chromebook.serialNumber] : [])),
    },
  );
  if (plan.chromebooks.length === 0) {
    return { success: false, error: "No hi ha cap dispositiu nou per importar" };
  }

  try {
    await db.chromebook.createMany({
      data: plan.chromebooks.map((chromebook) => ({
        assetTag: chromebook.assetTag,
        deviceType: chromebook.deviceType,
        serialNumber: chromebook.serialNumber,
        brand: chromebook.brand,
        model: chromebook.model,
        cartId: cart.id,
      })),
    });
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "P2002") {
      return {
        success: false,
        error: "Algú ha afegit dispositius mentrestant i ara n'hi hauria de repetits. Torna a triar el fitxer.",
      };
    }
    throw error;
  }

  revalidatePath("/chromebooks");
  revalidatePath(`/chromebooks/${cart.id}`);
  return {
    success: true,
    chromebooks: plan.chromebooks.length,
    skipped: plan.duplicates.length + plan.errors.length,
  };
}
