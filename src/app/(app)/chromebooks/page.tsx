import Image from "next/image";
import Link from "next/link";
import { LaptopIcon } from "lucide-react";

import { db } from "@/lib/db";
import { deviceSummary } from "@/lib/devices";
import { loadBuildingOptions } from "@/lib/location-data";
import {
  locationLabel,
  resolveLocationFilter,
  resolveSpaceFilter,
  spaceLocationWhere,
} from "@/lib/locations";
import { isAdmin, requireUser } from "@/lib/permissions";
import { CartDialog } from "@/components/chromebooks/cart-dialog";
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
      include: { space: true, chromebooks: true },
      orderBy: { name: "asc" },
    }),
    // Per a la vista prèvia de la importació: què ja hi és i no s'ha de repetir.
    admin
      ? db.chromebook.findMany({ select: { assetTag: true, serialNumber: true } })
      : Promise.resolve([]),
  ]);
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

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {carts.map((cart) => {
          const available = cart.chromebooks.filter((cb) => cb.status === "DISPONIBLE").length;
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
                  <p className="text-sm text-muted-foreground">
                    {cart.space?.name ?? "Sense ubicació fixa"}
                  </p>
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
