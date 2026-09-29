import type { Route } from "next";
import Link from "next/link";
import Form from "next/form";
import type { Prisma } from "@prisma/client";

import { db } from "@/lib/db";
import { orderCarts, savedCartOrder } from "@/lib/cart-order";
import { cartPositions, deviceSearchQuery, deviceSearchWhere, STUDENT_POOL_FILTER } from "@/lib/device-inventory";
import { currentHolder, openDeviceReservations, shownStatus } from "@/lib/device-reservations";
import { deviceTypeLabels } from "@/lib/devices";
import { chromebookStatusLabels, chromebookStatusVariants } from "@/lib/labels";
import { placedSpaceSelect, spacePlace } from "@/lib/locations";
import { requireAdmin } from "@/lib/permissions";
import { DeviceLocationFilter } from "@/components/chromebooks/device-location-filter";
import { Badge } from "@/components/ui/badge";
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

export const metadata = { title: "Dispositius" };

const collator = new Intl.Collator("ca", { numeric: true, sensitivity: "base" });

/**
 * Tots els equips del centre i on és cadascun: el carro, la posició que hi
 * ocupa i l'etiqueta. Serveix sobretot per trobar un equip pel número de sèrie
 * (el que surt a la consola de Google o a l'etiqueta del fabricant). Només per
 * a la coordinació, com la fitxa de cada equip.
 */
