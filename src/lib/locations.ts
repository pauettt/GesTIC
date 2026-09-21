import type { Prisma } from "@prisma/client";

/**
 * Filtre per edifici i planta, compartit per les pàgines que llisten coses que
 * són en un espai (aules, inventari, carros). Va a la URL (`?edifici=…&planta=…`)
 * perquè es pugui compartir i sobrevisqui en tornar enrere.
 */

export type FloorOption = { id: string; name: string };
export type BuildingOption = { id: string; name: string; floors: FloorOption[] };
export type LocationFilter = { building: BuildingOption; floor: FloorOption | null };

type Param = string | string[] | undefined;
const single = (value: Param) => (typeof value === "string" && value ? value : undefined);

/**
 * El filtre que demana la URL, si és bo. Una planta sense edifici porta el seu
 * edifici; una planta que no és de l'edifici triat no compta; un edifici que ja
 * no existeix vol dir que no hi ha filtre.
 */
export function resolveLocationFilter(
  buildings: BuildingOption[],
  params: { edifici?: Param; planta?: Param },
): LocationFilter | null {
  const buildingId = single(params.edifici);
  const floorId = single(params.planta);
  const building = buildingId
    ? buildings.find((candidate) => candidate.id === buildingId)
    : floorId
      ? buildings.find((candidate) => candidate.floors.some((floor) => floor.id === floorId))
      : undefined;
  if (!building) return null;
  return { building, floor: building.floors.find((floor) => floor.id === floorId) ?? null };
}

/** La condició sobre l'espai. Buida sense filtre: llavors també surt el que no té espai. */
export function spaceLocationWhere(filter: LocationFilter | null): Prisma.SpaceWhereInput {
  if (!filter) return {};
  return { buildingId: filter.building.id, ...(filter.floor ? { floorId: filter.floor.id } : {}) };
}

/** «Edifici principal, Planta 0», per dir què s'està mirant. */
export function locationLabel(filter: LocationFilter) {
  return filter.floor ? `${filter.building.name}, ${filter.floor.name}` : filter.building.name;
}
