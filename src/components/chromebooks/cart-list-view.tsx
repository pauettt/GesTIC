"use client";

import type { Route } from "next";
import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  CalendarIcon,
  CheckCircle2Icon,
  KeyRoundIcon,
  LaptopIcon,
  SearchIcon,
  XIcon,
} from "lucide-react";

import type { CartItem } from "@/components/chromebooks/cart-manager";
import { CartName } from "@/components/chromebooks/cart-manager";
import { CartPlace } from "@/components/chromebooks/cart-place";
import { Button } from "@/components/ui/button";
import { ButtonLink } from "@/components/ui/button-link";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export function CartListView({
  carts,
  emptyMessage,
}: {
  carts: CartItem[];
  emptyMessage: string;
}) {
  const [filterQuery, setFilterQuery] = useState("");

  const filteredCarts = useMemo(() => {
    const q = filterQuery.trim().toLowerCase();
    if (!q) return carts;
    return carts.filter((cart) => {
      const room = cart.space?.roomName?.toLowerCase() ?? "";
      const spaceName = cart.space?.name?.toLowerCase() ?? "";
      const cartName = cart.name.toLowerCase();
      const keyLabel = cart.keyLabel?.toLowerCase() ?? "";
      const summary = cart.summary?.toLowerCase() ?? "";
      const models = cart.models?.toLowerCase() ?? "";
      const building = cart.space?.building?.name?.toLowerCase() ?? "";
      const floor = cart.space?.floor?.name?.toLowerCase() ?? "";

      return (
        cartName.includes(q) ||
        room.includes(q) ||
        spaceName.includes(q) ||
        keyLabel.includes(q) ||
        summary.includes(q) ||
        models.includes(q) ||
        building.includes(q) ||
        floor.includes(q)
      );
    });
  }, [carts, filterQuery]);

  const freeCount = carts.filter((c) => !c.currentBooking).length;
  const totalAvailable = carts.reduce((acc, c) => acc + c.available, 0);
  const totalInService = carts.reduce((acc, c) => acc + c.inService, 0);

  if (carts.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Barra superior de cerca ràpida i indicadors */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative w-full max-w-sm">
          <SearchIcon className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Filtra per nom, aula, clau..."
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            className="pl-8 pr-8"
            aria-label="Filtra la llista de carros"
          />
          {filterQuery && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setFilterQuery("")}
              className="absolute right-1 top-1/2 size-6 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label="Neteja el filtre"
            >
              <XIcon className="size-3.5" />
            </Button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span className="font-medium text-foreground">
            {filteredCarts.length} {filteredCarts.length === 1 ? "carro" : "carros"}
          </span>
          <span>·</span>
          <span className="text-emerald-700 dark:text-emerald-400 font-medium">
            {freeCount} lliures ara
          </span>
          <span>·</span>
          <span>
            {totalAvailable} / {totalInService} equips disponibles
          </span>
        </div>
      </div>

      {filteredCarts.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center">
          <p className="text-sm text-muted-foreground">
            Cap carro no coincideix amb la cerca «{filterQuery}».
          </p>
          <Button
            variant="link"
            size="sm"
            onClick={() => setFilterQuery("")}
            className="mt-1"
          >
            Neteja el filtre
          </Button>
        </div>
      ) : (
        <>
          {/* Vista en taula per a pantalles mitjanes i grans */}
          <div className="hidden rounded-lg border bg-card shadow-xs md:block">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead className="w-[30%]">Carro i aula</TableHead>
                  <TableHead className="w-[12%]">Clau</TableHead>
                  <TableHead className="w-[20%]">Equips</TableHead>
                  <TableHead className="w-[18%]">Disponibilitat ara</TableHead>
                  <TableHead className="w-[20%]">Previsió d&apos;avui</TableHead>
                  <TableHead className="w-[80px] text-right">Acció</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCarts.map((cart) => (
                  <TableRow key={cart.id} className="hover:bg-muted/30">
                    {/* Carro i aula */}
                    <TableCell className="align-top">
                      <div className="flex items-start gap-3">
                        <div className="relative mt-0.5 flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-md border bg-muted">
                          {cart.imageUrl ? (
                            <Image
                              src={cart.imageUrl}
                              alt={cart.name}
                              fill
                              sizes="40px"
                              className="object-cover"
                            />
                          ) : (
                            <LaptopIcon className="size-5 text-muted-foreground" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <Link
                            href={`/chromebooks/${cart.id}`}
                            className="font-semibold text-foreground hover:underline"
                          >
                            <CartName cart={cart} />
                          </Link>
                          {!cart.isVisibleToTeachers && (
                            <p className="text-[11px] font-medium text-amber-700 dark:text-amber-400">
                              Ocult al professorat · ús intern
                            </p>
                          )}
                          <CartPlace space={cart.space} className="mt-0.5 text-xs" />
                        </div>
                      </div>
                    </TableCell>

                    {/* Clau */}
                    <TableCell className="align-top">
                      {cart.keyLabel ? (
                        <div className="inline-flex items-center gap-1.5 rounded-md border bg-amber-500/10 px-2 py-1 text-xs font-medium text-amber-900 dark:border-amber-500/20 dark:bg-amber-950/40 dark:text-amber-300">
                          <KeyRoundIcon className="size-3.5 shrink-0" />
                          <span className="font-mono">{cart.keyLabel}</span>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>

                    {/* Equips */}
                    <TableCell className="align-top">
                      <div className="flex flex-col gap-0.5 text-xs">
                        <span className="font-semibold text-sm text-foreground">
                          {cart.inService} equips
                        </span>
                        {cart.summary && (
                          <span className="text-muted-foreground">{cart.summary}</span>
                        )}
                        {cart.models && (
                          <span className="text-muted-foreground font-mono text-[11px]">
                            {cart.models}
                          </span>
                        )}
                        {cart.underRepair !== undefined && cart.underRepair > 0 && (
                          <span className="text-[11px] font-medium text-amber-700 dark:text-amber-400">
                            {cart.underRepair}{" "}
                            {cart.underRepair === 1
                              ? "en incidència"
                              : "en incidència"}
                          </span>
                        )}
                      </div>
                    </TableCell>

                    {/* Disponibilitat ara */}
                    <TableCell className="align-top">
                      <div className="flex flex-col gap-1">
                        {cart.currentBooking ? (
                          <>
                            <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-400">
                              <span className="size-1.5 rounded-full bg-amber-500" />
                              Ocupat ara
                            </span>
                            <p className="text-xs text-muted-foreground">
                              Fins a les {cart.currentBooking.until}
                              <br />
                              <span className="font-medium text-foreground">
                                {cart.currentBooking.userName}
                              </span>
                            </p>
                          </>
                        ) : (
                          <>
                            <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-400">
                              <span className="size-1.5 rounded-full bg-emerald-500" />
                              Lliure ara
                            </span>
                            <p className="text-xs text-muted-foreground">
                              <span className="font-medium text-foreground">
                                {cart.available}
                              </span>{" "}
                              de {cart.inService} lliures
                            </p>
                          </>
                        )}
                      </div>
                    </TableCell>

                    {/* Previsió d'avui */}
                    <TableCell className="align-top">
                      <div className="flex flex-col gap-1 text-xs">
                        {cart.allDayFree ? (
                          <span className="inline-flex items-center gap-1 font-medium text-emerald-700 dark:text-emerald-400">
                            <CheckCircle2Icon className="size-3.5 shrink-0" />
                            Lliure la resta del dia
                          </span>
                        ) : cart.nextBooking ? (
                          <div>
                            <span className="font-medium text-foreground">
                              Propera: {cart.nextBooking.at}
                            </span>
                            <span className="text-muted-foreground block truncate">
                              {cart.nextBooking.userName}
                            </span>
                          </div>
                        ) : cart.currentBooking ? (
                          <span className="text-muted-foreground">
                            Lliure a partir de les {cart.currentBooking.until}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                        {cart.recurringCount !== undefined && cart.recurringCount > 0 && (
                          <span className="text-[11px] text-muted-foreground">
                            {cart.recurringCount}{" "}
                            {cart.recurringCount === 1
                              ? "reserva fixa"
                              : "reserves fixes"}
                          </span>
                        )}
                      </div>
                    </TableCell>

                    {/* Botó d'acció per reservar */}
                    <TableCell className="align-middle text-right">
                      <ButtonLink
                        href={`/chromebooks/${cart.id}` as Route}
                        size="sm"
                        variant="default"
                        className="h-8 gap-1 px-3 text-xs"
                      >
                        <CalendarIcon className="size-3.5" />
                        Reserva
                      </ButtonLink>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Vista en llista compacta per a mòbils */}
          <div className="flex flex-col gap-3 md:hidden">
            {filteredCarts.map((cart) => (
              <div
                key={cart.id}
                className="flex flex-col gap-3 rounded-lg border bg-card p-4 shadow-xs"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/chromebooks/${cart.id}`}
                      className="font-semibold text-foreground hover:underline"
                    >
                      <CartName cart={cart} />
                    </Link>
                    {!cart.isVisibleToTeachers && (
                      <p className="text-xs font-medium text-amber-700 dark:text-amber-400">
                        Ocult al professorat · ús intern
                      </p>
                    )}
                    <CartPlace space={cart.space} className="mt-0.5 text-xs" />
                  </div>
                  {cart.currentBooking ? (
                    <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-400">
                      <span className="size-1.5 rounded-full bg-amber-500" />
                      Ocupat
                    </span>
                  ) : (
                    <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-400">
                      <span className="size-1.5 rounded-full bg-emerald-500" />
                      Lliure ara
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs border-t pt-2 text-muted-foreground">
                  <div>
                    <span className="font-medium text-foreground">Equips: </span>
                    {cart.inService} ({cart.available} lliures)
                    {cart.summary && <p className="truncate">{cart.summary}</p>}
                  </div>
                  <div>
                    <span className="font-medium text-foreground">Clau: </span>
                    {cart.keyLabel ? (
                      <span className="inline-flex items-center gap-1 font-mono font-semibold text-amber-800 dark:text-amber-300">
                        <KeyRoundIcon className="size-3" /> {cart.keyLabel}
                      </span>
                    ) : (
                      "—"
                    )}
                  </div>
                </div>

                <div className="text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">Previsió: </span>
                  {cart.allDayFree ? (
                    <span className="text-emerald-700 dark:text-emerald-400 font-medium">
                      Lliure tota la jornada
                    </span>
                  ) : cart.currentBooking ? (
                    <span>
                      Ocupat fins a les {cart.currentBooking.until} (
                      {cart.currentBooking.userName})
                    </span>
                  ) : cart.nextBooking ? (
                    <span>
                      Propera reserva a les {cart.nextBooking.at} (
                      {cart.nextBooking.userName})
                    </span>
                  ) : (
                    "—"
                  )}
                </div>

                <div className="pt-1">
                  <ButtonLink
                    href={`/chromebooks/${cart.id}` as Route}
                    size="sm"
                    variant="default"
                    className="w-full gap-1.5"
                  >
                    <CalendarIcon className="size-3.5" />
                    Veure horari i reservar
                  </ButtonLink>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
