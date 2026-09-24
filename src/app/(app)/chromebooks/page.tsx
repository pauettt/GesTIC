import type { Route } from "next";
import Link from "next/link";
import { LayoutGridIcon, ListIcon, RepeatIcon } from "lucide-react";

import { db } from "@/lib/db";
import { visibleCartsWhere } from "@/lib/cart-access";
import { defaultCartSearch, parseCartSearch, type CartSearch } from "@/lib/cart-finder";
import {
  addDays,
  formatDateTimeFull,
  formatTime,
  madridDateKey,
  startOfWeek,
  toDateParam,
  zonedDateTime,
} from "@/lib/date";
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
import { CartManager, CartName, type CartItem } from "@/components/chromebooks/cart-manager";
import { CartPlace } from "@/components/chromebooks/cart-place";
import { ChromebookImportDialog } from "@/components/chromebooks/chromebook-import-dialog";
import { LocationFilter } from "@/components/shared/location-filter";
import { ButtonLink } from "@/components/ui/button-link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { orderCarts } from "@/lib/cart-order";

export const metadata = { title: "Carros" };

type CartRoom = (PlacedSpace & { roomName: string | null }) | null;

/** El professorat identifica el carro pel nom de l'aula, més que pel seu número. */
function cartLabel(cart: { name: string; space: CartRoom }) {
  const room = cart.space?.roomName?.trim() || cart.space?.name;
  return room ? `${cart.name} · ${room}` : cart.name;
}

function buildViewUrl(
  params: Record<string, string | string[] | undefined>,
  targetView: "targetes" | "llistat",
): Route {
  const sp = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (key !== "vista" && typeof value === "string" && value) {
      sp.set(key, value);
    }
  }
  if (targetView === "llistat") {
    sp.set("vista", "llistat");
  }
  const qs = sp.toString();
  return (qs ? `/chromebooks?${qs}` : "/chromebooks") as Route;
}

