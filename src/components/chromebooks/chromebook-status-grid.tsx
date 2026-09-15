"use client";

import Link from "next/link";
import { LaptopIcon } from "lucide-react";
import type { ChromebookStatus } from "@prisma/client";

import { chromebookStatusLabels, chromebookStatusSquareClasses, chromebookStatusVariants } from "@/lib/labels";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export type GridChromebook = {
  id: string;
  assetTag: string;
  status: ChromebookStatus;
  unavailableReason: string | null;
};

function statusNote(chromebook: GridChromebook) {
  switch (chromebook.status) {
    case "EN_INCIDENCIA":
      return "Té una incidència oberta i la coordinació TIC n'està al cas.";
    case "NO_DISPONIBLE":
      return chromebook.unavailableReason
        ? `No es pot fer servir: ${chromebook.unavailableReason}`
        : "No es pot fer servir.";
    default:
      return "Funciona. Si hi trobes cap problema, reporta'l.";
  }
}

/**
 * Els Chromebooks del carro tal com els veu el professorat: l'estat de cadascun,
 * per saber abans de fer-los servir quins no van, i des d'on reportar-ne un
 * problema. Només l'estat i, si no està disponible, el motiu: qui ha obert una
 * incidència i què hi diu és cosa seva i de la coordinació.
 */
export function ChromebookStatusGrid({ chromebooks }: { chromebooks: GridChromebook[] }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="size-3 rounded-sm border-2 border-green-400 bg-green-100" /> Disponible
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-3 rounded-sm border-2 border-red-400 bg-red-100" /> En incidència o no disponible
        </span>
      </div>
      <ul className="grid grid-cols-4 gap-3 sm:grid-cols-6 md:grid-cols-8">
        {chromebooks.map((chromebook) => (
          <li key={chromebook.id}>
            <Popover>
              <PopoverTrigger
                render={
                  <button
                    type="button"
                    aria-label={`${chromebook.assetTag}: ${chromebookStatusLabels[chromebook.status]}`}
                    className={cn(
                      "flex aspect-square w-full flex-col items-center justify-center gap-1 rounded-lg border-2 p-1 text-center transition-colors",
                      chromebookStatusSquareClasses[chromebook.status],
                    )}
                  />
                }
              >
                <LaptopIcon className="size-5" />
                <span className="line-clamp-1 text-[11px] font-semibold">{chromebook.assetTag}</span>
              </PopoverTrigger>
              <PopoverContent className="w-64">
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold">{chromebook.assetTag}</p>
                    <Badge variant={chromebookStatusVariants[chromebook.status]}>
                      {chromebookStatusLabels[chromebook.status]}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{statusNote(chromebook)}</p>
                  <Link
                    href={`/q/chromebook/${chromebook.id}`}
                    className="text-sm font-medium text-primary hover:underline"
                  >
                    Reporta un problema →
                  </Link>
                </div>
              </PopoverContent>
            </Popover>
          </li>
        ))}
      </ul>
    </div>
  );
}
