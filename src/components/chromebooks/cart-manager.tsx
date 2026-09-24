"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowDownAZIcon, GripVerticalIcon, LaptopIcon } from "lucide-react";

import { setCartOrder } from "@/actions/chromebooks";
import { useServerAction } from "@/hooks/use-server-action";
import { moveCart, orderCarts } from "@/lib/cart-order";
import type { PlacedSpace } from "@/lib/locations";
import { cn } from "@/lib/utils";
import { CartPlace } from "@/components/chromebooks/cart-place";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export type CartItem = {
  id: string;
  name: string;
  order: number | null;
  imageUrl: string | null;
  isVisibleToTeachers: boolean;
  space: (PlacedSpace & { roomName: string | null }) | null;
  summary: string | null;
  available: number;
  inService: number;
};

export function CartName({ cart }: { cart: { name: string; space: CartItem["space"] } }) {
  const room = cart.space?.roomName?.trim() || cart.space?.name;
  return (
    <>
      {cart.name}
      {room && (
        <>
          {" "}
          · <span className="text-blue-700 dark:text-blue-400">{room}</span>
        </>
      )}
    </>
  );
}

function CartCardBody({ cart }: { cart: CartItem }) {
  return (
    <Card className="h-full overflow-hidden pt-0 transition-colors hover:border-primary/50 hover:bg-muted/40">
      <div className="relative flex h-36 items-center justify-center border-b bg-muted">
        {cart.imageUrl ? (
          <Image
            src={cart.imageUrl}
            alt={cart.name}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover"
          />
        ) : (
          <LaptopIcon className="size-8 text-muted-foreground" />
        )}
      </div>
      <CardHeader>
        <CardTitle>
          <CartName cart={cart} />
        </CardTitle>
        {!cart.isVisibleToTeachers && (
          <p className="text-xs font-medium text-amber-700 dark:text-amber-400">
            Ocult al professorat · ús intern
          </p>
        )}
        <CartPlace space={cart.space} className="text-sm" />
      </CardHeader>
      <CardContent className="flex flex-col gap-0.5">
        {cart.summary && <p className="text-sm text-muted-foreground">{cart.summary}</p>}
        <p className="text-sm">
          <span className="font-medium">{cart.available}</span> / {cart.inService} disponibles
        </p>
      </CardContent>
    </Card>
  );
}

