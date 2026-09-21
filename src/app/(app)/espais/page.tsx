import { LaptopIcon, PackageIcon } from "lucide-react";

import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/permissions";
import { locationLabel, resolveLocationFilter, spaceLocationWhere } from "@/lib/locations";
import { deleteBuilding, deleteSpace, reorderBuilding, upsertBuilding } from "@/actions/spaces";
import { CategoryManagerDialog } from "@/components/shared/category-manager-dialog";
import { ConfirmDeleteButton } from "@/components/shared/confirm-delete-button";
import { LocationFilter } from "@/components/shared/location-filter";
import { FloorManagerDialog } from "@/components/spaces/floor-manager-dialog";
import { SpaceDialog } from "@/components/spaces/space-dialog";
import { Card, CardContent } from "@/components/ui/card";

export const metadata = { title: "Aules i espais" };

type ListItem = { id: string; name: string; order: number; _count: { spaces: number } };

function toManaged(items: ListItem[]) {
  return items.map((item) => ({
    id: item.id,
    name: item.name,
    order: item.order,
    usageCount: item._count.spaces,
  }));
}

export default async function EspaisPage({ searchParams }: PageProps<"/espais">) {
  await requireAdmin();

  const listQuery = {
    orderBy: [{ order: "asc" as const }, { name: "asc" as const }],
    include: { _count: { select: { spaces: true } } },
  };
  const buildings = await db.building.findMany({
    ...listQuery,
    include: { ...listQuery.include, floors: listQuery },
  });
  const buildingOptions = buildings.map((building) => ({
    id: building.id,
    name: building.name,
    floors: building.floors.map((floor) => ({ id: floor.id, name: floor.name })),
  }));
  const filter = resolveLocationFilter(buildingOptions, await searchParams);

  // En l'ordre de l'edifici i, a dins, de baix a dalt. Els que no tenen edifici o planta, al final.
  const spaces = await db.space.findMany({
    where: spaceLocationWhere(filter),
    orderBy: [
      { building: { order: "asc" } },
      { building: { name: "asc" } },
      { floor: { order: "asc" } },
      { floor: { name: "asc" } },
      { name: "asc" },
    ],
    include: {
      building: { select: { name: true } },
      floor: { select: { name: true } },
      _count: { select: { inventoryItems: true, carts: true } },
    },
  });

  const groups: { key: string; title: string; spaces: typeof spaces }[] = [];
  for (const space of spaces) {
    const key = space.buildingId ?? "";
    const group = groups.at(-1);
    if (group?.key === key) group.spaces.push(space);
    else groups.push({ key, title: space.building?.name ?? "Sense edifici", spaces: [space] });
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Aules i espais</h1>
          <p className="text-muted-foreground">
            Aules, despatxos i altres espais del centre on hi ha equipament TIC i carros de
            Chromebooks.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <CategoryManagerDialog
            categories={toManaged(buildings)}
            upsertAction={upsertBuilding}
            deleteAction={deleteBuilding}
            reorderAction={reorderBuilding}
            title="Edificis"
            description="Els que es poden triar en crear o editar un espai. Només es poden eliminar si no hi ha cap espai; les seves plantes s'eliminen amb ell."
            itemNounSingular="espai"
            itemNounPlural="espais"
            labels={{
              created: "Edifici creat",
              updated: "Edifici actualitzat",
              deleted: "Edifici eliminat",
              empty: "Encara no hi ha cap edifici.",
              newPlaceholder: "Nou edifici",
            }}
            triggerLabel="Edificis"
            triggerVariant="outline"
          />
          <FloorManagerDialog
            buildings={buildings.map((building) => ({
              id: building.id,
              name: building.name,
              floors: toManaged(building.floors),
            }))}
          />
          <SpaceDialog buildings={buildingOptions} />
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <LocationFilter buildings={buildingOptions} />
        <p className="text-sm text-muted-foreground">
          {spaces.length} {spaces.length === 1 ? "espai" : "espais"}
        </p>
      </div>

      {groups.map((group) => (
        <section key={group.key} className="flex flex-col gap-2">
          {/* Amb un edifici triat, el títol ja és al filtre. */}
          {!filter && <h2 className="text-sm font-semibold text-muted-foreground">{group.title}</h2>}
          <Card>
            <CardContent className="p-0">
              <ul className="divide-y">
                {group.spaces.map((space) => (
                  <li key={space.id} className="flex items-center justify-between gap-3 p-4">
                    <div>
                      <p className="font-medium">{space.name}</p>
                      {space.floor && <p className="text-sm text-muted-foreground">{space.floor.name}</p>}
                      <div className="mt-1 flex gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <PackageIcon className="size-3.5" />
                          {space._count.inventoryItems} equips d&apos;inventari
                        </span>
                        <span className="flex items-center gap-1">
                          <LaptopIcon className="size-3.5" />
                          {space._count.carts} {space._count.carts === 1 ? "carro" : "carros"}
                        </span>
                      </div>
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <SpaceDialog
                        buildings={buildingOptions}
                        space={spaceValues(space)}
                        trigger={
                          <button className="rounded-md border px-2 py-1 text-xs hover:bg-muted">
                            Edita
                          </button>
                        }
                      />
                      <SpaceDialog
                        buildings={buildingOptions}
                        copyFrom={spaceValues(space)}
                        trigger={
                          <button className="rounded-md border px-2 py-1 text-xs hover:bg-muted">
                            Duplica
                          </button>
                        }
                      />
                      <ConfirmDeleteButton
                        action={deleteSpace}
                        input={{ id: space.id }}
                        title="Eliminar aquest espai?"
                        description="Els equips i carros que hi estan associats no s'eliminaran, però quedaran sense ubicació."
                      />
                    </div>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </section>
      ))}

      {spaces.length === 0 && (
        <Card>
          <CardContent className="p-6 text-center text-sm text-muted-foreground">
            {filter
              ? `No hi ha cap espai a ${locationLabel(filter)}.`
              : "Encara no hi ha cap aula o espai definit. Crea'n el primer amb el botó de dalt."}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

/** El que el diàleg d'espai necessita d'un espai desat, per editar-lo o duplicar-lo. */
function spaceValues(space: {
  id: string;
  number: string | null;
  roomName: string | null;
  buildingId: string | null;
  floorId: string | null;
}) {
  return {
    id: space.id,
    number: space.number ?? "",
    roomName: space.roomName ?? "",
    buildingId: space.buildingId ?? "",
    floorId: space.floorId ?? "",
  };
}
