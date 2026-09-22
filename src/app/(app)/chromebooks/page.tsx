import type { Route } from "next";
import Image from "next/image";
import Link from "next/link";
import { LaptopIcon } from "lucide-react";

import { db } from "@/lib/db";
import { defaultCartSearch, parseCartSearch, type CartSearch } from "@/lib/cart-finder";
import { formatDateTimeFull, startOfWeek, toDateParam } from "@/lib/date";
import { isFreeDuring, isFreeNow } from "@/lib/device-reservations";
import { deviceSummary } from "@/lib/devices";
import { loadBuildingOptions } from "@/lib/location-data";
import {
  locationLabel,
  placedSpaceSelect,
  resolveLocationFilter,
  resolveSpaceFilter,
  spaceLocationWhere,
  type PlacedSpace,
} from "@/lib/locations";
import { isAdmin, requireUser } from "@/lib/permissions";
import { CartDialog } from "@/components/chromebooks/cart-dialog";
import { CartFinder, QuickReserveButton } from "@/components/chromebooks/cart-finder";
import { CartPlace } from "@/components/chromebooks/cart-place";
import { ChromebookImportDialog } from "@/components/chromebooks/chromebook-import-dialog";
import { LocationFilter } from "@/components/shared/location-filter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = { title: "Carros" };

