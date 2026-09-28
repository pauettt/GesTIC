"use client";

import { useState } from "react";
import { SearchIcon } from "lucide-react";

import { deleteKey } from "@/actions/keys";
import { ArchiveKeyButton } from "@/components/keys/archive-key-button";
import { KeyDialog } from "@/components/keys/key-dialog";
import { ConfirmDeleteButton } from "@/components/shared/confirm-delete-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export type KeyRow = {
  id: string;
  number: string;
  name: string;
  cartId: string | null;
  cartName: string | null;
  copies: number;
  notes: string | null;
  /** Còpies que ara són fora. */
  out: number;
  /** Les que ja s'han deixat alguna vegada no s'esborren (vegeu `deleteKey`). */
  withHistory: boolean;
  /** Data d'arxiu ja formatada; `null` si la clau es fa servir. */
  archivedOn: string | null;
};

function normalize(text: string) {
  return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

/**
 * Les claus del centre, amb un cercador pel número o pel que obren: al clauer
 * n'hi ha moltes. El cercador filtra també les arxivades, per trobar-ne una
 * que torna a fer falta.
 */
export function KeyList({ keys, carts }: { keys: KeyRow[]; carts: { id: string; name: string }[] }) {
  const [query, setQuery] = useState("");

  const needle = normalize(query.trim());
  const visible = needle
    ? keys.filter((key) => normalize(`${key.number} ${key.name} ${key.cartName ?? ""}`).includes(needle))
    : keys;
  const active = visible.filter((key) => !key.archivedOn);
  const archived = visible.filter((key) => key.archivedOn);
  const hasActive = keys.some((key) => !key.archivedOn);
  const hasArchived = keys.some((key) => key.archivedOn);

  return (
    <div className="flex flex-col gap-6">
      {keys.length > 0 && (
        <div className="relative w-full max-w-sm">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Número o aula…"
            aria-label="Cerca una clau"
            className="pl-8"
          />
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border bg-background">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Número</TableHead>
              <TableHead>A què obre</TableHead>
              <TableHead>Carro</TableHead>
              <TableHead>Còpies</TableHead>
              <TableHead>Estat</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {active.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                  {hasActive
                    ? `Cap clau amb «${query.trim()}».`
                    : "Encara no hi ha cap clau donada d'alta."}
                </TableCell>
              </TableRow>
            )}
            {active.map((key) => (
              <TableRow key={key.id}>
                <TableCell className="font-medium">{key.number}</TableCell>
                <TableCell>{key.name}</TableCell>
                <TableCell className="text-muted-foreground">{key.cartName ?? "—"}</TableCell>
                <TableCell className="text-muted-foreground">{key.copies}</TableCell>
                <TableCell>
                  {key.out === 0 ? (
                    <Badge variant="secondary">Al taulell</Badge>
                  ) : (
                    <Badge variant={key.out >= key.copies ? "destructive" : "default"}>
                      {key.out} de {key.copies} fora
                    </Badge>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex items-center justify-end gap-1">
                    <KeyDialog
                      carts={carts}
                      entry={{
                        id: key.id,
                        number: key.number,
                        name: key.name,
                        cartId: key.cartId ?? "",
                        copies: key.copies,
                        notes: key.notes ?? "",
                      }}
                      trigger={
                        <Button variant="ghost" size="sm">
                          Edita
                        </Button>
                      }
                    />
                    {/* Fora, arxivar-la la trauria de «Claus fora» i ningú no la reclamaria. */}
                    {key.out === 0 && <ArchiveKeyButton keyId={key.id} number={key.number} archived={false} />}
                    {!key.withHistory && (
                      <ConfirmDeleteButton
                        action={deleteKey}
                        input={{ id: key.id }}
                        title={`Esborrar la clau ${key.number}?`}
                        description="Encara no s'ha deixat mai. No es pot desfer."
                      />
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {hasArchived && (!needle || archived.length > 0) && (
        <section className="flex flex-col gap-3" aria-labelledby="claus-arxivades">
          <div>
            <h2 id="claus-arxivades" className="text-lg font-semibold">
              Claus arxivades
            </h2>
            <p className="text-sm text-muted-foreground">
              No surten al taulell ni als carros, i no es poden entregar. El seu historial es
              conserva. Si una torna a fer falta, recupera-la.
            </p>
          </div>
          <div className="overflow-x-auto rounded-lg border bg-background">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Número</TableHead>
                  <TableHead>A què obria</TableHead>
                  <TableHead>Carro</TableHead>
                  <TableHead>Arxivada</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {archived.map((key) => (
                  <TableRow key={key.id} className="text-muted-foreground">
                    <TableCell className="font-medium text-foreground">{key.number}</TableCell>
                    <TableCell>{key.name}</TableCell>
                    <TableCell>{key.cartName ?? "—"}</TableCell>
                    <TableCell>{key.archivedOn}</TableCell>
                    <TableCell>
                      <div className="flex justify-end">
                        <ArchiveKeyButton keyId={key.id} number={key.number} archived />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </section>
      )}
    </div>
  );
}
