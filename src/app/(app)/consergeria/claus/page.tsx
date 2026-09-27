import Link from "next/link";

import { db } from "@/lib/db";
import { orderCarts } from "@/lib/cart-order";
import { formatDate } from "@/lib/date";
import { requireKeyAccess } from "@/lib/permissions";
import { deleteKey } from "@/actions/keys";
import { ArchiveKeyButton } from "@/components/keys/archive-key-button";
import { KeyDialog } from "@/components/keys/key-dialog";
import { ConfirmDeleteButton } from "@/components/shared/confirm-delete-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const metadata = { title: "Claus del centre" };

export default async function ClausPage() {
  await requireKeyAccess();

  const [allKeys, rawCarts, usedKeys] = await Promise.all([
    db.key.findMany({
      include: {
        cart: true,
        _count: { select: { loans: { where: { returnedAt: null } } } },
      },
      orderBy: { number: "asc" },
    }),
    db.cart.findMany({ select: { id: true, name: true, order: true } }),
    // Les que tenen historial no s'esborren (vegeu `deleteKey`): el botó no hi surt.
    db.keyLoan.findMany({ distinct: ["keyId"], select: { keyId: true } }),
  ]);
  const withHistory = new Set(usedKeys.map((loan) => loan.keyId));
  const keys = allKeys.filter((key) => !key.archivedAt);
  const archived = allKeys.filter((key) => key.archivedAt);

  const customOrder = rawCarts.some((c) => c.order !== null);
  const savedOrder = customOrder
    ? [...rawCarts].filter((c) => c.order !== null).sort((a, b) => (a.order ?? 0) - (b.order ?? 0)).map((c) => c.id)
    : [];
  const carts = orderCarts(rawCarts, savedOrder);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/consergeria" className="text-sm text-muted-foreground hover:underline">
          &larr; Consergeria
        </Link>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold">Claus del centre</h1>
            <p className="text-muted-foreground">
              Aules, magatzems i carros de Chromebooks. Cada clau amb el seu número i les còpies que
              n&apos;hi ha al clauer. La que ja no es fa servir s&apos;arxiva: surt del taulell i dels
              carros, però se&apos;n conserva l&apos;historial. Esborrar només es pot una que no
              s&apos;ha deixat mai.
            </p>
          </div>
          <KeyDialog carts={carts} />
        </div>
      </div>

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
            {keys.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                  Encara no hi ha cap clau donada d&apos;alta.
                </TableCell>
              </TableRow>
            )}
            {keys.map((key) => {
              const out = key._count.loans;
              return (
                <TableRow key={key.id}>
                  <TableCell className="font-medium">{key.number}</TableCell>
                  <TableCell>{key.name}</TableCell>
                  <TableCell className="text-muted-foreground">{key.cart?.name ?? "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{key.copies}</TableCell>
                  <TableCell>
                    {out === 0 ? (
                      <Badge variant="secondary">Al taulell</Badge>
                    ) : (
                      <Badge variant={out >= key.copies ? "destructive" : "default"}>
                        {out} de {key.copies} fora
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
                      {out === 0 && <ArchiveKeyButton keyId={key.id} number={key.number} archived={false} />}
                      {!withHistory.has(key.id) && (
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
              );
            })}
          </TableBody>
        </Table>
      </div>

      {archived.length > 0 && (
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
                    <TableCell>{key.cart?.name ?? "—"}</TableCell>
                    <TableCell>{key.archivedAt && formatDate(key.archivedAt)}</TableCell>
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