export default async function ChromebooksPage({ searchParams }: PageProps<"/chromebooks">) {
  const user = await requireUser();
  const admin = isAdmin(user.role);
  const params = await searchParams;
  const [buildings, spaces] = await Promise.all([
    loadBuildingOptions(),
    db.space.findMany({ orderBy: { name: "asc" } }),
  ]);
  const location = resolveLocationFilter(buildings, params);
  const space = resolveSpaceFilter(spaces, location, params.aula);
  const filtered = Boolean(location || space);

  const [carts, existingChromebooks] = await Promise.all([
    db.cart.findMany({
      where: space
        ? { spaceId: space.id }
        : location
          ? { space: spaceLocationWhere(location) }
          : {},
      include: {
        space: { select: placedSpaceSelect },
        chromebooks: {
          include: {
            // Els equips que algú té reservats a part no hi són, ara o a l'hora que es busca.
            reservations: { where: { status: "CONFIRMADA" }, select: { startDate: true, endDate: true } },
          },
        },
      },
      orderBy: { name: "asc" },
    }),
    // Per a la vista prèvia de la importació: què ja hi és i no s'ha de repetir.
    admin
      ? db.chromebook.findMany({ select: { assetTag: true, serialNumber: true } })
      : Promise.resolve([]),
  ]);
  // El cercador treballa sobre els carros que deixa el filtre d'ubicació: qui
  // busca un carro lliure el vol a prop.
  const cartSearch = parseCartSearch(params);
  const now = new Date();
  const busyCartIds =
    cartSearch.status === "ok"
      ? new Set(
          (
            await db.reservation.findMany({
              where: {
                cartId: { in: carts.map((cart) => cart.id) },
                status: "CONFIRMADA",
                startDate: { lt: cartSearch.search.endDate },
                endDate: { gt: cartSearch.search.startDate },
              },
              select: { cartId: true },
            })
          ).map((reservation) => reservation.cartId),
        )
      : new Set<string>();
  const finderDefaults =
    cartSearch.status === "ok"
      ? {
          dateKey: cartSearch.search.dateKey,
          periodId: cartSearch.search.period.id,
          minDevices: cartSearch.search.minDevices,
        }
      : { ...defaultCartSearch(), minDevices: 0 };

  // La importació ha de conèixer tots els carros, també els que el filtre amaga.
  const allCartNames = admin
    ? filtered
      ? (await db.cart.findMany({ select: { name: true } })).map((cart) => cart.name)
      : carts.map((cart) => cart.name)
    : [];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Carros</h1>
          <p className="text-muted-foreground">
            Carros de Chromebooks, portàtils i iPads del centre, i el seu estat.
          </p>
        </div>
        {admin && (
          <div className="flex flex-wrap gap-2">
            <ChromebookImportDialog
              existing={{
                spaces: spaces.map(({ name, number }) => ({ name, number })),
                cartNames: allCartNames,
                assetTags: existingChromebooks.map((chromebook) => chromebook.assetTag),
                serialNumbers: existingChromebooks.flatMap((chromebook) =>
                  chromebook.serialNumber ? [chromebook.serialNumber] : [],
                ),
              }}
            />
            <CartDialog spaces={spaces} />
          </div>
        )}
      </div>

      <LocationFilter buildings={buildings} spaces={spaces} />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Busca un carro lliure</CardTitle>
          <p className="text-sm text-muted-foreground">
            Tria el dia i la sessió, i si cal, quants equips necessites.
          </p>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <CartFinder
            // Una cerca nova (o treure-la) torna a omplir el formulari amb el que diu la URL.
            key={`${finderDefaults.dateKey}-${finderDefaults.periodId}-${finderDefaults.minDevices}`}
            initial={finderDefaults}
            searching={cartSearch.status !== "none"}
          />
          {cartSearch.status === "invalid" && (
            <p className="text-sm text-destructive">{cartSearch.message}</p>
          )}
          {cartSearch.status === "ok" && (
            <CartSearchResults
              search={cartSearch.search}
              carts={carts.map((cart) => ({
                id: cart.id,
                name: cart.name,
                space: cart.space,
                available: cart.chromebooks.filter((cb) =>
                  isFreeDuring(cb, cartSearch.search.startDate, cartSearch.search.endDate, now),
                ).length,
                busy: busyCartIds.has(cart.id),
              }))}
            />
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {carts.map((cart) => {
          const available = cart.chromebooks.filter((cb) => isFreeNow(cb, now)).length;
          // Els donats de baixa segueixen al carro amb el seu historial, però ja
          // no compten com a equips que s'hi puguin fer servir.
          const inService = cart.chromebooks.filter((cb) => cb.status !== "BAIXA").length;
          const summary = deviceSummary(cart.chromebooks.filter((cb) => cb.status !== "BAIXA"));
          return (
            <Link key={cart.id} href={`/chromebooks/${cart.id}`}>
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
                  <CardTitle>{cart.name}</CardTitle>
                  <CartPlace space={cart.space} className="text-sm" />
                </CardHeader>
                <CardContent className="flex flex-col gap-0.5">
                  {summary && <p className="text-sm text-muted-foreground">{summary}</p>}
                  <p className="text-sm">
                    <span className="font-medium">{available}</span> / {inService}{" "}
                    disponibles
                  </p>
                </CardContent>
              </Card>
            </Link>
          );
        })}
        {carts.length === 0 && (
          <p className="text-muted-foreground">
            {space
              ? `No hi ha cap carro a ${space.name}.`
              : location
                ? `No hi ha cap carro a ${locationLabel(location)}.`
                : "Encara no hi ha cap carro."}
          </p>
        )}
      </div>
    </div>
  );
}

function CartSearchResults({
  search,
  carts,
}: {
  search: CartSearch;
  carts: { id: string; name: string; space: PlacedSpace | null; available: number; busy: boolean }[];
}) {
  const free = carts.filter((cart) => !cart.busy);
  const matching = free
    .filter((cart) => cart.available >= search.minDevices)
    // Els que en tenen més, primer: si en sobren, millor que si en falten.
    .sort((a, b) => b.available - a.available);
  const tooSmall = free.length - matching.length;
  const when = `${formatDateTimeFull(search.startDate)}–${search.period.end} · ${search.period.label}`;

  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm font-medium">
        {matching.length === 0
          ? "Cap carro lliure"
          : `${matching.length} ${matching.length === 1 ? "carro lliure" : "carros lliures"}`}{" "}
        <span className="font-normal text-muted-foreground">
          {when}
          {search.minDevices > 0 && ` · amb ${search.minDevices} equips o més`}
        </span>
      </p>
      {matching.length > 0 && (
        <ul className="flex flex-col divide-y rounded-lg border">
          {matching.map((cart) => (
            <li key={cart.id} className="flex flex-wrap items-center justify-between gap-3 px-3 py-2">
              <div className="min-w-0">
                <Link
                  href={`/chromebooks/${cart.id}?week=${toDateParam(startOfWeek(search.startDate))}` as Route}
                  className="font-medium hover:underline"
                >
                  {cart.name}
                </Link>
                <CartPlace space={cart.space} className="text-sm" />
                <p className="text-sm text-muted-foreground">
                  {cart.available} {cart.available === 1 ? "equip disponible" : "equips disponibles"}
                </p>
              </div>
              <QuickReserveButton
                cartId={cart.id}
                cartName={cart.name}
                dateKey={search.dateKey}
                periodId={search.period.id}
                when={when}
              />
            </li>
          ))}
        </ul>
      )}
      {tooSmall > 0 && (
        <p className="text-xs text-muted-foreground">
          {tooSmall === 1
            ? "Hi ha 1 carro més lliure, però amb menys equips dels que calen."
            : `Hi ha ${tooSmall} carros més lliures, però amb menys equips dels que calen.`}
        </p>
      )}
    </div>
  );
}
