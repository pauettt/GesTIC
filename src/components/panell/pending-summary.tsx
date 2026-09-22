import type { Route } from "next";
import Link from "next/link";
import { ArrowRightIcon, CircleCheckIcon } from "lucide-react";

import type { getPendingCounts } from "@/lib/panell-data";
import { Card, CardContent } from "@/components/ui/card";

type Counts = Awaited<ReturnType<typeof getPendingCounts>>;

/** Cada número, amb com es diu en singular i en plural i on porta: el mateix lloc que al panell. */
const ENTRIES: { key: keyof Counts; one: string; many: string; href: Route; urgent?: boolean }[] = [
  {
    key: "unassigned",
    one: "incidència sense responsable",
    many: "incidències sense responsable",
    href: "/incidencies?vista=sense-responsable" as Route,
  },
  {
    key: "stalled",
    one: "incidència aturada",
    many: "incidències aturades",
    href: "/incidencies?vista=aturades" as Route,
  },
  {
    key: "overdueLoans",
    one: "devolució fora de termini",
    many: "devolucions fora de termini",
    href: "/inventari",
    urgent: true,
  },
  {
    key: "overdueDevices",
    one: "equip de carro sense tornar",
    many: "equips de carro sense tornar",
    href: "/panell",
    urgent: true,
  },
  {
    key: "pendingRecurring",
    one: "reserva fixa per aprovar",
    many: "reserves fixes per aprovar",
    href: "/chromebooks/reserves-fixes",
  },
  { key: "pendingLoans", one: "préstec per aprovar", many: "préstecs per aprovar", href: "/inventari" },
  { key: "openQueries", one: "petició o consulta oberta", many: "peticions i consultes obertes", href: "/consultes" },
  {
    key: "pendingStudent",
    one: "Chromebook d'alumnat per decidir",
    many: "Chromebooks d'alumnat per decidir",
    href: "/alumnat",
  },
  {
    key: "awaitingStudent",
    one: "Chromebook d'alumnat per entregar",
    many: "Chromebooks d'alumnat per entregar",
    href: "/alumnat",
  },
];

/**
 * La feina pendent de la coordinació, en números, a dalt de l'inici: en obrir
 * gesTIC ja es veu si hi ha res urgent, sense perdre les coses pròpies de
 * l'inici (reserves, préstecs, claus). El detall és al panell.
 */
export function PendingSummary({ counts }: { counts: Counts }) {
  const pending = ENTRIES.filter((entry) => counts[entry.key] > 0);

  return (
    <Card size="sm">
      <CardContent className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold">Feina pendent</h2>
          <Link href="/panell" className="flex items-center gap-1 text-sm font-medium hover:underline">
            Obre el panell
            <ArrowRightIcon className="size-4" />
          </Link>
        </div>
        {pending.length === 0 ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <CircleCheckIcon className="size-4 text-green-700" />
            Tot al dia: no hi ha res que esperi la coordinació.
          </p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {pending.map((entry) => {
              const count = counts[entry.key];
              return (
                <li key={entry.key}>
                  <Link
                    href={entry.href}
                    className={
                      entry.urgent
                        ? "flex items-baseline gap-1.5 rounded-md border border-destructive/40 bg-destructive/5 px-2.5 py-1.5 text-sm hover:bg-destructive/10"
                        : "flex items-baseline gap-1.5 rounded-md border px-2.5 py-1.5 text-sm hover:bg-muted"
                    }
                  >
                    <span className="font-semibold">{count}</span>
                    <span className="text-muted-foreground">{count === 1 ? entry.one : entry.many}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
