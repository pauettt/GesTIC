import { LaptopIcon, PackageIcon } from "lucide-react";

import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/permissions";
import {
  deleteBuilding,
  deleteFloor,
  deleteSpace,
  reorderBuilding,
  reorderFloor,
  upsertBuilding,
  upsertFloor,
} from "@/actions/spaces";
import { CategoryManagerDialog } from "@/components/shared/category-manager-dialog";
import { ConfirmDeleteButton } from "@/components/shared/confirm-delete-button";
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

function toOptions(items: ListItem[]) {
  return items.map((item) => ({ id: item.id, name: item.name }));
}

export default async function EspaisPage() {
  await requireAdmin();

  const listQuery = {
    orderBy: [{ order: "asc" as const }, { name: "asc" as const }],
    include: { _count: { select: { spaces: true } } },
  };
  const [spaces, buildings, floors] = await Promise.all([
    db.space.findMany({
      orderBy: { name: "asc" },
      include: {
        building: { select: { name: true } },
        floor: { select: { name: true } },
        _count: { select: { inventoryItems: true, carts: true } },
      },
    }),
    db.building.findMany(listQuery),
    db.floor.findMany(listQuery),
  ]);
  const buildingOptions = toOptions(buildings);
  const floorOptions = toOptions(floors);

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
            description="Els que es poden triar en crear o editar un espai. Només es poden eliminar si no hi ha cap espai."
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
          <CategoryManagerDialog
            categories={toManaged(floors)}
            upsertAction={upsertFloor}
            deleteAction={deleteFloor}
            reorderAction={reorderFloor}
            title="Plantes"
            description="Les que es poden triar en crear o editar un espai, en l'ordre de l'edifici. Només es poden eliminar si no hi ha cap espai."
            itemNounSingular="espai"
            itemNounPlural="espais"
            labels={{
              created: "Planta creada",
              updated: "Planta actualitzada",
              deleted: "Planta eliminada",
              empty: "Encara no hi ha cap planta.",
              newPlaceholder: "Nova planta",
            }}
            triggerLabel="Plantes"
            triggerVariant="outline"
          />
          <SpaceDialog buildings={buildingOptions} floors={floorOptions} />
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <ul className="divide-y">
            {spaces.map((space) => (
              <li key={space.id} className="flex items-center justify-between gap-3 p-4">
                <div>
                  <p className="font-medium">{space.name}</p>
                  {(space.building || space.floor) && (
                    <p className="text-sm text-muted-foreground">
                      {[space.building?.name, space.floor?.name].filter(Boolean).join(", ")}
                    </p>
                  )}
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
                    floors={floorOptions}
                    space={{
                      id: space.id,
                      number: space.number ?? "",
                      roomName: space.roomName ?? "",
                      buildingId: space.buildingId ?? "",
                      floorId: space.floorId ?? "",
                    }}
                    trigger={
                      <button className="rounded-md border px-2 py-1 text-xs hover:bg-muted">
                        Edita
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
            {spaces.length === 0 && (
              <li className="p-6 text-center text-sm text-muted-foreground">
                Encara no hi ha cap aula o espai definit. Crea&apos;n el primer amb el botó de dalt.
              </li>
            )}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
