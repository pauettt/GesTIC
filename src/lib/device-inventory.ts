import type { Prisma } from "@prisma/client";

import { orderChromebooks } from "@/lib/chromebook-order";

/**
 * L'inventari de dispositius de la coordinació (`/chromebooks/equips`): tots els
 * equips, siguin del carro que siguin o del préstec a l'alumnat, i on és cadascun.
 */

/** Valor del filtre «on és» per als equips del préstec a l'alumnat. */
export const STUDENT_POOL_FILTER = "alumnat";

export function deviceSearchQuery(value: unknown): string {
  return typeof value === "string" ? value.trim().slice(0, 200) : "";
}

/**
 * Cerca literal per identificador, número de sèrie, marca, model o carro. Els
 * caràcters % i _ no han d'ampliar els resultats d'ILIKE.
 */
export function deviceSearchWhere(query: string): Prisma.ChromebookWhereInput {
  if (!query) return {};
  const contains = { contains: query.replace(/[\\%_]/g, "\\$&"), mode: "insensitive" as const };
  return {
    OR: [
      { assetTag: contains },
      { serialNumber: contains },
      { brand: contains },
      { model: contains },
      { cart: { name: contains } },
    ],
  };
}

/**
 * La posició de cada equip dins el seu carro, des de l'1: la de la graella del
 * carro, amb l'ordre desat o el del número. Hi compten els donats de baixa, que
 * continuen al carro i hi ocupen lloc.
 */
export function cartPositions(
  carts: readonly { chromebookOrder: string[]; chromebooks: readonly { id: string; assetTag: string }[] }[],
): Map<string, number> {
  const positions = new Map<string, number>();
  for (const cart of carts) {
    orderChromebooks(cart.chromebooks, cart.chromebookOrder).forEach((device, index) => {
      positions.set(device.id, index + 1);
    });
  }
  return positions;
}
