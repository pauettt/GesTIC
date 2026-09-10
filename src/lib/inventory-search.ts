import type { Prisma } from "@prisma/client";

/**
 * Filtre de cerca lliure sobre l'inventari: marca, model, número de sèrie o nom
 * de l'aula. Sense distingir majúscules ni accents del teclat de l'usuari.
 */
export function inventorySearchFilter(query: string | undefined): Prisma.InventoryItemWhereInput {
  const q = query?.trim();
  if (!q) return {};

  const contains = { contains: q, mode: "insensitive" as const };
  return {
    OR: [
      { brand: contains },
      { model: contains },
      { serialNumber: contains },
      { space: { name: contains } },
      { category: { name: contains } },
    ],
  };
}