export default async function ChromebooksPage({ searchParams }: PageProps<"/chromebooks">) {
  const user = await requireUser();
  const admin = isAdmin(user.role);
  const params = await searchParams;
  const isListView = params.vista === "llistat";
  const now = new Date();
  const todayKey = madridDateKey(now);
  const startOfToday = zonedDateTime(todayKey, "00:00");
  const endOfToday = addDays(startOfToday, 1);

  const [buildings, spaces] = await Promise.all([
    loadBuildingOptions(),
    db.space.findMany({ orderBy: { name: "asc" } }),
  ]);
  const location = resolveLocationFilter(buildings, params);
  const space = resolveSpaceFilter(spaces, location, params.aula);
  const filtered = Boolean(location || space);

  const [carts, existingChromebooks] = await Promise.all([
    db.cart.findMany({
      where: {
        ...visibleCartsWhere(user.role),
        ...(space ? { spaceId: space.id } : location ? { space: spaceLocationWhere(location) } : {}),
      },
      include: {
        space: { select: { ...placedSpaceSelect, roomName: true } },
        keys: { select: { id: true, number: true, name: true } },
        chromebooks: {
          include: {
            // Els equips que algú té reservats a part no hi són, ara o a l'hora que es busca.
            reservations: { where: { status: "CONFIRMADA" }, select: { startDate: true, endDate: true } },
          },
        },
        reservations: {
          where: {
            status: "CONFIRMADA",
            startDate: { lt: endOfToday },
            endDate: { gt: startOfToday },
          },
          include: {
            user: { select: { name: true, email: true } },
          },
          orderBy: { startDate: "asc" },
        },
        recurring: {
          where: { status: "APROVADA" },
          select: { id: true },
        },
      },
      orderBy: { name: "asc" },
    }),
    // Per a la vista prèvia de la importació: què ja hi és i no s'ha de repetir.
    admin
      ? db.chromebook.findMany({ select: { assetTag: true, serialNumber: true } })
      : Promise.resolve([]),
  ]);

  const customOrder = carts.some((cart) => cart.order !== null);
  const savedOrder = customOrder
    ? [...carts]
        .filter((cart) => cart.order !== null)
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
        .map((cart) => cart.id)
    : [];
  const orderedCarts = orderCarts(carts, savedOrder);

  // El cercador treballa sobre els carros que deixa el filtre d'ubicació: qui
  // busca un carro lliure el vol a prop.
  const cartSearch = parseCartSearch(params);
  const busyCartIds =
    cartSearch.status === "ok"
      ? new Set(
          (
            await db.reservation.findMany({
              where: {
                cartId: { in: orderedCarts.map((cart) => cart.id) },
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
      : orderedCarts.map((cart) => cart.name)
    : [];

  const cartItems: CartItem[] = orderedCarts.map((cart) => {
    const inService = cart.chromebooks.filter((cb) => cb.status !== "BAIXA");
    const available = inService.filter((cb) => isFreeNow(cb, now)).length;
    const underRepair = inService.filter(
      (cb) => cb.status === "EN_INCIDENCIA" || cb.status === "NO_DISPONIBLE",
    ).length;

    const keyLabel =
      cart.keys.length > 0
        ? cart.keys
            .map((k) => k.number?.trim() || k.name.trim())
            .filter(Boolean)
            .join(", ")
        : null;

    const currentReservation = cart.reservations.find(
      (r) => r.startDate <= now && r.endDate > now,
    );
    const nextReservation = cart.reservations.find((r) => r.startDate > now);

    const currentBooking = currentReservation
      ? {
          userName: currentReservation.user.name?.trim() || currentReservation.user.email,
          until: formatTime(currentReservation.endDate),
        }
      : null;

    const nextBooking = nextReservation
      ? {
          userName: nextReservation.user.name?.trim() || nextReservation.user.email,
          at: formatTime(nextReservation.startDate),
        }
      : null;

    const modelSet = new Set<string>();
    for (const cb of inService) {
      const parts = [cb.brand, cb.model].filter(Boolean).join(" ");
      if (parts) modelSet.add(parts);
    }
    const models = Array.from(modelSet).slice(0, 2).join(", ");

    return {
      id: cart.id,
      name: cart.name,
      order: cart.order,
      imageUrl: cart.imageUrl,
      isVisibleToTeachers: cart.isVisibleToTeachers,
      space: cart.space,
      summary: deviceSummary(inService),
      models: models || null,
      available,
      inService: inService.length,
      underRepair,
      keyLabel,
      currentBooking,
      nextBooking,
      allDayFree: !currentReservation && !nextReservation,
      recurringCount: cart.recurring.length,
    };
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Carros</h1>
          <p className="text-muted-foreground">
            Carros de Chromebooks, portàtils i iPads del centre, i el seu estat.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <ButtonLink
            variant="outline"
            href={isListView ? buildViewUrl(params, "targetes") : buildViewUrl(params, "llistat")}
          >
            {isListView ? (
              <>
                <LayoutGridIcon className="size-4" />
                Vista de targetes
              </>
            ) : (
              <>
                <ListIcon className="size-4" />
                Vista de llistat
              </>
            )}
          </ButtonLink>
          <ButtonLink variant="outline" href="/chromebooks/reserves-fixes">
            <RepeatIcon className="size-4" />
            Reserves fixes
          </ButtonLink>
          {admin && (
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
          )}
          {admin && <CartDialog spaces={spaces} />}
        </div>
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
              carts={orderedCarts.map((cart) => ({
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

      <CartManager
        key={isListView ? "list" : "cards"}
        carts={cartItems}
        customOrder={customOrder}
        canReorder={admin && !filtered}
        initialView={isListView ? "list" : "cards"}
        emptyMessage={
          space
            ? `No hi ha cap carro a ${space.name}.`
            : location
              ? `No hi ha cap carro a ${locationLabel(location)}.`
              : "Encara no hi ha cap carro."
        }
      />
    </div>
  );
}

function CartSearchResults({
  search,
  carts,
}: {
  search: CartSearch;
  carts: { id: string; name: string; space: CartRoom; available: number; busy: boolean }[];
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
                  <CartName cart={cart} />
                </Link>
                <CartPlace space={cart.space} className="text-sm" />
                <p className="text-sm text-muted-foreground">
                  {cart.available} {cart.available === 1 ? "equip disponible" : "equips disponibles"}
                </p>
              </div>
              <QuickReserveButton
                cartId={cart.id}
                cartName={cartLabel(cart)}
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
