import { LaptopIcon, PackageIcon } from "lucide-react";

import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/permissions";
import { deleteSpace } from "@/actions/spaces";
import { ConfirmDeleteButton } from "@/components/shared/confirm-delete-button";
import { SpaceDialog } from "@/components/spaces/space-dialog";
import { Card, CardContent } from "@/components/ui/card";

export const metadata = { title: "Aules i espais" };

export default async function EspaisPage() {
  await requireAdmin();

  const spaces = await db.space.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { inventoryItems: true, carts: true } } },
  });

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
        <SpaceDialog />
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
                      {[space.building, space.floor].filter(Boolean).join(", ")}
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
                    space={{
                      id: space.id,
                      name: space.name,
                      building: space.building ?? "",
                      floor: space.floor ?? "",
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