export function CartManager({
  carts,
  customOrder,
  canReorder,
  emptyMessage,
}: {
  carts: CartItem[];
  customOrder: boolean;
  canReorder: boolean;
  emptyMessage: string;
}) {
  const [draft, setDraft] = useState<string[] | null>(null);
  const [alphabetical, setAlphabetical] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const draggedId = useRef<string | null>(null);
  const [dropTarget, setDropTarget] = useState<string | null>(null);
  const editing = draft !== null;
  const displayedCarts = editing ? orderCarts(carts, draft) : carts;
  const { run, isPending } = useServerAction(setCartOrder, {
    successMessage: "Ordre dels carros desat",
    onSuccess: () => {
      setDraft(null);
      setSelected(null);
    },
  });

  function move(id: string, targetId: string) {
    if (isPending) return;
    if (id === targetId) {
      setSelected(null);
      return;
    }
    const order = draft ?? carts.map((cart) => cart.id);
    setDraft(moveCart(order, id, targetId));
    setAlphabetical(false);
    setSelected(null);
    setAnnouncement(
      `${carts.find((cart) => cart.id === id)?.name} mogut a la posició ${order.indexOf(targetId) + 1}.`,
    );
  }

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
    <div className="flex flex-col gap-4">
      {canReorder && (editing || carts.length > 1 || customOrder) && (
        <div className="flex flex-wrap items-center gap-2">
          {editing ? (
            <>
              <Button disabled={isPending} onClick={() => run({ cartIds: alphabetical ? [] : draft })}>
                {isPending ? "Desant…" : "Desa l'ordre"}
              </Button>
              <Button
                variant="outline"
                disabled={isPending}
                onClick={() => {
                  setDraft(null);
                  setSelected(null);
                }}
              >
                Cancel·la
              </Button>
              <Button
                variant="outline"
                disabled={isPending}
                onClick={() => {
                  setDraft(orderCarts(carts).map(({ id }) => id));
                  setAlphabetical(true);
                  setSelected(null);
                  setAnnouncement("Ordre alfanumèric restaurat. Desa els canvis per aplicar-lo.");
                }}
              >
                <ArrowDownAZIcon /> Ordre alfanumèric
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={() => {
                  setDraft(carts.map(({ id }) => id));
                  setAlphabetical(!customOrder);
                  setAnnouncement("");
                }}
              >
                <GripVerticalIcon /> Ordena amb clics
              </Button>
              <span className="text-xs text-muted-foreground">
                {customOrder ? "Ordre personalitzat" : "Ordre alfanumèric"}
              </span>
            </>
          )}
        </div>
      )}

      {editing && (
        <p id="cart-order-help" className="text-sm text-muted-foreground">
          Clica el carro que vols moure i després el que ocupa la posició de destí. També pots arrossegar-lo.
          L&apos;ordre desat serà el mateix per a tothom.
        </p>
      )}
      {!editing && canReorder && carts.length > 1 && (
        <p className="text-sm text-muted-foreground">
          Arrossega un carro per canviar-ne la posició, o usa «Ordena amb clics» per ordenar fent clics. Un clic n&apos;obre el contingut.
        </p>
      )}
      <p className="sr-only" role="status">
        {selected
          ? `${displayedCarts.find((cart) => cart.id === selected)?.name} seleccionat. Clica la posició de destí.`
          : announcement}
      </p>

      <div
        className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
        aria-label="Llista de carros"
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
        {displayedCarts.map((cart, index) => (
          <div
            key={cart.id}
            data-order-id={cart.id}
            draggable={!isPending && canReorder && carts.length > 1}
            onDragStart={(event) => {
              event.dataTransfer.setData("text/plain", cart.id);
              event.dataTransfer.effectAllowed = "move";
              draggedId.current = cart.id;
              setSelected(null);
            }}
            onDragEnd={() => {
              draggedId.current = null;
              setDropTarget(null);
            }}
            className={cn(
              "relative rounded-lg select-none",
              canReorder && "cursor-grab active:cursor-grabbing",
              dropTarget === cart.id && "ring-2 ring-primary ring-offset-2",
            )}
          >
            {editing ? (
              <button
                type="button"
                disabled={isPending}
                aria-label={`${cart.name}, posició ${index + 1}`}
                aria-pressed={selected === cart.id}
                aria-describedby="cart-order-help"
                onClick={() => {
                  if (selected) move(selected, cart.id);
                  else setSelected(cart.id);
                }}
                className={cn(
                  "relative block h-full w-full text-left rounded-xl transition-all cursor-grab focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-60",
                  selected === cart.id && "ring-2 ring-primary ring-offset-2",
                )}
              >
                <span className="absolute left-3 top-3 z-10 rounded bg-background/80 px-2 py-0.5 text-xs font-semibold backdrop-blur-xs">
                  {index + 1}
                </span>
                <GripVerticalIcon className="absolute right-3 top-3 z-10 size-4 opacity-60" />
                <CartCardBody cart={cart} />
              </button>
            ) : (
              <>
                <Link href={`/chromebooks/${cart.id}`} className="block h-full">
                  <CartCardBody cart={cart} />
                </Link>
                {canReorder && carts.length > 1 && (
                  <GripVerticalIcon
                    aria-hidden="true"
                    className="pointer-events-none absolute right-3 top-3 size-4 opacity-60 z-10"
                  />
                )}
              </>
            )}
          </div>
        ))}
        {displayedCarts.length === 0 && (
          <p className="text-muted-foreground col-span-full">{emptyMessage}</p>
        )}
      </div>
    </div>
  );
}