export default async function DeviceInventoryPage({ searchParams }: PageProps<"/chromebooks/equips">) {
  await requireAdmin();
  const { q, on } = await searchParams;
  const query = deviceSearchQuery(q);
  const now = new Date();

  const [carts, total, studentPool] = await Promise.all([
    db.cart.findMany({
      select: {
        id: true,
        name: true,
        order: true,
        chromebookOrder: true,
        space: { select: placedSpaceSelect },
        chromebooks: { select: { id: true, assetTag: true } },
      },
    }),
    db.chromebook.count(),
    db.chromebook.count({ where: { isStudentLoanable: true } }),
  ]);
  const orderedCarts = orderCarts(carts, savedCartOrder(carts));
  const location =
    typeof on === "string" && (on === STUDENT_POOL_FILTER || carts.some((cart) => cart.id === on)) ? on : null;
  const locationWhere: Prisma.ChromebookWhereInput =
    location === STUDENT_POOL_FILTER ? { isStudentLoanable: true } : location ? { cartId: location } : {};

  const devices = await db.chromebook.findMany({
    where: { AND: [deviceSearchWhere(query), locationWhere] },
    select: {
      id: true,
      assetTag: true,
      serialNumber: true,
      deviceType: true,
      brand: true,
      model: true,
      status: true,
      isStudentLoanable: true,
      cartId: true,
      reservations: openDeviceReservations,
    },
  });

  const cartById = new Map(orderedCarts.map((cart, index) => [cart.id, { ...cart, index }]));
  const positions = cartPositions(carts);
  // Els carros com a la seva llista; després el préstec a l'alumnat, i al final
  // els que no són enlloc, que és on cal anar a mirar.
  const rank = (device: { cartId: string | null; isStudentLoanable: boolean }) =>
    device.cartId
      ? (cartById.get(device.cartId)?.index ?? carts.length)
      : device.isStudentLoanable
        ? carts.length
        : carts.length + 1;
  const rows = devices
    .map((device) => {
      // Qui el té per una reserva d'equip sol; els del préstec a l'alumnat no en tenen.
      const holder = device.isStudentLoanable ? null : currentHolder(device.reservations, now);
      return {
        ...device,
        cart: device.cartId ? (cartById.get(device.cartId) ?? null) : null,
        position: positions.get(device.id) ?? null,
        holder,
        shown: shownStatus(device.status, holder),
        href: (device.isStudentLoanable ? `/alumnat/${device.id}` : `/chromebooks/equips/${device.id}`) as Route,
        model: [device.brand, device.model].filter(Boolean).join(" "),
      };
    })
    .sort(
      (a, b) =>
        rank(a) - rank(b) ||
        (a.position ?? 0) - (b.position ?? 0) ||
        collator.compare(a.assetTag, b.assetTag),
    );

  const filtered = Boolean(query || location);
  const clearSearchHref = (location ? `/chromebooks/equips?on=${location}` : "/chromebooks/equips") as Route;

  /** El carro (i on és el carro), el préstec a l'alumnat o enlloc. */
  function place(row: (typeof rows)[number]) {
    if (row.cart) {
      return (
        <>
          <Link href={`/chromebooks/${row.cart.id}`} className="relative z-10 font-medium hover:underline">
            {row.cart.name}
          </Link>
          <span className="block text-xs text-muted-foreground">
            {row.cart.space ? spacePlace(row.cart.space) : "Sense ubicació fixa"}
          </span>
        </>
      );
    }
    if (row.isStudentLoanable) {
      return (
        <Link href="/alumnat" className="relative z-10 font-medium hover:underline">
          Préstec a l&apos;alumnat
        </Link>
      );
    }
    return <span className="font-medium text-amber-700 dark:text-amber-400">Fora de cap carro</span>;
  }

  /** L'estat com el veu el professorat al carro, i qui el té si és per una reserva. */
  function status(row: (typeof rows)[number]) {
    return (
      <>
        <Badge variant={chromebookStatusVariants[row.shown]}>{chromebookStatusLabels[row.shown]}</Badge>
        {row.holder && <span className="mt-1 block text-xs text-muted-foreground">La té {row.holder.who}</span>}
      </>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/chromebooks" className="text-sm text-muted-foreground hover:underline">
          &larr; Tots els carros
        </Link>
        <h1 className="mt-2 text-2xl font-bold tracking-tight">Dispositius</h1>
        <p className="text-sm text-muted-foreground">
          Tots els Chromebooks, portàtils i iPads del centre: a quin carro són, en quina posició i amb quina
          etiqueta.
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-2">
        <Form action="/chromebooks/equips" className="flex w-full flex-wrap items-end gap-2 sm:w-auto" role="search">
          {location && <input type="hidden" name="on" value={location} />}
          <div className="w-full sm:w-96">
            <label htmlFor="device-search" className="mb-1.5 block text-sm font-medium">
              Cerca un dispositiu
            </label>
            <Input
              key={query}
              id="device-search"
              name="q"
              type="search"
              defaultValue={query}
              maxLength={200}
              placeholder="Número de sèrie, identificador, model o carro…"
              className="h-10"
            />
          </div>
          <Button type="submit" className="h-10">Cerca</Button>
          {query && (
            <ButtonLink href={clearSearchHref} variant="ghost" className="h-10">
              Neteja la cerca
            </ButtonLink>
          )}
        </Form>
        <DeviceLocationFilter
          carts={orderedCarts.map(({ id, name }) => ({ id, name }))}
          studentPool={studentPool > 0}
          value={location}
        />
      </div>

      <p className="text-sm text-muted-foreground" role="status">
        {rows.length === 0
          ? total === 0
            ? "Encara no hi ha cap dispositiu. S'importen des de Carros → Importa."
            : "Cap dispositiu no coincideix amb la cerca."
          : filtered
            ? `${rows.length} de ${total} ${total === 1 ? "dispositiu" : "dispositius"}`
            : `${total} ${total === 1 ? "dispositiu" : "dispositius"}`}
      </p>

      {rows.length > 0 && (
        <>
          <ul className="flex flex-col gap-2 md:hidden" aria-label="Dispositius">
            {rows.map((row) => (
              <li key={row.id} className="relative rounded-lg border bg-background p-3 hover:bg-muted/40">
                <div className="flex items-start justify-between gap-2">
                  {/* Tota la targeta porta a la fitxa; l'enllaç al carro va a part. */}
                  <Link href={row.href} className="font-semibold after:absolute after:inset-0 hover:underline">
                    {row.assetTag}
                  </Link>
                  <div className="text-right">
                    {status(row)}
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  {[deviceTypeLabels[row.deviceType], row.model].filter(Boolean).join(" · ")}
                </p>
                <p className="mt-1 text-xs">
                  {row.serialNumber ? `Núm. de sèrie: ${row.serialNumber}` : "Sense número de sèrie"}
                </p>
                <div className="mt-2 text-sm">
                  {place(row)}
                  {row.position && <span className="text-xs text-muted-foreground">Posició {row.position}</span>}
                </div>
              </li>
            ))}
          </ul>

          <div className="hidden overflow-x-auto rounded-lg border bg-background md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Identificador</TableHead>
                  <TableHead>Núm. de sèrie</TableHead>
                  <TableHead>Tipus i model</TableHead>
                  <TableHead>On és</TableHead>
                  <TableHead className="text-right">Posició</TableHead>
                  <TableHead>Estat</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.id} className="relative cursor-pointer">
                    <TableCell className="font-medium">
                      <Link href={row.href} className="after:absolute after:inset-0 hover:underline">
                        {row.assetTag}
                      </Link>
                    </TableCell>
                    <TableCell>{row.serialNumber ?? "—"}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {[deviceTypeLabels[row.deviceType], row.model].filter(Boolean).join(" · ")}
                    </TableCell>
                    <TableCell>
                      {place(row)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{row.position ?? "—"}</TableCell>
                    <TableCell>
                      {status(row)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      )}
    </div>
  );
}
