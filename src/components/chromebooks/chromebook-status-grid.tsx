"use client";

import { useState } from "react";
import Link from "next/link";
import type { ChromebookStatus, DeviceType } from "@prisma/client";

import { canBeReserved, shownStatus, type DeviceReservationView } from "@/lib/device-reservations";
import { deviceStatusNote, deviceTypeLabels } from "@/lib/devices";
import { chromebookStatusLabels, chromebookStatusSquareClasses, chromebookStatusVariants } from "@/lib/labels";
import { cn } from "@/lib/utils";
import {
  DeviceReservationList,
  ReserveDeviceButton,
  ReserveDeviceDialog,
} from "@/components/chromebooks/device-reservations";
import { DeviceIcon } from "@/components/chromebooks/device-icon";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export type GridChromebook = {
  id: string;
  assetTag: string;
  deviceType: DeviceType;
  status: ChromebookStatus;
  unavailableReason: string | null;
  /** Les reserves obertes d'aquest equip sol, començant per la de qui el té ara, si n'hi ha. */
  reservations: DeviceReservationView[];
};

function DeviceSquare({ chromebook }: { chromebook: GridChromebook }) {
  const [open, setOpen] = useState(false);
  const [reserving, setReserving] = useState(false);
  const label = `${deviceTypeLabels[chromebook.deviceType]} ${chromebook.assetTag}`;
  // Mentre el té algú per una reserva, no hi és: no disponible, i la reserva en diu el motiu.
  const holder = chromebook.reservations.find((reservation) => reservation.held) ?? null;
  const status = shownStatus(chromebook.status, holder);
  const reservedNow = status !== chromebook.status;

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          render={
            <button
              type="button"
              aria-label={`${chromebook.assetTag} (${deviceTypeLabels[chromebook.deviceType]}): ${chromebookStatusLabels[status]}`}
              className={cn(
                "flex aspect-square w-full flex-col items-center justify-center gap-1 rounded-lg border-2 p-1 text-center transition-colors",
                chromebookStatusSquareClasses[status],
              )}
            />
          }
        >
          <DeviceIcon type={chromebook.deviceType} className="size-5" />
          <span className="line-clamp-1 text-[11px] font-semibold">{chromebook.assetTag}</span>
        </PopoverTrigger>
        <PopoverContent className="w-72">
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-2">
              <p className="font-semibold">{label}</p>
              <Badge variant={chromebookStatusVariants[status]}>{chromebookStatusLabels[status]}</Badge>
            </div>
            {!reservedNow && <p className="text-sm text-muted-foreground">{deviceStatusNote(chromebook)}</p>}
            <DeviceReservationList reservations={chromebook.reservations} />
            {canBeReserved(chromebook.status, chromebook.reservations) && (
              <ReserveDeviceButton
                onClick={() => {
                  setOpen(false);
                  setReserving(true);
                }}
              />
            )}
            <Link
              href={`/q/chromebook/${chromebook.id}`}
              className="text-sm font-medium text-primary hover:underline"
            >
              Reporta un problema →
            </Link>
          </div>
        </PopoverContent>
      </Popover>
      <ReserveDeviceDialog
        chromebookId={chromebook.id}
        deviceLabel={label}
        reservations={chromebook.reservations}
        open={reserving}
        onOpenChange={setReserving}
      />
    </>
  );
}

/**
 * Els Chromebooks del carro tal com els veu el professorat: l'estat de cadascun,
 * per saber abans de fer-los servir quins no van, qui en té reservat algun, i
 * des d'on reservar-ne un o reportar-ne un problema. Del que no funciona, només
 * l'estat i el motiu: qui ha obert una incidència i què hi diu és cosa seva i de
 * la coordinació.
 */
export function ChromebookStatusGrid({ chromebooks }: { chromebooks: GridChromebook[] }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="size-3 rounded-sm border-2 border-green-400 bg-green-100" /> Disponible
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-3 rounded-sm border-2 border-red-400 bg-red-100" /> En incidència, reservat o no
          disponible
        </span>
      </div>
      <ul className="grid grid-cols-4 gap-3 sm:grid-cols-6 md:grid-cols-8">
        {chromebooks.map((chromebook) => (
          <li key={chromebook.id}>
            <DeviceSquare chromebook={chromebook} />
          </li>
        ))}
      </ul>
    </div>
  );
}
