"use client";

import { useState } from "react";
import { SlidersHorizontalIcon } from "lucide-react";

import { deleteFloor, reorderFloor, upsertFloor } from "@/actions/spaces";
import { CategoryManagerList, type ManagedCategory } from "@/components/shared/category-manager-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Field, FieldLabel } from "@/components/ui/field";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type BuildingFloors = { id: string; name: string; floors: ManagedCategory[] };

const FLOOR_LABELS = {
  created: "Planta creada",
  updated: "Planta actualitzada",
  deleted: "Planta eliminada",
  empty: "Aquest edifici no té plantes. Si no n'hi calen, com a l'exterior, deixa-ho així.",
  newPlaceholder: "Nova planta",
};

/** Les plantes de cada edifici: es tria l'edifici i es gestionen les seves, de baix a dalt. */
export function FloorManagerDialog({ buildings }: { buildings: BuildingFloors[] }) {
  const [open, setOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  // Si l'edifici triat s'ha eliminat, el primer.
  const building = buildings.find((candidate) => candidate.id === selectedId) ?? buildings[0];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="outline" size="sm">
            <SlidersHorizontalIcon className="size-4" />
            Plantes
          </Button>
        }
      />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Plantes</DialogTitle>
          <DialogDescription>
            Cada edifici té les seves, en l&apos;ordre de l&apos;edifici. Només es poden eliminar si no hi ha cap
            espai.
          </DialogDescription>
        </DialogHeader>

        {!building ? (
          <p className="rounded-lg border p-4 text-center text-sm text-muted-foreground">
            Abans cal crear algun edifici, amb el botó «Edificis».
          </p>
        ) : (
          <>
            <Field>
              <FieldLabel htmlFor="floor-manager-building">Edifici</FieldLabel>
              <Select
                value={building.id}
                onValueChange={(next) => next && setSelectedId(next)}
                items={Object.fromEntries(buildings.map((candidate) => [candidate.id, candidate.name]))}
              >
                <SelectTrigger id="floor-manager-building" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {buildings.map((candidate) => (
                    <SelectItem key={candidate.id} value={candidate.id}>
                      {candidate.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            {/* Una llista per edifici: el que s'estava editant en un no passa a l'altre. */}
            <CategoryManagerList
              key={building.id}
              categories={building.floors}
              upsertAction={(input) => upsertFloor({ ...input, buildingId: building.id })}
              deleteAction={deleteFloor}
              reorderAction={reorderFloor}
              itemNounSingular="espai"
              itemNounPlural="espais"
              labels={FLOOR_LABELS}
            />
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
