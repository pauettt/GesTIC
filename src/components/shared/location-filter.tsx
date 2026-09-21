"use client";

import type { Route } from "next";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { MapPinIcon } from "lucide-react";

import { resolveLocationFilter, type BuildingOption } from "@/lib/locations";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

/**
 * Edifici i planta, a la URL. La planta només ofereix les de l'edifici triat, i
 * un edifici sense plantes (l'exterior) no en deixa triar cap. La resta de
 * paràmetres de la pàgina (cerca, categoria…) es mantenen.
 */
export function LocationFilter({ buildings }: { buildings: BuildingOption[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  if (buildings.length === 0) return null;

  const filter = resolveLocationFilter(buildings, {
    edifici: searchParams.get("edifici") ?? undefined,
    planta: searchParams.get("planta") ?? undefined,
  });
  const floors = filter?.building.floors ?? [];

  function navigate(building: string | null, floor: string | null) {
    const params = new URLSearchParams(searchParams);
    if (building) params.set("edifici", building);
    else params.delete("edifici");
    if (floor) params.set("planta", floor);
    else params.delete("planta");
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

  return (
    <div className="flex flex-wrap items-center gap-2">
      <MapPinIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
      <Select
        value={filter?.building.id ?? null}
        // En canviar d'edifici, la planta de l'anterior ja no hi és.
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
    </div>
  );
}
