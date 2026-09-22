import type { Prisma } from "@prisma/client";

/**
 * Filtre de cerca lliure sobre l'inventari: marca, model, número de sèrie, IP,
 * nom a la xarxa o nom de l'aula. Sense distingir majúscules ni accents del teclat de l'usuari.
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
      { ipAddress: contains },
      { hostname: contains },
      { space: { name: contains } },
      { category: { name: contains } },
    ],
  };
}

/**
 * La mateixa cerca sobre els carros que surten a l'inventari: el nom del carro,
 * el número de sèrie o l'aula on és.
 */
export function cartSearchFilter(query: string | undefined): Prisma.CartWhereInput {
  const q = query?.trim();
  if (!q) return {};

  const contains = { contains: q, mode: "insensitive" as const };
  return {
    OR: [{ name: contains }, { serialNumber: contains }, { space: { name: contains } }],
  };
}
