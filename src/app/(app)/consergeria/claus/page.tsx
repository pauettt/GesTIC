import Link from "next/link";

import { db } from "@/lib/db";
import { requireKeyAccess } from "@/lib/permissions";
import { deleteKey } from "@/actions/keys";
import { KeyDialog } from "@/components/keys/key-dialog";
import { ConfirmDeleteButton } from "@/components/shared/confirm-delete-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const metadata = { title: "Claus del centre" };

export default async function ClausPage() {
  await requireKeyAccess();

  const [keys, carts] = await Promise.all([
    db.key.findMany({
      include: {
        cart: true,
        _count: { select: { loans: { where: { returnedAt: null } } } },
      },
      orderBy: { number: "asc" },
    }),
    db.cart.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

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
              n&apos;hi ha al clauer.
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
                      <ConfirmDeleteButton
                        action={deleteKey}
                        input={{ id: key.id }}
                        title={`Esborrar la clau ${key.number}?`}
                        description="Es perd també l'historial de préstecs d'aquesta clau. No es pot desfer."
                      />
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
