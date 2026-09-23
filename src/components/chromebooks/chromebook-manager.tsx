"use client";

import { useState } from "react";
import { ArrowDownAZIcon, GripVerticalIcon } from "lucide-react";
import type { ChromebookStatus, DeviceType } from "@prisma/client";

import { setChromebookOrder } from "@/actions/chromebooks";
import { useServerAction } from "@/hooks/use-server-action";
import { moveChromebook, orderChromebooks } from "@/lib/chromebook-order";
import { shownStatus, type DeviceReservationView } from "@/lib/device-reservations";
import { chromebookStatusSquareClasses } from "@/lib/labels";
import { cn } from "@/lib/utils";
import type { CartOption } from "@/components/chromebooks/chromebook-dialog";
import { AddChromebookSquare, ChromebookSquare } from "@/components/chromebooks/chromebook-square";
import { DeviceIcon } from "@/components/chromebooks/device-icon";
import { Button } from "@/components/ui/button";

type Note = {
  id: string;
  body: string;
  createdAt: Date;
  author: { name: string | null; email: string };
};

type Chromebook = {
  id: string;
  assetTag: string;
  serialNumber: string | null;
  brand: string | null;
  model: string | null;
  status: ChromebookStatus;
  deviceType: DeviceType;
  unavailableReason: string | null;
  notes: Note[];
  reservations: DeviceReservationView[];
};

export function ChromebookManager({
  cartId,
  carts,
  chromebooks,
  customOrder,
}: {
  cartId: string;
  carts: CartOption[];
  chromebooks: Chromebook[];
  customOrder: boolean;
}) {
  const [draft, setDraft] = useState<string[] | null>(null);
  const [alphabetical, setAlphabetical] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const editing = draft !== null;
  const devices = editing ? orderChromebooks(chromebooks, draft) : chromebooks;
  const { run, isPending } = useServerAction(setChromebookOrder, {
    successMessage: "Ordre dels dispositius desat",
    onSuccess: () => {
      setDraft(null);
      setSelected(null);
    },
  });

  function move(id: string, targetId: string) {
    if (!draft || isPending) return;
    if (id === targetId) {
      setSelected(null);
      return;
    }
    setDraft(moveChromebook(draft, id, targetId));
    setAlphabetical(false);
    setSelected(null);
    setAnnouncement(`${chromebooks.find((device) => device.id === id)?.assetTag} mogut a la posició ${draft.indexOf(targetId) + 1}.`);
  }

  return (
    <div className="flex flex-col gap-3">
      {(editing || chromebooks.length > 1 || customOrder) && (
        <div className="flex flex-wrap items-center gap-2">
          {editing ? (
            <>
              <Button disabled={isPending} onClick={() => run({ cartId, deviceIds: alphabetical ? [] : draft })}>
                {isPending ? "Desant…" : "Desa l'ordre"}
              </Button>
              <Button variant="outline" disabled={isPending} onClick={() => {
                setDraft(null);
                setSelected(null);
              }}>Cancel·la</Button>
              <Button variant="outline" disabled={isPending} onClick={() => {
                setDraft(orderChromebooks(chromebooks).map(({ id }) => id));
                setAlphabetical(true);
                setSelected(null);
                setAnnouncement("Ordre alfanumèric restaurat. Desa els canvis per aplicar-lo.");
              }}>
                <ArrowDownAZIcon /> Ordre alfanumèric
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => {
                setDraft(chromebooks.map(({ id }) => id));
                setAlphabetical(!customOrder);
                setAnnouncement("");
              }}><GripVerticalIcon /> Ordena els dispositius</Button>
              <span className="text-xs text-muted-foreground">{customOrder ? "Ordre personalitzat" : "Ordre alfanumèric"}</span>
            </>
          )}
        </div>
      )}
      {editing && (
        <p id="device-order-help" className="text-sm text-muted-foreground">
          Clica el dispositiu que vols moure i després el que ocupa la posició de destí. També pots arrossegar-lo.
          L&apos;ordre desat serà el mateix per a tothom.
        </p>
      )}
      <p className="sr-only" role="status">
        {selected ? `${chromebooks.find((device) => device.id === selected)?.assetTag} seleccionat. Clica la posició de destí.` : announcement}
      </p>
      <div className="grid grid-cols-4 gap-3 sm:grid-cols-6 md:grid-cols-8" aria-label="Dispositius del carro">
        {devices.map((chromebook, index) => editing ? (
          <button
            key={chromebook.id}
            type="button"
            disabled={isPending}
            draggable={!isPending}
            aria-label={`${chromebook.assetTag}, posició ${index + 1}`}
            aria-pressed={selected === chromebook.id}
            aria-describedby="device-order-help"
            onClick={() => {
              if (selected) move(selected, chromebook.id);
              else setSelected(chromebook.id);
            }}
            onDragStart={(event) => {
              event.dataTransfer.setData("text/plain", chromebook.id);
              event.dataTransfer.effectAllowed = "move";
              setSelected(chromebook.id);
            }}
            onDragOver={(event) => { if (!isPending) event.preventDefault(); }}
            onDrop={(event) => {
              event.preventDefault();
              const id = event.dataTransfer.getData("text/plain");
              if (draft.includes(id)) move(id, chromebook.id);
            }}
            onDragEnd={() => setSelected(null)}
            className={cn(
              "relative flex aspect-square flex-col items-center justify-center gap-1 rounded-lg border-2 p-1 text-center cursor-grab focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-60",
              chromebookStatusSquareClasses[shownStatus(chromebook.status, chromebook.reservations.find((reservation) => reservation.held) ?? null)],
              selected === chromebook.id && "ring-2 ring-primary ring-offset-2",
            )}
          >
            <span className="absolute left-1.5 top-1 text-[10px]">{index + 1}</span>
            <GripVerticalIcon className="absolute right-1 top-1 size-3 opacity-60" />
            <DeviceIcon type={chromebook.deviceType} className="size-5" />
            <span className="line-clamp-1 text-[11px] font-semibold">{chromebook.assetTag}</span>
          </button>
        ) : (
          <ChromebookSquare key={chromebook.id} cartId={cartId} carts={carts} chromebook={chromebook} />
        ))}
        {!editing && <AddChromebookSquare cartId={cartId} carts={carts} />}
      </div>
    </div>
  );
}
