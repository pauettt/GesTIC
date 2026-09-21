import { db } from "@/lib/db";
import type { BuildingOption } from "@/lib/locations";

/** Els edificis amb les seves plantes, en l'ordre que els ha posat la coordinació. */
export function loadBuildingOptions(): Promise<BuildingOption[]> {
  return db.building.findMany({
    orderBy: [{ order: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      floors: { orderBy: [{ order: "asc" }, { name: "asc" }], select: { id: true, name: true } },
    },
  });
}
