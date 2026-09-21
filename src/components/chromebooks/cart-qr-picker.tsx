"use client";

import { useState } from "react";
import type { Route } from "next";
import Link from "next/link";
import { ArrowLeftIcon } from "lucide-react";
import type { ChromebookStatus, DeviceType } from "@prisma/client";

import { deviceStatusNote, deviceTypeLabels } from "@/lib/devices";
import {
  QUICK_REPORT_CATEGORIES,
  chromebookStatusLabels,
  chromebookStatusSquareClasses,
  chromebookStatusVariants,
} from "@/lib/labels";
import { cn } from "@/lib/utils";
import { DeviceIcon } from "@/components/chromebooks/device-icon";
import { QuickReportButtons } from "@/components/chromebooks/quick-report-buttons";
import { Badge } from "@/components/ui/badge";

export type PickerDevice = {
  id: string;
  assetTag: string;
  deviceType: DeviceType;
  status: ChromebookStatus;
  unavailableReason: string | null;
};

/**
 * El que es veu en escanejar el QR d'un carro: tots els dispositius amb el seu
 * estat i, en tocar-ne un, els botons per reportar-ne l'avaria. Tres tocs:
 * escanejar, triar el dispositiu i triar el problema.
 */
export function CartQrPicker({ cartId, devices }: { cartId: string; devices: PickerDevice[] }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = devices.find((device) => device.id === selectedId) ?? null;

  if (selected) {
    return (
      <div className="flex flex-col gap-3">
        <button
          type="button"
          onClick={() => setSelectedId(null)}
          className="flex items-center gap-1 self-start text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeftIcon className="size-4" />
          Tria un altre dispositiu
        </button>
        <div className="flex items-center justify-between gap-2 rounded-lg border bg-background p-3">
          <span className="flex items-center gap-2 font-semibold">
            <DeviceIcon type={selected.deviceType} className="size-5 text-primary" />
            {deviceTypeLabels[selected.deviceType]} {selected.assetTag}
          </span>
          <Badge variant={chromebookStatusVariants[selected.status]}>
            {chromebookStatusLabels[selected.status]}
          </Badge>
        </div>
        {selected.status !== "DISPONIBLE" && (
          <p className="text-sm text-muted-foreground">{deviceStatusNote(selected)}</p>
        )}
        <p className="text-center text-sm text-muted-foreground">Quin problema té?</p>
        <QuickReportButtons chromebookId={selected.id} categories={QUICK_REPORT_CATEGORIES} />
        <Link
          href={`/incidencies/nova?tipus=carro&equip=${selected.id}` as Route}
          className="mt-1 text-center text-xs text-muted-foreground hover:underline"
        >
          El problema no és cap d&apos;aquests? Reporta&apos;l amb més detall
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-center text-sm text-muted-foreground">Toca el dispositiu que no funciona.</p>
      <div className="flex flex-wrap justify-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="size-3 rounded-sm border-2 border-green-400 bg-green-100" /> Disponible
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-3 rounded-sm border-2 border-red-400 bg-red-100" /> Ja té l&apos;avís posat
        </span>
      </div>
      {devices.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground">Aquest carro no té cap dispositiu.</p>
      ) : (
        <ul className="grid grid-cols-4 gap-2">
          {devices.map((device) => (
            <li key={device.id}>
              <button
                type="button"
                onClick={() => setSelectedId(device.id)}
                aria-label={`${device.assetTag} (${deviceTypeLabels[device.deviceType]}): ${chromebookStatusLabels[device.status]}`}
                className={cn(
                  "flex aspect-square w-full flex-col items-center justify-center gap-1 rounded-lg border-2 p-1 text-center transition-colors",
                  chromebookStatusSquareClasses[device.status],
                )}
              >
                <DeviceIcon type={device.deviceType} className="size-5" />
                <span className="line-clamp-1 text-xs font-semibold">{device.assetTag}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      <Link
        href={`/incidencies/nova?tipus=carro&carro=${cartId}` as Route}
        className="mt-1 text-center text-xs text-muted-foreground hover:underline">
        El problema és del carro sencer (no carrega, la clau…)? Reporta&apos;l aquí
      </Link>
    </div>
  );
}
