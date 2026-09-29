"use client";

import { useRef, useState } from "react";
import { ArrowDownAZIcon, ArrowRightLeftIcon, CheckIcon, GripVerticalIcon } from "lucide-react";
import type { ChromebookStatus, DeviceType } from "@prisma/client";

import { moveChromebooks, setChromebookOrder } from "@/actions/chromebooks";
import { useServerAction } from "@/hooks/use-server-action";
import { moveChromebook, orderChromebooks } from "@/lib/chromebook-order";
import { shownStatus, type DeviceReservationView } from "@/lib/device-reservations";
import { chromebookStatusSquareClasses } from "@/lib/labels";
import { cn, toSelectItems } from "@/lib/utils";
import type { MoveChromebooksInput } from "@/lib/validations/chromebooks";
import type { CartOption } from "@/components/chromebooks/chromebook-dialog";
import {
  AddChromebookSquare,
  ChromebookSquare,
  type DeviceIncident,
} from "@/components/chromebooks/chromebook-square";
import { DeviceIcon } from "@/components/chromebooks/device-icon";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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
  openIncidents: DeviceIncident[];
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
  const draggedId = useRef<string | null>(null);
  const [dropTarget, setDropTarget] = useState<string | null>(null);
  // Els que es mouran a un altre carro; null quan no s'està movent res.
  const [picked, setPicked] = useState<string[] | null>(null);
  const [destination, setDestination] = useState<string | null>(null);
  const editing = draft !== null;
  const moving = picked !== null;
  const devices = editing ? orderChromebooks(chromebooks, draft) : chromebooks;
  const otherCarts = carts.filter((cart) => cart.id !== cartId);
  const canOrder = chromebooks.length > 1 || customOrder;
  const canMove = chromebooks.length > 0 && otherCarts.length > 0;
  const { run, isPending } = useServerAction(setChromebookOrder, {
    successMessage: "Ordre dels dispositius desat",
    onSuccess: () => {
      setDraft(null);
      setSelected(null);
    },
  });
  const { run: runMove, isPending: isMoving } = useServerAction<MoveChromebooksInput>(moveChromebooks, {
    successMessage: ({ toCartId, deviceIds }) => {
      const name = carts.find((cart) => cart.id === toCartId)?.name ?? "l'altre carro";
      return deviceIds.length === 1
        ? `Dispositiu mogut a ${name}`
        : `${deviceIds.length} dispositius moguts a ${name}`;
    },
    onSuccess: () => {
      setPicked(null);
      setDestination(null);
    },
  });

  function togglePicked(id: string) {
    setPicked((current) =>
      current?.includes(id) ? current.filter((other) => other !== id) : [...(current ?? []), id],
    );
  }

  function move(id: string, targetId: string) {
    if (isPending) return;
    if (id === targetId) {
      setSelected(null);
      return;
    }
    const order = draft ?? chromebooks.map((device) => device.id);
    setDraft(moveChromebook(order, id, targetId));
    setAlphabetical(false);
    setSelected(null);
    setAnnouncement(`${chromebooks.find((device) => device.id === id)?.assetTag} mogut a la posició ${order.indexOf(targetId) + 1}.`);
  }

  // Inclou els espais entre targetes: deixar-lo anar al marge d'un quadrat
  // també ha de funcionar. Només compten les targetes d'aquest mateix carro.
  function targetAt(grid: HTMLDivElement, x: number, y: number) {
    let nearest: string | null = null;
    let distance = Infinity;
    for (const card of grid.querySelectorAll<HTMLElement>("[data-order-id]")) {
      const rect = card.getBoundingClientRect();
      const next = Math.hypot(x - (rect.left + rect.width / 2), y - (rect.top + rect.height / 2));
      if (next < distance) {
        distance = next;
        nearest = card.dataset.orderId ?? null;
      }
    }
    return nearest;
  }

  return (
    <div className="flex flex-col gap-3">
      {(editing || moving || canOrder || canMove) && (
        <div className="flex flex-wrap items-center gap-2">
          {moving ? (
            <>
              <Select
                value={destination}
                onValueChange={(value) => setDestination(value ?? null)}
                items={toSelectItems(otherCarts, (cart) => cart.id, (cart) => cart.name)}
              >
                <SelectTrigger aria-label="Carro de destí" className="w-full sm:w-56" disabled={isMoving}>
                  <SelectValue placeholder="Tria el carro de destí" />
                </SelectTrigger>
                <SelectContent>
                  {otherCarts.map((cart) => (
                    <SelectItem key={cart.id} value={cart.id}>
                      {cart.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                disabled={isMoving || !destination || picked.length === 0}
                onClick={() => {
                  if (destination) runMove({ fromCartId: cartId, toCartId: destination, deviceIds: picked });
                }}
              >
                {isMoving ? "Movent…" : picked.length > 0 ? `Mou-ne ${picked.length}` : "Mou"}
              </Button>
              <Button
                variant="outline"
                disabled={isMoving}
                onClick={() => setPicked(picked.length === chromebooks.length ? [] : chromebooks.map(({ id }) => id))}
              >
                {picked.length === chromebooks.length ? "Desmarca'ls tots" : "Marca'ls tots"}
              </Button>
              <Button variant="outline" disabled={isMoving} onClick={() => {
                setPicked(null);
                setDestination(null);
              }}>Cancel·la</Button>
            </>
          ) : editing ? (
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
              {canOrder && (
                <>
                  <Button variant="outline" onClick={() => {
                    setDraft(chromebooks.map(({ id }) => id));
                    setAlphabetical(!customOrder);
                    setAnnouncement("");
                  }}><GripVerticalIcon /> Ordena els dispositius</Button>
                  <span className="text-xs text-muted-foreground">{customOrder ? "Ordre personalitzat" : "Ordre alfanumèric"}</span>
                </>
              )}
              {canMove && (
                <Button variant="outline" className="sm:ml-auto" onClick={() => setPicked([])}>
                  <ArrowRightLeftIcon /> Mou a un altre carro
                </Button>
              )}
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
      {moving && (
        <p id="device-move-help" className="text-sm text-muted-foreground">
          Marca els dispositius que vols moure i tria el carro on van. S&apos;hi emporten les notes, les incidències
          i les reserves que tinguin.
        </p>
      )}
      {!editing && !moving && chromebooks.length > 1 && (
        <p className="text-sm text-muted-foreground">
          Arrossega un dispositiu a la posició que vulguis i desa l&apos;ordre. Un clic n&apos;obre els detalls.
        </p>
      )}
      <p className="sr-only" role="status">
        {selected ? `${chromebooks.find((device) => device.id === selected)?.assetTag} seleccionat. Clica la posició de destí.` : announcement}
      </p>
      <div
        className="grid grid-cols-4 gap-3 sm:grid-cols-6 md:grid-cols-8"
        aria-label="Dispositius del carro"
        onDragOver={(event) => {
          if (!draggedId.current || isPending) return;
          event.preventDefault();
          event.dataTransfer.dropEffect = "move";
          setDropTarget(targetAt(event.currentTarget, event.clientX, event.clientY));
        }}
        onDragLeave={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDropTarget(null);
        }}
        onDrop={(event) => {
          const id = draggedId.current;
          if (!id || isPending) return;
          event.preventDefault();
          const target = targetAt(event.currentTarget, event.clientX, event.clientY);
          draggedId.current = null;
          setDropTarget(null);
          if (target) move(id, target);
        }}
      >
        {devices.map((chromebook, index) => {
          // Com el veu el professorat: si algú el té per una reserva, no disponible.
          const square = chromebookStatusSquareClasses[
            shownStatus(chromebook.status, chromebook.reservations.find((reservation) => reservation.held) ?? null)
          ];
          const isPicked = picked?.includes(chromebook.id) ?? false;
          return (
            <div
              key={chromebook.id}
              data-order-id={chromebook.id}
              draggable={!moving && !isPending && chromebooks.length > 1}
              onDragStart={(event) => {
                event.dataTransfer.setData("text/plain", chromebook.id);
                event.dataTransfer.effectAllowed = "move";
                draggedId.current = chromebook.id;
                setSelected(null);
              }}
              onDragEnd={() => {
                draggedId.current = null;
                setDropTarget(null);
              }}
              className={cn(
                "relative rounded-lg select-none",
                !moving && "cursor-grab active:cursor-grabbing",
                dropTarget === chromebook.id && "ring-2 ring-primary ring-offset-2",
              )}
            >
              {moving ? (
                <button
                  type="button"
                  disabled={isMoving}
                  aria-pressed={isPicked}
                  aria-describedby="device-move-help"
                  onClick={() => togglePicked(chromebook.id)}
                  className={cn(
                    "relative flex aspect-square w-full flex-col items-center justify-center gap-1 rounded-lg border-2 p-1 text-center focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-60",
                    square,
                    isPicked && "ring-2 ring-primary ring-offset-2",
                  )}
                >
                  {isPicked && (
                    <CheckIcon aria-hidden="true" className="absolute right-1 top-1 size-3.5 rounded-full bg-primary p-0.5 text-primary-foreground" />
                  )}
                  <DeviceIcon type={chromebook.deviceType} className="size-5" />
                  <span className="line-clamp-1 text-[11px] font-semibold">{chromebook.assetTag}</span>
                </button>
              ) : editing ? (
                <button
                  type="button"
                  disabled={isPending}
                  aria-label={`${chromebook.assetTag}, posició ${index + 1}`}
                  aria-pressed={selected === chromebook.id}
                  aria-describedby="device-order-help"
                  onClick={() => {
                    if (selected) move(selected, chromebook.id);
                    else setSelected(chromebook.id);
                  }}
                  className={cn(
                    "relative flex aspect-square w-full flex-col items-center justify-center gap-1 rounded-lg border-2 p-1 text-center cursor-grab focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-60",
                    square,
                    selected === chromebook.id && "ring-2 ring-primary ring-offset-2",
                  )}
                >
                  <span className="absolute left-1.5 top-1 text-[10px]">{index + 1}</span>
                  <GripVerticalIcon className="absolute right-1 top-1 size-3 opacity-60" />
                  <DeviceIcon type={chromebook.deviceType} className="size-5" />
                  <span className="line-clamp-1 text-[11px] font-semibold">{chromebook.assetTag}</span>
                </button>
              ) : (
                <>
                  <ChromebookSquare cartId={cartId} carts={carts} chromebook={chromebook} />
                  <GripVerticalIcon aria-hidden="true" className="pointer-events-none absolute right-1 top-1 size-3 opacity-60" />
                </>
              )}
            </div>
          );
        })}
        {!editing && !moving && <AddChromebookSquare cartId={cartId} carts={carts} />}
      </div>
    </div>
  );
}
