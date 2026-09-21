import type { Route } from "next";
import Link from "next/link";
import { CircleCheckIcon, NetworkIcon } from "lucide-react";
import type { Prisma } from "@prisma/client";

import { db } from "@/lib/db";
import { loadBuildingOptions } from "@/lib/location-data";
import { resolveLocationFilter, resolveSpaceFilter, spaceLocationWhere } from "@/lib/locations";
import { compareIPs, normalizeIPv4, subnetOf, summarizeSubnets } from "@/lib/network";
import { requireAdmin } from "@/lib/permissions";
import { InventorySearch } from "@/components/inventory/inventory-search";
import { LocationFilter } from "@/components/shared/location-filter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const metadata = { title: "Xarxa" };

/**
 * El mapa d'IP del centre, sortit de l'inventari: no hi ha cap llista a part que
 * es pugui desquadrar. Cada equip porta la seva IP i el seu nom a la xarxa, i
 * aquí es veuen totes juntes, amb les lliures de cada xarxa /24 a la vista.
 */
export default async function XarxaPage({ searchParams }: PageProps<"/xarxa">) {
  await requireAdmin();
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q.trim() : "";

  const [buildings, spaces] = await Promise.all([
    loadBuildingOptions(),
    db.space.findMany({ orderBy: { name: "asc" } }),
  ]);
  const location = resolveLocationFilter(buildings, params);
  const space = resolveSpaceFilter(spaces, location, params.aula);

  // Una IP sencera es busca exacta: és la pregunta de «la puc fer servir?».
  const exactIp = q ? normalizeIPv4(q) : null;
  const contains = { contains: q, mode: "insensitive" as const };
  const searchWhere: Prisma.InventoryItemWhereInput = exactIp
    ? { ipAddress: exactIp }
    : q
      ? {
          OR: [
            { ipAddress: contains },
            { hostname: contains },
            { brand: contains },
            { model: contains },
            { space: { name: contains } },
          ],
        }
      : {};

  const [items, allIps] = await Promise.all([
    db.inventoryItem.findMany({
      where: {
        ipAddress: { not: null },
        ...(space ? { spaceId: space.id } : location ? { space: spaceLocationWhere(location) } : {}),
        ...searchWhere,
      },
      select: {
        id: true,
        brand: true,
        model: true,
        ipAddress: true,
        hostname: true,
        status: true,
        category: { select: { name: true } },
        space: { select: { name: true, floor: { select: { name: true } } } },
      },
    }),
    // Les lliures es calculen amb totes les IP, no només les del filtre: una IP
    // d'una altra planta a la mateixa xarxa també està agafada.
    db.inventoryItem.findMany({ where: { ipAddress: { not: null } }, select: { ipAddress: true } }),
  ]);

  const rows = items
    .flatMap((item) => (item.ipAddress ? [{ ...item, ipAddress: item.ipAddress }] : []))
    .sort((a, b) => compareIPs(a.ipAddress, b.ipAddress));
  const everyIp = allIps.flatMap((item) => (item.ipAddress ? [item.ipAddress] : []));
  const shownSubnets = new Set(rows.map((row) => subnetOf(row.ipAddress)));
  const filtered = Boolean(q || location || space);
  const subnets = summarizeSubnets(everyIp).filter((summary) => !filtered || shownSubnets.has(summary.subnet));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Xarxa</h1>
        <p className="text-muted-foreground">
          Les IP fixes de l&apos;equipament, tal com són a l&apos;inventari. S&apos;omplen a la
          fitxa de cada equip (<em>Inventari TIC → Edita</em>).
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <InventorySearch placeholder="Cerca per IP, nom a la xarxa, equip o aula…" />
        <LocationFilter buildings={buildings} spaces={spaces} />
      </div>

      {exactIp && rows.length === 0 && (
        <p className="flex items-center gap-2 rounded-lg border border-green-600/30 bg-green-600/10 px-3 py-2 text-sm">
          <CircleCheckIcon className="size-4 shrink-0 text-green-700" />
          {everyIp.includes(exactIp)
            ? `La IP ${exactIp} la té un equip que el filtre d'ubicació amaga.`
            : `La IP ${exactIp} és lliure: cap equip de l'inventari no la fa servir.`}
        </p>
      )}

      <div className="overflow-x-auto rounded-lg border bg-background">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>IP</TableHead>
              <TableHead>Nom a la xarxa</TableHead>
              <TableHead>Equip</TableHead>
              <TableHead>Aula</TableHead>
              <TableHead>Planta</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                  {everyIp.length === 0
                    ? "Encara cap equip no té IP. S'hi posa a la fitxa de cada equip de l'inventari."
                    : "Cap equip coincideix amb aquest filtre."}
                </TableCell>
              </TableRow>
            )}
            {rows.map((row) => (
              <TableRow key={row.id}>
                <TableCell className="font-mono font-medium">{row.ipAddress}</TableCell>
                <TableCell className="font-mono text-muted-foreground">{row.hostname ?? "—"}</TableCell>
                <TableCell>
                  <Link href={`/inventari/${row.id}` as Route} className="hover:underline">
                    {row.brand} {row.model}
                  </Link>
                  <span className="block text-xs text-muted-foreground">
                    {row.category.name}
                    {row.status === "BAIXA" && " · Donat de baixa: la IP es pot alliberar"}
                  </span>
                </TableCell>
                <TableCell className="text-muted-foreground">{row.space?.name ?? "—"}</TableCell>
                <TableCell className="text-muted-foreground">{row.space?.floor?.name ?? "—"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {subnets.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <NetworkIcon className="size-4 text-muted-foreground" />
              IP lliures
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Per a cada xarxa que ja fa servir algun equip, sense la .0 ni la .255. Abans de donar-ne
              una, comprova que no sigui la del router o d&apos;un rang del DHCP.
            </p>
          </CardHeader>
          <CardContent className="flex flex-col divide-y">
            {subnets.map((summary) => (
              <details key={summary.subnet} className="py-2">
                <summary className="flex cursor-pointer flex-wrap items-baseline gap-x-3 gap-y-1">
                  <span className="font-mono font-medium">{summary.subnet}.x</span>
                  <span className="text-sm text-muted-foreground">
                    {summary.used} {summary.used === 1 ? "ocupada" : "ocupades"} · {summary.free}{" "}
                    {summary.free === 1 ? "lliure" : "lliures"}
                  </span>
                  {summary.firstFree && (
                    <span className="text-sm">
                      Primera lliure: <span className="font-mono font-medium">{summary.firstFree}</span>
                    </span>
                  )}
                </summary>
                <p className="mt-2 font-mono text-xs leading-relaxed text-muted-foreground">
                  {summary.freeRanges.join(", ")}
                </p>
              </details>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
