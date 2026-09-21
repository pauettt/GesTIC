"use client";

import type { Route } from "next";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { MapPinIcon } from "lucide-react";

import {
  resolveLocationFilter,
  resolveSpaceFilter,
  spacesInLocation,
  type BuildingOption,
  type SpaceOption,
} from "@/lib/locations";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

/**
 * Edifici i planta, a la URL. La planta només ofereix les de l'edifici triat, i
 * un edifici sense plantes (l'exterior) no en deixa triar cap. Amb `spaces`, hi
 * surt també l'aula, només d'entre les que queden dins l'edifici i la planta. La
 * resta de paràmetres de la pàgina (cerca, categoria…) es mantenen.
 */
export function LocationFilter({
  buildings,
  spaces,
}: {
  buildings: BuildingOption[];
  spaces?: SpaceOption[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  if (buildings.length === 0) return null;

  const filter = resolveLocationFilter(buildings, {
    edifici: searchParams.get("edifici") ?? undefined,
    planta: searchParams.get("planta") ?? undefined,
  });
  const floors = filter?.building.floors ?? [];
  const spaceOptions = spaces ? spacesInLocation(spaces, filter) : [];
  const space = spaces ? resolveSpaceFilter(spaces, filter, searchParams.get("aula") ?? undefined) : null;

  function navigate(building: string | null, floor: string | null, aula: string | null = null) {
    const params = new URLSearchParams(searchParams);
    if (building) params.set("edifici", building);
    else params.delete("edifici");
    if (floor) params.set("planta", floor);
    else params.delete("planta");
    if (aula) params.set("aula", aula);
    else params.delete("aula");
    const query = params.toString();
    router.replace((query ? `${pathname}?${query}` : pathname) as Route, { scroll: false });
  }

  const buildingItems = [
    { value: null, label: "Tots els edificis" },
    ...buildings.map((building) => ({ value: building.id, label: building.name })),
  ];
  const floorItems = [
    { value: null, label: filter && floors.length === 0 ? "Sense plantes" : "Totes les plantes" },
    ...floors.map((floor) => ({ value: floor.id, label: floor.name })),
  ];
  const spaceItems = [
    { value: null, label: spaceOptions.length === 0 ? "Sense aules" : "Totes les aules" },
    ...spaceOptions.map((option) => ({ value: option.id, label: option.name })),
  ];

  return (
    <div className="flex flex-wrap items-center gap-2">
      <MapPinIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
      <Select
        value={filter?.building.id ?? null}
        // En canviar d'edifici, la planta i l'aula de l'anterior ja no hi són.
        onValueChange={(next) => navigate(next ?? null, null)}
        items={buildingItems}
      >
        <SelectTrigger className="w-44" size="sm" aria-label="Edifici">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {buildingItems.map((item) => (
            <SelectItem key={item.value ?? ""} value={item.value}>
              {item.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        value={filter?.floor?.id ?? null}
        onValueChange={(next) => navigate(filter?.building.id ?? null, next ?? null)}
        items={floorItems}
        disabled={floors.length === 0}
      >
        <SelectTrigger className="w-40" size="sm" aria-label="Planta">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {floorItems.map((item) => (
            <SelectItem key={item.value ?? ""} value={item.value}>
              {item.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {spaces && (
        <Select
          value={space?.id ?? null}
          onValueChange={(next) =>
            navigate(filter?.building.id ?? null, filter?.floor?.id ?? null, next ?? null)
          }
          items={spaceItems}
          disabled={spaceOptions.length === 0}
        >
          <SelectTrigger className="w-52" size="sm" aria-label="Aula">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {spaceItems.map((item) => (
              <SelectItem key={item.value ?? ""} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  );
}
